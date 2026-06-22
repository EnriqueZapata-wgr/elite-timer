/**
 * challenge-service — retos.
 *
 * Client-callable: listActiveChallenges, joinChallenge (RPC cobra entry cost atómico),
 * getMyActiveChallenges, checkChallengeCriteria (lectura).
 * ⚠️ SERVER-SIDE: settleChallenge (premio = crédito, RPC service_role) → ejecutar desde
 * cron/edge fn tras validar criterio. Ver COWORK_REPORT.
 */
import { supabase } from '@/src/lib/supabase';
import type { Challenge, ChallengeParticipant } from './economy-types';
import { getLocalToday } from '@/src/utils/date-helpers';

export async function listActiveChallenges(): Promise<Challenge[]> {
  const today = getLocalToday();
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .eq('active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('end_date', { ascending: true });
  return (data ?? []) as Challenge[];
}

export async function joinChallenge(
  userId: string,
  challengeId: string,
): Promise<{ success: boolean; cost?: number; error?: string }> {
  const { data, error } = await supabase.rpc('join_challenge', {
    p_user_id: userId,
    p_challenge_id: challengeId,
  });
  if (error) return { success: false, error: error.message };
  const r = (data ?? {}) as { success?: boolean; cost?: number; error?: string };
  return { success: !!r.success, cost: r.cost, error: r.error };
}

export async function getMyActiveChallenges(userId: string): Promise<ChallengeParticipant[]> {
  const { data } = await supabase
    .from('challenge_participants')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false });
  return (data ?? []) as ChallengeParticipant[];
}

export async function getMyChallengeHistory(userId: string): Promise<ChallengeParticipant[]> {
  const { data } = await supabase
    .from('challenge_participants')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['completed', 'failed', 'cancelled'])
    .order('completed_at', { ascending: false });
  return (data ?? []) as ChallengeParticipant[];
}

/**
 * Evalúa el criterio del reto contra el `progress` guardado del participante.
 * Soporta criterios de conteo (days_required). ⚠️ La ALIMENTACIÓN del progress (cuántos días
 * cumplió) la debe escribir un evaluador server-side por tipo de criterio — NO incluido este
 * sprint. Aquí solo comparamos progreso acumulado vs objetivo. Ver COWORK_REPORT.
 */
export function evaluateCriteria(
  criteria: Record<string, any>,
  progress: Record<string, any> | null | undefined,
): { completed: boolean; current: number; target: number } {
  const target = Number(criteria?.days_required ?? criteria?.target ?? 0);
  const current = Number(progress?.days_completed ?? progress?.current ?? 0);
  return { completed: target > 0 && current >= target, current, target };
}

export async function checkChallengeCriteria(
  userId: string,
  challengeId: string,
): Promise<{ completed: boolean; current: number; target: number }> {
  const [{ data: ch }, { data: part }] = await Promise.all([
    supabase.from('challenges').select('criteria').eq('id', challengeId).maybeSingle(),
    supabase.from('challenge_participants').select('progress').eq('user_id', userId).eq('challenge_id', challengeId).maybeSingle(),
  ]);
  return evaluateCriteria((ch as any)?.criteria ?? {}, (part as any)?.progress);
}

/** SERVER-SIDE. Liquida el reto (premio si ganó). RPC settle es service_role. */
export async function settleChallenge(
  userId: string,
  challengeId: string,
): Promise<{ won: boolean; prize: number; error?: string }> {
  const criteria = await checkChallengeCriteria(userId, challengeId);
  const { data, error } = await supabase.rpc('settle_challenge', {
    p_user_id: userId,
    p_challenge_id: challengeId,
    p_won: criteria.completed,
  });
  if (error) return { won: false, prize: 0, error: error.message };
  const r = (data ?? {}) as { won?: boolean; prize?: number; error?: string };
  return { won: !!r.won, prize: r.prize ?? 0, error: r.error };
}
