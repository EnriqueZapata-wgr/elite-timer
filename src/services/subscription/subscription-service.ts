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

/**
 * Activa el Boost Pro 24h descontando H+ (RPC atómico, rate limit 3/semana).
 * Errores posibles: rate_limit_exceeded · already_active · insufficient_h_plus.
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
  return {
    success: result.success === true,
    hPlusRemaining: Number(result.h_plus_remaining ?? result.current ?? 0),
    expiresAt: typeof result.expires_at === 'string' ? new Date(result.expires_at) : null,
    error: typeof result.error === 'string' ? result.error : undefined,
    message: typeof result.message === 'string' ? result.message : undefined,
  };
}
