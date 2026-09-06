/**
 * Subscription service — IO contra Supabase para la membresía.
 * La lógica pura vive en tier-logic.ts (testeable en node).
 *
 * PREMIUM (16-ago-2026): una sola membresía. Se fue el Boost H+ completo
 * (comprar 24h de "Pro" con protones dejó de tener sentido cuando no hay Pro
 * que comprar ni protones que gastar). La tabla `pro_boosts` y el RPC
 * `activate_pro_boost` siguen EN PIE en la base: son historial de gente que
 * pagó y no se tocan. Simplemente ya nadie los llama.
 */
import { supabase } from '@/src/lib/supabase';
import { esMiembro, tierFromProfile, type Tier } from './tier-logic';
import { diasEntre } from './limites-free-core';

/**
 * Lectura de nivel con su honestidad (regla 7, 4EP 5-sep-2026): `noSePudoLeer`
 * es true cuando la lectura FALLÓ (error de PostgREST, status 0 sin red, fetch
 * rechazado), no cuando el servidor contestó free de verdad. supabase-js 2.99
 * NO rechaza sin red: devuelve `{ data: null, error }` con status 0, así que
 * un `'free'` pelón cerraría candados a un miembro cuyo tier vive en Supabase.
 */
export interface LecturaTier {
  tier: Tier;
  noSePudoLeer: boolean;
}

/** Membresía según profiles (lo mantiene el webhook RevenueCat), con honestidad. */
export async function fetchProfileTier(userId: string): Promise<LecturaTier> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('tier, tier_expires_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) return { tier: 'free', noSePudoLeer: true };
    // Sin fila no es fallo: es una cuenta sin perfil todavía.
    if (!data) return { tier: 'free', noSePudoLeer: false };
    return { tier: tierFromProfile(data.tier, data.tier_expires_at), noSePudoLeer: false };
  } catch {
    return { tier: 'free', noSePudoLeer: true };
  }
}

/**
 * MB-13 · PIEZA 2 — la vigencia la decide el SERVIDOR
 * (get_my_effective_tier: RevenueCat vigente > código/webhook > free).
 * El cliente no calcula vigencias. Si el RPC aún no está desplegado o no
 * hay red, cae al lector directo de profiles como respaldo.
 *
 * PREMIUM: el RPC todavía devuelve las etiquetas viejas ('base'/'pro'/
 * 'clinician') mientras no se despliegue la migración 290. `tierFromProfile`
 * las traduce todas a `premium`, así que el cliente ya no distingue niveles
 * y nadie que pagó se queda fuera por el nombre de su etiqueta vieja.
 */
export async function fetchEffectiveTier(userId: string): Promise<LecturaTier> {
  try {
    const { data, error } = await supabase.rpc('get_my_effective_tier');
    if (!error && data && typeof data === 'object') {
      const fila = data as Record<string, unknown>;
      const tier = fila.tier;
      if (typeof tier === 'string') {
        const expira = typeof fila.expires_at === 'string' ? fila.expires_at : null;
        return { tier: tierFromProfile(tier, expira), noSePudoLeer: false };
      }
    }
  } catch {
    /* fetch rechazado: el respaldo decide y, si también falla, lo dice. */
  }
  // RPC ausente, con error o con forma rara: manda el lector de profiles, que
  // es quien sabe si de verdad se pudo leer.
  return fetchProfileTier(userId);
}

/**
 * ATP 3.0 (5-sep-2026, pivote 2.3.6): ¿existe una evaluación Elite cargada?
 * El discriminador es la presencia de `elite_v3` en `functional_dx.sources_snapshot`
 * (cualquier versión: la tabla es append-only y la evaluación se conserva para
 * siempre, aunque el tier venza). Se lee por existencia, no por tier vigente.
 *
 * Regla 7 de la casa: "no se pudo leer" NO es "no hay". Por eso el resultado
 * trae `noSePudoLeer` aparte: con error de red o de RLS, `tiene` queda en false
 * pero el llamador sabe que no debe cachearlo como verdad definitiva.
 */
export interface EvaluacionEliteLectura {
  tiene: boolean;
  noSePudoLeer: boolean;
}

export async function fetchTieneEvaluacionElite(userId: string): Promise<EvaluacionEliteLectura> {
  try {
    const { data, error } = await supabase
      .from('functional_dx')
      .select('id')
      .eq('user_id', userId)
      // PostgREST acepta rutas JSON en el operando: sources_snapshot->elite_v3=not.is.null
      .not('sources_snapshot->elite_v3', 'is', null)
      .limit(1);
    if (error) return { tiene: false, noSePudoLeer: true };
    return { tiene: Array.isArray(data) && data.length > 0, noSePudoLeer: false };
  } catch {
    // supabase-js sí rechaza cuando el fetch falla (modo avión).
    return { tiene: false, noSePudoLeer: true };
  }
}

