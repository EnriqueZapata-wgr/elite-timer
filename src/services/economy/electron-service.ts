/**
 * electron-service — Electrones (E-): moneda de rank PERMANENTE.
 *
 * Mutación SOLO vía RPC `award_electrons` (SECURITY DEFINER, 091): atómica + idempotente.
 * Lectura vía SELECT (RLS permite leer lo propio). NO emite eventos RN aquí (lo hace la UI
 * con DeviceEventEmitter 'balance_changed') para mantener el servicio puro/testeable.
 *
 * ⚠️ `awardElectrons` requiere contexto service_role (la RPC de crédito está revocada a
 * `authenticated` por anti-minteo, 091). Awards client-trigger por hábito necesitan path
 * server-validado antes de activar la feature — ver COWORK_REPORT.
 */
import { supabase } from '@/src/lib/supabase';
import type { ElectronBalance, ElectronTransaction } from './economy-types';
import { computeRankFromLifetime } from './rank';

export { computeRankFromLifetime } from './rank';

export async function awardElectrons(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('award_electrons', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_metadata: metadata ?? null,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getElectronBalance(userId: string): Promise<ElectronBalance> {
  const { data } = await supabase
    .from('electron_balance')
    .select('user_id, current_electrons, lifetime_electrons, current_rank')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return data as ElectronBalance;
  // Sin fila aún → balance cero, rank 1 (no rompe la UI).
  return { user_id: userId, current_electrons: 0, lifetime_electrons: 0, current_rank: 1 };
}

export async function getElectronHistory(userId: string, limit = 50): Promise<ElectronTransaction[]> {
  const { data } = await supabase
    .from('electron_transactions')
    .select('id, user_id, amount, reason, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ElectronTransaction[];
}
