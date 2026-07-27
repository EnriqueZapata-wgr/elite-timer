/**
 * Emotion Stats Service — I/O del reporteo profundo (MB-9 · Track C).
 *
 * Dos responsabilidades:
 *  1. Registrar el movimiento de navegación que el usuario tomó (C.1). Es la
 *     materia prima de la efectividad: sin esto, ATP tampoco sabría si moverte
 *     funciona. Best-effort: si falla, no rompe la navegación.
 *  2. Leer ese log para la pantalla de historial.
 *
 * La matemática y la honestidad estadística viven en emotion-stats-core (puro).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { toLocalDateString } from '@/src/utils/date-helpers';
import type { EmotionMove } from '@/src/data/emotion-navigation';
import type { NavEvent } from './emotion-stats-core';

/**
 * Registra un movimiento tomado en la navegación emocional. Fire-and-forget:
 * un fallo se loguea pero NO interrumpe el flujo (la navegación es lo primero).
 * El id lo pone la DB (gen_random_uuid), nunca el cliente.
 */
export async function logNavigationMove(
  emotionId: string,
  move: EmotionMove,
  checkinId?: string | null,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // supabase-js no lanza en 4xx: chequear {error} explícito (gotcha MB-6/G8).
    const { error } = await supabase.from('emotion_navigation_logs').insert({
      user_id: user.id,
      emotion_id: emotionId,
      move,
      checkin_id: checkinId ?? null,
    });
    if (error) logWarn('[emotion-stats] nav move log failed:', error.message);
  } catch (e) {
    logWarn('[emotion-stats] logNavigationMove threw:', e);
  }
}

/** Movimientos de navegación de los últimos `days` días (para la efectividad). */
export async function loadNavigationLogs(days: number = 120): Promise<NavEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from('emotion_navigation_logs')
      .select('emotion_id, move, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      logWarn('[emotion-stats] nav logs fetch failed:', error.message);
      return [];
    }
    return (data ?? []) as NavEvent[];
  } catch (e) {
    logWarn('[emotion-stats] loadNavigationLogs threw:', e);
    return [];
  }
}

/** Helper de fecha local reexportado por conveniencia de la UI. */
export const localDateString = toLocalDateString;
