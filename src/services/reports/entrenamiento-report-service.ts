/**
 * Lectura del dominio entrenamiento (NOCHE-REP): sesiones de fuerza, sets,
 * cardio, marcas y la meta semanal declarada, en una sola ida.
 *
 * LANZA si una consulta falla. Es lo único que le permite al shell distinguir
 * "no entrenaste" de "no pudimos leer". Devolver un objeto vacío al fallar es
 * exactamente el bug de las pantallas colgadas: la persona ve "sin datos" y
 * cree que perdió su historial.
 *
 * La única consulta que NO lanza es la de la meta semanal: no tener meta es un
 * estado legítimo, y que falte no puede tumbar el reporte entero.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import type { ResolvedRange } from './report-domain-core';
import type { SessionRow, SetRow, CardioRow, PrRow } from './entrenamiento-report-core';

/** Sesiones que se listan como máximo. Un año largo de entrenamiento denso. */
export const SESSION_LIST_CAP = 200;
/** Sets que se leen como máximo. Por encima de esto el volumen ya no cambia de forma. */
export const SET_CAP = 5000;

export interface EntrenamientoReportData {
  sessions: SessionRow[];
  sets: SetRow[];
  cardio: CardioRow[];
  prs: PrRow[];
  /** Días por semana que la persona declaró querer entrenar. null si no la fijó. */
  metaSemanal: number | null;
}

/** Nombre del ejercicio venga como venga del join (objeto o arreglo). */
function nombreEjercicio(raw: unknown): string | null {
  if (!raw) return null;
  const fila = Array.isArray(raw) ? raw[0] : raw;
  if (!fila || typeof fila !== 'object') return null;
  const o = fila as Record<string, unknown>;
  const es = typeof o.name_es === 'string' ? o.name_es.trim() : '';
  const en = typeof o.name === 'string' ? o.name.trim() : '';
  return es || en || null;
}

export async function loadEntrenamientoReport(range: ResolvedRange): Promise<EntrenamientoReportData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('sin sesión');

  let sesionesQ = supabase
    .from('workout_sessions')
    .select('id, date, routine_name, duration_seconds, exercises_count, sets_count, volume_kg, prs_count, source')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(SESSION_LIST_CAP);
  if (range.from) sesionesQ = sesionesQ.gte('date', range.from);

  let setsQ = supabase
    .from('exercise_logs')
    .select('date, reps, weight_kg, exercises(name, name_es)')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .limit(SET_CAP);
  if (range.from) setsQ = setsQ.gte('date', range.from);

  let cardioQ = supabase
    .from('cardio_sessions')
    .select('date, discipline, duration_seconds, distance_meters')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (range.from) cardioQ = cardioQ.gte('date', range.from);

  let prsQ = supabase
    .from('personal_records')
    .select('achieved_at, weight_kg, rep_range, estimated_1rm, exercises(name, name_es)')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: true });
  if (range.from) prsQ = prsQ.gte('achieved_at', range.from);

  const [sesiones, sets, cardio, prs] = await Promise.all([sesionesQ, setsQ, cardioQ, prsQ]);
  if (sesiones.error) throw sesiones.error;
  if (sets.error) throw sets.error;
  if (cardio.error) throw cardio.error;
  if (prs.error) throw prs.error;

  return {
    sessions: (sesiones.data ?? []) as SessionRow[],
    sets: (sets.data ?? []).map((r: any): SetRow => ({
      date: r.date ?? null,
      reps: r.reps ?? null,
      weight_kg: r.weight_kg ?? null,
      exercise_name: nombreEjercicio(r.exercises),
    })),
    cardio: (cardio.data ?? []) as CardioRow[],
    prs: (prs.data ?? []).map((r: any): PrRow => ({
      achieved_at: r.achieved_at,
      exercise_name: nombreEjercicio(r.exercises),
      weight_kg: r.weight_kg ?? null,
      rep_range: r.rep_range ?? null,
      estimated_1rm: r.estimated_1rm ?? null,
    })),
    metaSemanal: await leerMetaSemanal(userId),
  };
}

/**
 * La meta semanal. Fail-soft a propósito: si training_preferences no responde,
 * el reporte sigue vivo y la tarjeta de adherencia dice que falta la meta, que
 * es cierto desde donde la persona está parada.
 */
async function leerMetaSemanal(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('training_preferences')
      .select('days_per_week')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    const v = data?.days_per_week;
    return typeof v === 'number' && v > 0 ? v : null;
  } catch (e) {
    logWarn('[reports] meta semanal de entrenamiento no disponible', e);
    return null;
  }
}
