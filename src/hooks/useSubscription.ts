/**
 * useSubscription — estado de la membresía única de ATP.
 *
 * PREMIUM (16-ago-2026): se acabaron los planes. Este hook ya no reparte
 * niveles, solo responde una pregunta: ¿es miembro o no? Y con eso basta,
 * porque ninguna función se desbloquea por plan.
 *
 * Fuentes combinadas (se toma la MÁS generosa, cubre lag del webhook):
 *  1. Membresía resuelta por el SERVIDOR (get_my_effective_tier, MB-13:
 *     RevenueCat vigente > código/webhook > free). El cliente no calcula.
 *  2. Entitlements activos del SDK RevenueCat — tiempo real en el device.
 *
 * Se fue el Boost H+ (comprar 24h de "Pro" con protones): ya no hay Pro que
 * comprar. La tabla `pro_boosts` queda intacta en la base, solo deja de
 * consultarse.
 *
 * Si el binario no trae el SDK nativo, el hook opera solo con Supabase —
 * nunca crashea.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';

import { useAuth } from '@/src/contexts/auth-context';
import { warn as logWarn } from '@/src/lib/logger';
import { configureRevenueCat, getPurchases } from '@/src/services/revenuecat';
import { fetchEffectiveTier } from '@/src/services/subscription/subscription-service';
import {
  esMiembro,
  highestTier,
  tierFromEntitlements,
  type Tier,
} from '@/src/services/subscription/tier-logic';

/** Emitido cuando cambia tier o boost — otras pantallas pueden refrescar. */
export const SUBSCRIPTION_CHANGED_EVENT = 'subscription_changed';

export interface PurchaseResult {
  success: boolean;
  /** 'cancelled' si el usuario cerró el sheet de compra */
  error?: string;
}

export interface UseSubscriptionResult {
  /** 'premium' = miembro activo · 'free' = todavía no paga. No hay más estados. */
  tier: Tier;
  entitlements: string[];
  offerings: PurchasesOfferings | null;
  /** E-2 (MB-12): true si getOfferings FALLÓ — distinto de "no disponible". */
  offeringsError: boolean;
  /**
   * BLOQ-1: el motivo textual del fallo de getOfferings. El catch era ciego y
   * la pantalla que cobra quedaba muda sin dejar rastro de por qué: "productos
   * no aprobados en la tienda", "ninguna offering marcada como current" y "sin
   * red" se veían exactamente igual. Se guarda para poder diagnosticarlo en
   * device sin adivinar; NO se pinta al usuario.
   */
  offeringsErrorDetail: string | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  /** Único gate que queda en toda la app: ¿tiene la membresía activa? */
  esMiembro: boolean;
  /** false = binario sin SDK nativo (Expo Go / dev client pre-build) */
  sdkReady: boolean;
  restore: () => Promise<PurchaseResult>;
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [profileTier, setProfileTier] = useState<Tier>('free');
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  // E-2 (MB-12): el error de offerings se distingue de "aún no hay" — el
  // paywall necesita ofrecer reintento, no un botón muerto.
  const [offeringsError, setOfferingsError] = useState(false);
  const [offeringsErrorDetail, setOfferingsErrorDetail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  const sdkReady = configureRevenueCat();

  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    if (!mounted.current) return;
    setCustomerInfo(info);
    setEntitlements(Object.keys(info.entitlements.active));
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      if (mounted.current) {
        setProfileTier('free');
        setEntitlements([]);
        setCustomerInfo(null);
        setIsLoading(false);
      }
      return;
    }
    const Purchases = getPurchases();
    // MB-13 · PIEZA 2: la vigencia viene resuelta del servidor (árbitro único).
    const dbTier = await fetchEffectiveTier(userId);
    if (mounted.current) setProfileTier(dbTier);
    if (Purchases && sdkReady) {
      try {
        const info = await Purchases.getCustomerInfo();
        applyCustomerInfo(info);
      } catch { /* sin red — Supabase manda */ }
      try {
        const offs = await Purchases.getOfferings();
        if (mounted.current) { setOfferings(offs); setOfferingsError(false); setOfferingsErrorDetail(null); }
      } catch (e: unknown) {
        // E-2 (MB-12): antes se descartaba y el paywall quedaba mudo.
        // BLOQ-1: además el catch era ciego. Sin el motivo no hay forma de
        // distinguir "sin red" de "la offering current no existe en la tienda",
        // y son arreglos opuestos. Se manda a Sentry como breadcrumb.
        const detalle = e instanceof Error ? e.message : String(e);
        logWarn('[paywall] getOfferings falló:', detalle);
        if (mounted.current) { setOfferingsError(true); setOfferingsErrorDetail(detalle); }
      }
    }
    if (mounted.current) setIsLoading(false);
  }, [userId, sdkReady, applyCustomerInfo]);

  // Carga inicial + refetch al cambiar usuario
  useEffect(() => {
    mounted.current = true;
    setIsLoading(true);
    refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  // Listener de entitlements en tiempo real (compras, renovaciones, expiración)
  useEffect(() => {
    const Purchases = getPurchases();
    if (!Purchases || !sdkReady) return;
    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(applyCustomerInfo);
    };
  }, [sdkReady, applyCustomerInfo]);

  // Refresh cuando otra pantalla cambia suscripción/boost
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SUBSCRIPTION_CHANGED_EVENT, refresh);
    return () => sub.remove();
  }, [refresh]);

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
    const Purchases = getPurchases();
    if (!Purchases || !sdkReady) {
      return { success: false, error: 'Las compras estarán disponibles en la próxima versión de la app.' };
    }
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      applyCustomerInfo(info);
      DeviceEventEmitter.emit(SUBSCRIPTION_CHANGED_EVENT);
      return { success: true };
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (err.userCancelled) return { success: false, error: 'cancelled' };
      return { success: false, error: 'No pudimos completar la compra. Intenta de nuevo en unos minutos.' };
    }
  }, [sdkReady, applyCustomerInfo]);

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    const Purchases = getPurchases();
    if (!Purchases || !sdkReady) {
      return { success: false, error: 'Restaurar compras estará disponible en la próxima versión de la app.' };
    }
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
      DeviceEventEmitter.emit(SUBSCRIPTION_CHANGED_EVENT);
      return { success: true };
    } catch {
      return { success: false, error: 'No encontramos compras para restaurar con esta cuenta.' };
    }
  }, [sdkReady, applyCustomerInfo]);

  const tier = highestTier(profileTier, tierFromEntitlements(entitlements));

  return {
    tier,
    entitlements,
    offerings,
    offeringsError,
    offeringsErrorDetail,
    customerInfo,
    isLoading,
    esMiembro: esMiembro(tier),
    sdkReady,
    restore,
    purchase,
    refresh,
  };
}
