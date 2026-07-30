/**
 * iap-service — recargas de H+ como consumibles IAP (MB-13 · Pieza 6).
 *
 * Doctrina:
 *  - El precio sale del PRODUCTO real de la tienda (priceString), nunca de
 *    pesos pintados en pantalla.
 *  - El teléfono NUNCA acredita: award_protons/credit_hplus_purchase están
 *    revocadas al cliente. La acreditación la hace el webhook de RevenueCat
 *    (idempotente por transaction_id) y este servicio solo OBSERVA el
 *    ledger (proton_transactions, RLS filas propias) para saber cuándo cayó.
 *  - Compra pendiente: entre el cobro y el webhook hay una ventana; se
 *    persiste en AsyncStorage y la UI la muestra, no se queda muda.
 *  - Reclamo (consumible perdido): la edge function reclaim-hplus verifica
 *    contra la API de RevenueCat server-side y acredita lo que falte.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { PurchasesStoreProduct } from 'react-native-purchases';

import { supabase } from '@/src/lib/supabase';
import { configureRevenueCat, getPurchases } from '@/src/services/revenuecat';

const SUPABASE_URL: string =
  (Constants.expoConfig?.extra as any)?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const RECLAIM_FN = `${SUPABASE_URL}/functions/v1/reclaim-hplus`;

const PENDING_KEY = 'hplus_pending_purchases_v1';

export interface PendingHPlusPurchase {
  transactionId: string;
  productId: string;
  sku: string;
  protons: number;
  at: number;
}

// ── Productos reales de la tienda ──────────────────────────────────────────

/**
 * Productos consumibles de la tienda para los SKUs del catálogo. Devuelve
 * mapa productId → producto. Vacío si el binario no trae el SDK.
 */
export async function getHPlusProducts(
  skus: string[],
): Promise<Record<string, PurchasesStoreProduct>> {
  const Purchases = getPurchases();
  if (!Purchases || !configureRevenueCat() || skus.length === 0) return {};
  try {
    const products = await Purchases.getProducts(skus, 'NON_SUBSCRIPTION' as any);
    const map: Record<string, PurchasesStoreProduct> = {};
    for (const p of products) map[p.identifier] = p;
    return map;
  } catch {
    return {};
  }
}

export interface HPlusPurchaseResult {
  success: boolean;
  /** 'cancelled' si el usuario cerró el sheet nativo */
  error?: string;
  pending?: PendingHPlusPurchase;
}

/**
 * Compra un pack como consumible. Al confirmar el cobro, el crédito queda
 * PENDIENTE del webhook: se registra localmente y la UI lo comunica.
 */
export async function purchaseHPlusPack(
  product: PurchasesStoreProduct,
  sku: string,
  protons: number,
): Promise<HPlusPurchaseResult> {
  const Purchases = getPurchases();
  if (!Purchases || !configureRevenueCat()) {
    return { success: false, error: 'Las compras estarán disponibles en la próxima versión de la app.' };
  }
  try {
    const result = await Purchases.purchaseStoreProduct(product);
    const transactionId =
      (result as { transaction?: { transactionIdentifier?: string } }).transaction
        ?.transactionIdentifier ?? `local_${Date.now()}`;
    const pending: PendingHPlusPurchase = {
      transactionId,
      productId: product.identifier,
      sku,
      protons,
      at: Date.now(),
    };
    await addPendingPurchase(pending);
    return { success: true, pending };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean };
    if (err.userCancelled) return { success: false, error: 'cancelled' };
    return { success: false, error: 'No pudimos completar la compra. Intenta de nuevo en unos minutos.' };
  }
}

// ── Pendientes (entre el cobro y el webhook) ───────────────────────────────

export async function getPendingPurchases(): Promise<PendingHPlusPurchase[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const list = raw ? (JSON.parse(raw) as PendingHPlusPurchase[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function setPendingPurchases(list: PendingHPlusPurchase[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch { /* storage lleno o bloqueado: el reclamo server-side sigue disponible */ }
}

/** Tras un reclamo server-side exitoso, el ledger es la verdad completa. */
export async function clearPendingPurchases(): Promise<void> {
  await setPendingPurchases([]);
}

async function addPendingPurchase(p: PendingHPlusPurchase): Promise<void> {
  const list = await getPendingPurchases();
  if (!list.some((x) => x.transactionId === p.transactionId)) list.push(p);
  await setPendingPurchases(list);
}

/**
 * Revisa el ledger propio: si la transacción del webhook ya cayó
 * (idempotency_key = 'iap_' + transactionId), el pendiente se resuelve.
 * Devuelve los que se acreditaron en esta pasada.
 */
export async function resolvePendingPurchases(): Promise<PendingHPlusPurchase[]> {
  const list = await getPendingPurchases();
  if (list.length === 0) return [];
  const keys = list.map((p) => `iap_${p.transactionId}`);
  const { data, error } = await supabase
    .from('proton_transactions')
    .select('idempotency_key')
    .in('idempotency_key', keys);
  if (error || !data) return [];
  const credited = new Set(data.map((r) => r.idempotency_key as string));
  const resolved = list.filter((p) => credited.has(`iap_${p.transactionId}`));
  if (resolved.length > 0) {
    await setPendingPurchases(list.filter((p) => !credited.has(`iap_${p.transactionId}`)));
  }
  return resolved;
}

// ── Reclamo server-side (6.4) ──────────────────────────────────────────────

export interface ReclaimResult {
  success: boolean;
  /** Transacciones que la tienda reporta y se revisaron. */
  checked: number;
  credited: number;
  protons: number;
  error?: string;
}

/**
 * Camino para el consumible perdido entre el cobro y el webhook: el servidor
 * consulta RevenueCat con la API key secreta, y acredita idempotente lo que
 * la tienda diga que se pagó y el ledger no tenga.
 */
export async function reclaimHPlusPurchases(): Promise<ReclaimResult> {
  try {
    const { data } = await supabase.auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) return { success: false, checked: 0, credited: 0, protons: 0, error: 'no_session' };
    const resp = await fetch(RECLAIM_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({}),
    });
    if (!resp.ok) return { success: false, checked: 0, credited: 0, protons: 0, error: `http_${resp.status}` };
    const json = await resp.json().catch(() => null);
    return {
      success: true,
      checked: Number(json?.checked ?? 0),
      credited: Number(json?.credited ?? 0),
      protons: Number(json?.protons ?? 0),
    };
  } catch {
    return { success: false, checked: 0, credited: 0, protons: 0, error: 'network' };
  }
}
