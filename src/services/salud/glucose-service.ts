/**
 * glucose-service — I/O de glucosa capilar sobre Supabase.
 *
 * La lógica pura (rangos, validación, hora local) vive en glucose-core.ts y
 * las estadísticas de ventana en metabolic-stats-core.ts. Aquí SOLO hay
 * acceso a datos: nada de decidir si una lectura es normal.
 *
 * Estaba todo inline en app/glucose-log.tsx. Se saca para que la pantalla
 * pinte y no hable con la base, que es la regla del proyecto.
 *
 * Fail-soft en las lecturas (un 400 no es "sin mediciones", ya se aprendió en
 * MB-8 Track B): se registra el warning y se devuelve vacío/null, nunca se
 * revienta la pantalla. La ESCRITURA sí propaga el error: si no se guardó, el
 * usuario tiene que enterarse.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { inicioVentana, type PuntoMetabolico } from './metabolic-stats-core';
import { localTimeHHMMSS } from './glucose-core';

export interface GlucoseLogRow {
  id: string;
  date: string;            // YYYY-MM-DD (local, regla técnica #3)
  time: string | null;     // HH:MM:SS
  value_mg_dl: number;
  context: string | null;
  notes: string | null;
}

/** Lecturas de un día, de la más reciente a la más vieja. */
export async function fetchGlucoseLogsForDate(
  userId: string,
  date: string,
): Promise<GlucoseLogRow[]> {
  const { data, error } = await supabase
    .from('glucose_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('time', { ascending: false });
  if (error) {
    logWarn('[glucose-service] load failed:', error.message);
    return [];
  }
  return (data ?? []) as GlucoseLogRow[];
}

/**
 * Puntos de una ventana terminando en `today`, ya en la forma que consume
 * metabolic-stats-core (date + value). Barato: solo 2 columnas.
 */
export async function fetchGlucoseWindowPoints(
  userId: string,
  today: string,
  dias = 30,
): Promise<PuntoMetabolico[]> {
  const { data, error } = await supabase
    .from('glucose_logs')
    .select('date, value_mg_dl')
    .eq('user_id', userId)
    .gte('date', inicioVentana(today, dias));
  if (error) {
    logWarn('[glucose-service] stats load failed:', error.message);
    return [];
  }
  return ((data ?? []) as { date: string; value_mg_dl: number }[])
    .map((r) => ({ date: r.date, value: r.value_mg_dl }));
}

/**
 * Última cetona en SANGRE del día (la única que sirve para GKI; la de aliento
 * u orina no es comparable). null si no hay: el GKI no se inventa.
 */
export async function fetchBloodKetoneForDate(
  userId: string,
  date: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('ketones_logs')
    .select('value_mmol, time')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('source', 'blood')
    .not('value_mmol', 'is', null)
    .order('time', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as { value_mmol: number } | null)?.value_mmol ?? null;
}

/**
 * Inserta una lectura. `value` ya viene validado por parseGlucoseInput.
 * Propaga el error a propósito (ver cabecera).
 */
export async function insertGlucoseLog(params: {
  userId: string;
  date: string;
  value: number;
  context: string;
  notes: string | null;
  now?: Date;
}): Promise<void> {
  const { error } = await supabase.from('glucose_logs').insert({
    user_id: params.userId,
    date: params.date,
    time: localTimeHHMMSS(params.now ?? new Date()),
    value_mg_dl: params.value,
    context: params.context,
    notes: params.notes,
  });
  if (error) throw error;
}
