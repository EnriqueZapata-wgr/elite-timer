/**
 * proton-service — Protones (H+): moneda TRANSABLE (acciones IA, retos).
 *
 * spend vía RPC `spend_protons` (atómica, anti-negativo con FOR UPDATE + CHECK). award vía
 * `award_protons` (service_role). getActionCost lee proton_action_costs con fallback al seed.
 */
import { supabase } from '@/src/lib/supabase';
import type { ProtonBalance, ProtonTransaction, ProtonTxType } from './economy-types';
import { FALLBACK_ACTION_COSTS, type ActionKey } from './economy-config';

export async function getProtonBalance(userId: string): Promise<ProtonBalance> {
  const { data } = await supabase
    .from('proton_balance')
    .select('user_id, current_protons, lifetime_earned, lifetime_spent')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return data as ProtonBalance;
  return { user_id: userId, current_protons: 0, lifetime_earned: 0, lifetime_spent: 0 };
}

export async function getProtonHistory(userId: string, limit = 50): Promise<ProtonTransaction[]> {
  const { data } = await supabase
    .from('proton_transactions')
    .select('id, user_id, amount, type, action_key, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ProtonTransaction[];
}

/** Costo H+ de una acción. Lee la tabla; cae al fallback (seed 086) si no responde. */
export async function getActionCost(actionKey: string): Promise<number> {
  const { data, error } = await supabase
    .from('proton_action_costs')
    .select('cost_h_plus, enabled')
    .eq('action_key', actionKey)
    .maybeSingle();
  if (!error && data && (data as any).enabled !== false) return (data as any).cost_h_plus as number;
  return FALLBACK_ACTION_COSTS[actionKey as ActionKey] ?? 0;
}

/** Débito atómico. success=false si balance insuficiente (no muta). */
export async function spendProtons(
  userId: string,
  amount: number,
  actionKey: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const { data, error } = await supabase.rpc('spend_protons', {
    p_user_id: userId,
    p_amount: amount,
    p_action_key: actionKey,
    p_metadata: metadata ?? null,
  });
  if (error) return { success: false, newBalance: 0, error: error.message };
  const r = (data ?? {}) as { success?: boolean; new_balance?: number; error?: string };
  return { success: !!r.success, newBalance: r.new_balance ?? 0, error: r.error };
}

/** Crédito (service_role). Falla desde cliente por anti-minteo (091). */
export async function awardProtons(
  userId: string,
  amount: number,
  type: ProtonTxType,
  actionKey?: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('award_protons', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_action_key: actionKey ?? null,
    p_metadata: metadata ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
