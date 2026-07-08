/**
 * RevenueCat — configuración e identidad del SDK de compras.
 *
 * IMPORTANTE: react-native-purchases es un módulo NATIVO. Los dev clients
 * actuales (y cualquier OTA previo al próximo native build) NO lo incluyen,
 * así que todo acceso pasa por getPurchases(), que resuelve el módulo de
 * forma perezosa y devuelve null si el binario no lo trae. La app nunca
 * debe crashear por ausencia del SDK — simplemente se comporta como free.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type PurchasesType from 'react-native-purchases';

type PurchasesModule = typeof PurchasesType;

let purchasesModule: PurchasesModule | null | undefined;
let configured = false;
/** userId ya identificado en RevenueCat (evita logIn repetidos) */
let identifiedUserId: string | null = null;

/**
 * Resuelve el módulo nativo de forma segura. null = binario sin SDK
 * (Expo Go / dev client viejo / web) → la app opera sin IAP.
 */
export function getPurchases(): PurchasesModule | null {
  if (purchasesModule !== undefined) return purchasesModule;
  if (Platform.OS === 'web') {
    purchasesModule = null;
    return null;
  }
  try {
    // require perezoso: el import estático crashea si el native module no existe
    const mod = require('react-native-purchases');
    purchasesModule = (mod.default ?? mod) as PurchasesModule;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

function getApiKey(): string | null {
  const extra = Constants.expoConfig?.extra;
  const key = Platform.OS === 'ios' ? extra?.revenuecatIosKey : extra?.revenuecatAndroidKey;
  if (typeof key !== 'string' || key.length === 0 || key.startsWith('PENDIENTE')) return null;
  return key;
}

/**
 * Configura el SDK (idempotente). Devuelve true si quedó listo para usarse.
 */
export function configureRevenueCat(): boolean {
  if (configured) return true;
  const Purchases = getPurchases();
  const apiKey = getApiKey();
  if (!Purchases || !apiKey) return false;
  try {
    Purchases.configure({ apiKey });
    configured = true;
  } catch {
    // Native module presente pero falló la config — no bloqueamos la app
    configured = false;
  }
  return configured;
}

export function isRevenueCatReady(): boolean {
  return configured;
}

/**
 * Vincula el usuario de Supabase con RevenueCat (app_user_id = user.id).
 * El webhook de Cowork usa este id para sincronizar profiles.tier.
 */
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || !configureRevenueCat()) return;
  if (identifiedUserId === userId) return;
  try {
    await Purchases.logIn(userId);
    identifiedUserId = userId;
  } catch {
    // sin red o SDK no listo — el listener de customerInfo reintenta después
  }
}

/** Desvincula al usuario (logout de la app). */
export async function logOutRevenueCat(): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || !configured || identifiedUserId === null) return;
  try {
    await Purchases.logOut();
  } catch {
    // anonymous user o SDK sin sesión — ignorable
  } finally {
    identifiedUserId = null;
  }
}
