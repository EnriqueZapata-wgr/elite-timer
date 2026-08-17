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
import { tierFromProfile, type Tier } from './tier-logic';

/** Membresía según profiles (lo mantiene el webhook RevenueCat). */
export async function fetchProfileTier(userId: string): Promise<Tier> {
  const { data, error } = await supabase
    .from('profiles')
    .select('tier, tier_expires_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return 'free';
  return tierFromProfile(data.tier, data.tier_expires_at);
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
export async function fetchEffectiveTier(userId: string): Promise<Tier> {
  const { data, error } = await supabase.rpc('get_my_effective_tier');
  if (!error && data && typeof data === 'object') {
    const fila = data as Record<string, unknown>;
    const tier = fila.tier;
    if (typeof tier === 'string') {
      const expira = typeof fila.expires_at === 'string' ? fila.expires_at : null;
      return tierFromProfile(tier, expira);
    }
  }
  return fetchProfileTier(userId);
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
  const tier = await fetchEffectiveTier(userId);
  return tier === 'premium';
}
