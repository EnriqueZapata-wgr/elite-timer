/**
 * challenge-service — retos.
 *
 * PREMIUM (16-ago-2026): LOS RETOS QUEDAN APAGADOS EN SU PARTE ECONÓMICA.
 *
 * El reto era una apuesta: pagabas una entrada en H+ y si cumplías te llevabas
 * un premio en H+. Sin moneda, ni la entrada ni el premio existen, y un reto
 * sin ninguna de las dos cosas no es el mismo producto: hay que rediseñarlo
 * (¿premio en electrones? ¿en rango?) antes de volver a encenderlo.
 *
 * Se apagan joinChallenge y settleChallenge, que eran las que movían saldo.
 * Se conserva todo lo demás (listar, leer criterios, evaluar progreso) porque
 * no cobra nada y es la base sobre la que se rediseñe.
 *
 * Las tablas `challenges` y `challenge_participants` NO se tocan, ni las RPC
 * join_challenge / settle_challenge: siguen en la base con el historial.
 *
 * Client-callable: listActiveChallenges, getMyActiveChallenges,
 * checkChallengeCriteria (lectura). Ver COWORK_REPORT.
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

/**
 * APAGADO. Cobraba la entrada del reto en H+ vía RPC atómica.
 *
 * PREMIUM (16-ago-2026): se deja la firma para no romper a quien la importe,
 * pero devuelve el motivo en vez de llamar a la RPC. Llamarla hoy cobraría una
 * entrada de una moneda que ya no se puede recuperar de ninguna forma.
 */
export async function joinChallenge(
  _userId: string,
  _challengeId: string,
): Promise<{ success: boolean; cost?: number; error?: string }> {
  return { success: false, error: 'retos_en_rediseno' };
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

/**
 * APAGADO. Liquidaba el reto pagando el premio en H+.
 *
 * PREMIUM (16-ago-2026): se sigue evaluando el criterio, porque saber si la
 * persona cumplió es información suya y sirve para liquidar hacia atrás cuando
 * se defina el premio nuevo. Lo que no ocurre es el pago.
 */
export async function settleChallenge(
  userId: string,
  challengeId: string,
): Promise<{ won: boolean; prize: number; error?: string }> {
  const criteria = await checkChallengeCriteria(userId, challengeId);
  return { won: criteria.completed, prize: 0, error: 'retos_en_rediseno' };
}