/**
 * ATP 3.0 (5-sep-2026, ruta 2.9): de dónde viene la membresía, leído de
 * `tier_grants` (RLS `own_tier_grants_select`, verificada en producción el
 * 5-sep-2026: el dueño lee sus propias filas). Sirve para el mapa funcional,
 * que solo abre en Pro anual y Founders: `metadata->>'product_id'` lo escribe
 * el webhook de pago (ruta 1.7) y `metadata->>'code_source'` lo escribe
 * `redeem_activation_code` ('founder', 'web_payment', 'cortesia'...).
 *
 * Se toma el grant vigente más reciente (sin revocar, sin vencer). Regla 7:
 * `noSePudoLeer` distingue "falló la lectura" de "no hay grant".
 */
export interface OrigenMembresiaLectura {
  productId: string | null;
  codeSource: string | null;
  /** `metadata->>'plan'` del grant ('anual' | 'mensual'); lo escribe el webhook. */
  plan: 'anual' | 'mensual' | null;
  /** Días que cubre el grant (expires_at menos starts_at); null si no vence o falta. */
  diasGrant: number | null;
  noSePudoLeer: boolean;
}

export async function fetchOrigenMembresia(userId: string): Promise<OrigenMembresiaLectura> {
  try {
    const ahora = new Date().toISOString();
    const { data, error } = await supabase
      .from('tier_grants')
      .select('metadata, starts_at, expires_at')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .or(`expires_at.is.null,expires_at.gt.${ahora}`)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) return { productId: null, codeSource: null, plan: null, diasGrant: null, noSePudoLeer: true };
    const fila = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const meta = (fila?.metadata ?? {}) as Record<string, unknown>;
    const plan = meta.plan === 'anual' || meta.plan === 'mensual' ? meta.plan : null;
    return {
      productId: typeof meta.product_id === 'string' ? meta.product_id : null,
      codeSource: typeof meta.code_source === 'string' ? meta.code_source : null,
      plan,
      diasGrant: diasEntre(fila?.starts_at ?? null, fila?.expires_at ?? null),
      noSePudoLeer: false,
    };
  } catch {
    return { productId: null, codeSource: null, plan: null, diasGrant: null, noSePudoLeer: true };
  }
}

export interface SubscriptionEvent {
  id: string;
  event_type: string;
  product_id: string;
  tier: string | null;
  price_usd: number | null;
  currency: string | null;
  processed_at: string;
}

/** Historial de pagos/eventos (audit trail del webhook; RLS: filas propias). */
export async function fetchSubscriptionEvents(
  userId: string,
  limit = 20,
): Promise<SubscriptionEvent[]> {
  const { data, error } = await supabase
    .from('subscription_events')
    .select('id, event_type, product_id, tier, price_usd, currency, processed_at')
    .eq('user_id', userId)
    .order('processed_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as SubscriptionEvent[];
}

/** MB-13 · PIEZA 1 — resultado tipado del RPC redeem_activation_code. */
export type RedeemCodeStatus =
  | 'ok'
  | 'not_found'
  | 'expired'
  | 'exhausted'
  | 'already_redeemed'
  | 'not_authenticated'
  | 'network_error';

export interface RedeemCodeResult {
  status: RedeemCodeStatus;
  tier: Tier | null;
  expiresAt: string | null;
}

/**
 * Canjea un código de activación (founders, web, cortesías). El servidor
 * normaliza el código y decide el tier; el cliente solo muestra el resultado.
 * Gotcha del repo: supabase-js no lanza en 4xx — se chequea {error}.
 */
export async function redeemActivationCode(code: string): Promise<RedeemCodeResult> {
  const { data, error } = await supabase.rpc('redeem_activation_code', { p_code: code });
  if (error) return { status: 'network_error', tier: null, expiresAt: null };
  const result = (data ?? {}) as Record<string, unknown>;
  const status = typeof result.status === 'string'
    ? (result.status as RedeemCodeStatus)
    : 'network_error';
  return {
    status,
    tier: typeof result.tier === 'string' ? (result.tier as Tier) : null,
    expiresAt: typeof result.expires_at === 'string' ? result.expires_at : null,
  };
}

/**
 * ¿Esta persona recibe insights de ARGOS?
 *
 * PREMIUM: sí, siempre que sea miembro. El gate ECO-8 reservaba el insight a
 * Pro/Clínico, y era exactamente el tipo de reparto que este cambio elimina:
 * la IA es el activo más valioso de ATP y racionarla hace que se use menos.
 * Se conserva la función (y no se vuelve un `true` pelón en los llamadores)
 * porque sigue siendo el punto donde, más adelante, entrarán los límites
 * SUAVES: bajar el nivel de modelo, nunca cortar el acceso.
 */
export async function canReceiveArgosInsights(userId: string): Promise<boolean> {
  const { tier } = await fetchEffectiveTier(userId);
  return esMiembro(tier);
}
