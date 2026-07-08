/**
 * useSubscription — tier de suscripción + Boost H+ (Task #133).
 *
 * Fuentes combinadas (se toma el tier MÁS ALTO, cubre lag del webhook):
 *  1. profiles.tier en Supabase — lo escribe el webhook RevenueCat (Cowork)
 *  2. Entitlements activos del SDK RevenueCat — tiempo real en el device
 *  3. pro_boosts — boost 24h comprado con H+ eleva effectiveTier a 'pro'
 *
 * `effectiveTier` es lo que se consume en TODA la app para gating.
 * Si el binario no trae el SDK nativo (sin build este sprint), el hook
 * opera solo con Supabase — nunca crashea.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';

import { useAuth } from '@/src/contexts/auth-context';
import { configureRevenueCat, getPurchases } from '@/src/services/revenuecat';
import {
  activateProBoost,
  fetchActiveBoost,
  fetchProfileTier,
  type ActivateBoostResult,
} from '@/src/services/subscription/subscription-service';
import {
  highestTier,
  isTierAtLeast,
  resolveEffectiveTier,
  tierFromEntitlements,
  type BoostStatus,
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
  tier: Tier;
  boost: BoostStatus;
  /** boost.active ? 'pro' : tier — usar ESTE para gating de features */
  effectiveTier: Tier;
  entitlements: string[];
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  /** Semántica "al menos": clinician también es isPro; base/pro/clinician son isBase */
  isPro: boolean;
  isBase: boolean;
  isClinician: boolean;
  /** false = binario sin SDK nativo (Expo Go / dev client pre-build) */
  sdkReady: boolean;
  restore: () => Promise<PurchaseResult>;
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  activateBoost: () => Promise<ActivateBoostResult>;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [profileTier, setProfileTier] = useState<Tier>('free');
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [boost, setBoost] = useState<BoostStatus>({ active: false, expiresAt: null });
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
        setBoost({ active: false, expiresAt: null });
        setIsLoading(false);
      }
      return;
    }
    const Purchases = getPurchases();
    const [dbTier, activeBoost] = await Promise.all([
      fetchProfileTier(userId),
      fetchActiveBoost(userId),
    ]);
    if (mounted.current) {
      setProfileTier(dbTier);
      setBoost(activeBoost);
    }
    if (Purchases && sdkReady) {
      try {
        const info = await Purchases.getCustomerInfo();
        applyCustomerInfo(info);
      } catch { /* sin red — Supabase manda */ }
      try {
        const offs = await Purchases.getOfferings();
        if (mounted.current) setOfferings(offs);
      } catch { /* offerings sin configurar en stores todavía */ }
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

  // Auto-flip del boost al expirar (timer local; max setTimeout ~24.8 días OK para 24h)
  useEffect(() => {
    if (!boost.active || !boost.expiresAt) return;
    const ms = boost.expiresAt.getTime() - Date.now();
    if (ms <= 0) {
      setBoost({ active: false, expiresAt: null });
      return;
    }
    const t = setTimeout(() => {
      if (mounted.current) {
        setBoost({ active: false, expiresAt: null });
        DeviceEventEmitter.emit(SUBSCRIPTION_CHANGED_EVENT);
      }
    }, ms);
    return () => clearTimeout(t);
  }, [boost.active, boost.expiresAt]);

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

  const activateBoost = useCallback(async (): Promise<ActivateBoostResult> => {
    if (!userId) {
      return { success: false, hPlusRemaining: 0, expiresAt: null, error: 'no_session' };
    }
    const result = await activateProBoost(userId);
    if (result.success) {
      if (mounted.current && result.expiresAt) {
        setBoost({ active: true, expiresAt: result.expiresAt });
      }
      // H+ gastados → refresca pill de economía; boost → refresca suscripción
      DeviceEventEmitter.emit('balance_changed');
      DeviceEventEmitter.emit(SUBSCRIPTION_CHANGED_EVENT);
    }
    return result;
  }, [userId]);

  const tier = highestTier(profileTier, tierFromEntitlements(entitlements));
  const effectiveTier = resolveEffectiveTier(tier, boost.active);

  return {
    tier,
    boost,
    effectiveTier,
    entitlements,
    offerings,
    customerInfo,
    isLoading,
    isPro: isTierAtLeast(effectiveTier, 'pro'),
    isBase: isTierAtLeast(effectiveTier, 'base'),
    isClinician: effectiveTier === 'clinician',
    sdkReady,
    restore,
    purchase,
    activateBoost,
    refresh,
  };
}
