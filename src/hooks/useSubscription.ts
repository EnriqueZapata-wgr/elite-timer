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
import { cancelarAvisoDia7 } from '@/src/services/aviso-dia7-service';
import {
  fetchEffectiveTier,
  fetchTieneEvaluacionElite,
} from '@/src/services/subscription/subscription-service';
import {
  esElite,
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
  /**
   * 'free' = todavía no paga · 'premium' = miembro activo · 'elite' = además
   * contrató la evaluación con Enrique (ATP 3.0, 5-sep-2026). Elite es suma
   * sobre premium: `esMiembro` es verdadero para ambos.
   */
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
  /** ¿Tiene la membresía activa? Verdadero para premium y elite. */
  esMiembro: boolean;
  /** ¿Tiene el nivel Elite vigente? Solo dice que además tiene Pro; no abre contenido. */
  esElite: boolean;
  /**
   * ATP 3.0: ¿existe una evaluación Elite cargada (`functional_dx` con
   * `elite_v3`)? Se enciende por EXISTENCIA, no por tier: la evaluación se
   * queda para siempre aunque Pro venza (dato del usuario sagrado). Abre
   * Mi evaluación Elite, Genética y el contexto de ARGOS.
   */
  tieneEvaluacionElite: boolean;
  /**
   * true si la lectura de la evaluación falló (red o RLS). Regla 7: entonces
   * `tieneEvaluacionElite` está en false por no saber, no por saber que no hay.
   * Quien pinte un candado Elite puede preferir no cerrarlo con esto en true.
   */
  evaluacionEliteNoSePudoLeer: boolean;
  /**
   * 4EP 5-sep-2026 (regla 1): true si la lectura del nivel en Supabase FALLÓ
   * (sin red, error de PostgREST). supabase-js no rechaza sin red: devuelve
   * error con status 0, y antes eso se leía como `free` y cerraba candados a
   * un miembro cuyo tier vive en Supabase (código, alta manual). Con esto en
   * true, `tier` es el último conocido y los candados deben abrirse (fail-open,
   * misma doctrina que el proxy).
   */
  nivelNoSePudoLeer: boolean;
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
  // ATP 3.0: la evaluación Elite se cachea por usuario dentro del hook; se
  // relee en cada refresh (canje de código, foco) pero nunca se "desaprende"
  // por un fallo de red: si ya se vio true, un error posterior no la apaga.
  const [tieneEvaluacionElite, setTieneEvaluacionElite] = useState(false);
  const [evaluacionEliteNoSePudoLeer, setEvaluacionEliteNoSePudoLeer] = useState(false);
  const [nivelNoSePudoLeer, setNivelNoSePudoLeer] = useState(false);
  // Último nivel que Supabase sí confirmó para ESTE usuario. Si la siguiente
  // lectura falla, se conserva en vez de degradar a free.
  const ultimoTierConocido = useRef<Tier>('free');
  const mounted = useRef(true);
  // 4EP: generación por usuario. Un refresh en vuelo de la cuenta A no puede
  // escribir sobre B ni sobre sesión nula: cada cambio de userId sube el
  // contador y la respuesta vieja se descarta al llegar.
  const generacion = useRef(0);

  const sdkReady = configureRevenueCat();

  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    if (!mounted.current) return;
    setCustomerInfo(info);
    setEntitlements(Object.keys(info.entitlements.active));
  }, []);

  const refresh = useCallback(async () => {
    const gen = generacion.current;
    // Sigue vivo el componente Y sigue siendo el mismo usuario que pidió esto.
    const vigente = () => mounted.current && generacion.current === gen;
    if (!userId) {
      if (vigente()) {
        setProfileTier('free');
        setEntitlements([]);
        setCustomerInfo(null);
        setTieneEvaluacionElite(false);
        setEvaluacionEliteNoSePudoLeer(false);
        setNivelNoSePudoLeer(false);
        ultimoTierConocido.current = 'free';
        setIsLoading(false);
      }
      return;
    }
    const Purchases = getPurchases();
    // MB-13 · PIEZA 2: la vigencia viene resuelta del servidor (árbitro único).
    // ATP 3.0: la evaluación Elite se lee en paralelo. Ninguna de las dos
    // rechaza: las dos absorben el error y el fetch caído y lo dicen con
    // `noSePudoLeer` (regla 7: "no se pudo leer" no es "free").
    const [lectura, evaluacion] = await Promise.all([
      fetchEffectiveTier(userId),
      fetchTieneEvaluacionElite(userId),
    ]);
    if (vigente()) {
      if (lectura.noSePudoLeer) {
        // Regla 1: no se degrada a nadie por no poder leer. Se conserva el
        // último nivel confirmado y se avisa para que los candados abran.
        setProfileTier(ultimoTierConocido.current);
        setNivelNoSePudoLeer(true);
      } else {
        ultimoTierConocido.current = lectura.tier;
        setProfileTier(lectura.tier);
        setNivelNoSePudoLeer(false);
      }
      setEvaluacionEliteNoSePudoLeer(evaluacion.noSePudoLeer);
      if (!evaluacion.noSePudoLeer) setTieneEvaluacionElite(evaluacion.tiene);
    }
    if (Purchases && sdkReady) {
      try {
        const info = await Purchases.getCustomerInfo();
        if (vigente()) applyCustomerInfo(info);
      } catch { /* sin red — Supabase manda */ }
      try {
        const offs = await Purchases.getOfferings();
        if (vigente()) { setOfferings(offs); setOfferingsError(false); setOfferingsErrorDetail(null); }
      } catch (e: unknown) {
        // E-2 (MB-12): antes se descartaba y el paywall quedaba mudo.
        // BLOQ-1: además el catch era ciego. Sin el motivo no hay forma de
        // distinguir "sin red" de "la offering current no existe en la tienda",
        // y son arreglos opuestos. Se manda a Sentry como breadcrumb.
        const detalle = e instanceof Error ? e.message : String(e);
        logWarn('[paywall] getOfferings falló:', detalle);
        if (vigente()) { setOfferingsError(true); setOfferingsErrorDetail(detalle); }
      }
    }
    if (vigente()) setIsLoading(false);
  }, [userId, sdkReady, applyCustomerInfo]);

  // ATP 3.0: al cambiar de cuenta se olvida todo lo de la anterior (evaluación
  // y último nivel conocido) y sube la generación para que cualquier refresh
  // en vuelo de la cuenta vieja se descarte al llegar.
  useEffect(() => {
    generacion.current += 1;
    ultimoTierConocido.current = 'free';
    setTieneEvaluacionElite(false);
    setEvaluacionEliteNoSePudoLeer(false);
    setNivelNoSePudoLeer(false);
  }, [userId]);

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

  // ATP 3.0 (5-sep-2026, ruta 2.8): quien se vuelve miembro antes del día 7 no
  // recibe el aviso de "mira lo que abre Pro". Cancelar por id fijo es
  // idempotente y barato (un no-op si no existe), y solo corre cuando cambia
  // el nivel, no en cada render. Sin guard de módulo a propósito: otra cuenta
  // en el mismo teléfono puede volver a programarlo y debe poder cancelarse.
  useEffect(() => {
    if (esMiembro(tier)) cancelarAvisoDia7();
  }, [tier]);

  return {
    tier,
    entitlements,
    offerings,
    offeringsError,
    offeringsErrorDetail,
    customerInfo,
    isLoading,
    esMiembro: esMiembro(tier),
    esElite: esElite(tier),
    tieneEvaluacionElite,
    evaluacionEliteNoSePudoLeer,
    nivelNoSePudoLeer,
    sdkReady,
    restore,
    purchase,
    refresh,
  };
}
