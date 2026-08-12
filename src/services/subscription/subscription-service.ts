/**
 * Subscription service — IO contra Supabase para tier + Boost H+.
 * La lógica pura vive en tier-logic.ts (testeable en node).
 */
import { supabase } from '@/src/lib/supabase';
import {
  boostStatusFromRow,
  tierFromProfile,
  type BoostStatus,
  type Tier,
} from './tier-logic';

/** Costo/duración del Boost H+ (Task #133). El backend usa estos defaults. */
export const PRO_BOOST_COST_H_PLUS = 500;
export const PRO_BOOST_DURATION_HOURS = 24;
/** #101: Boost Pro Semanal — 7 días de Pro por 3,000 H+ (mismo RPC atómico). */
export const PRO_BOOST_WEEKLY_COST_H_PLUS = 3000;
export const PRO_BOOST_WEEKLY_DURATION_HOURS = 168;

export interface ActivateBoostResult {
  success: boolean;
  hPlusRemaining: number;
  expiresAt: Date | null;
  error?: string;
  message?: string;
}

/** Tier según profiles (lo mantiene el webhook RevenueCat de Cowork). */
export async function fetchProfileTier(userId: string): Promise<Tier> {
  const { data, error } = await supabase
    .from('profiles')
    .select('tier, tier_expires_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return 'free';
  return tierFromProfile(data.tier, data.tier_expires_at);
}

const VALID_TIERS: readonly Tier[] = ['free', 'base', 'pro', 'clinician'];

/**
 * MB-13 · PIEZA 2 — el tier efectivo lo decide el SERVIDOR
 * (get_my_effective_tier: RevenueCat vigente > código/webhook > free).
 * El cliente no calcula vigencias. Si el RPC aún no está desplegado o no
 * hay red, cae al lector directo de profiles como respaldo.
 */
export async function fetchEffectiveTier(userId: string): Promise<Tier> {
  const { data, error } = await supabase.rpc('get_my_effective_tier');
  if (!error && data && typeof data === 'object') {
    const tier = (data as Record<string, unknown>).tier;
    if (typeof tier === 'string' && (VALID_TIERS as string[]).includes(tier)) {
      return tier as Tier;
    }
  }
  return fetchProfileTier(userId);
}

/** Boost activo más reciente del usuario (RLS: solo filas propias). */
export async function fetchActiveBoost(userId: string): Promise<BoostStatus> {
  const { data, error } = await supabase
    .from('pro_boosts')
    .select('expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { active: false, expiresAt: null };
  return boostStatusFromRow(data);
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
 * ECO-8: ¿el usuario recibe insights de ARGOS? Doctrina 5b (12-ago-2026):
 * el insight es SOLO para Pro/Clínico o con boost activo. El proxy tiene el
 * mismo gate server-side; este check evita el roundtrip ("ahorro doble").
 */
export async function canReceiveArgosInsights(userId: string): Promise<boolean> {
  const [tier, boost] = await Promise.all([
    fetchEffectiveTier(userId),
    fetchActiveBoost(userId),
  ]);
  return tier === 'pro' || tier === 'clinician' || boost.active;
}

/**
 * Activa el Boost Pro 24h descontando H+ (RPC atómico, rate limit 3/semana).
 * Errores posibles: rate_limit_exceeded · already_active · insufficient_h_plus
 * · tier_already_pro (ECO-1: el boost no aplica a Pro/Clínico).
 */
export async function activateProBoost(
  userId: string,
  costHPlus: number = PRO_BOOST_COST_H_PLUS,
  durationHours: number = PRO_BOOST_DURATION_HOURS,
): Promise<ActivateBoostResult> {
  const { data, error } = await supabase.rpc('activate_pro_boost', {
    p_user_id: userId,
    p_cost_h_plus: costHPlus,
    p_duration_hours: durationHours,
  });
  if (error) {
    return { success: false, hPlusRemaining: 0, expiresAt: null, error: error.message };
  }
  const result = (data ?? {}) as Record<string, unknown>;
  const success = result.success === true;
  if (success) {
    // ECO-3: sin esto el proxy sigue viendo el tier viejo hasta 30s+ y el
    // usuario reintenta contra un límite que ya pagó por subir.
    const { invalidateProxyTierCache } = await import('../anthropic-client');
    void invalidateProxyTierCache(userId);
  }
  return {
    success,
    hPlusRemaining: Number(result.h_plus_remaining ?? result.current ?? 0),
    expiresAt: typeof result.expires_at === 'string' ? new Date(result.expires_at) : null,
    error: typeof result.error === 'string' ? result.error : undefined,
    message: typeof result.message === 'string' ? result.message : undefined,
  };
}
