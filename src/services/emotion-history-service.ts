/**
 * Emotion History Service — I/O del historial y las correlaciones cruzadas
 * (MB-4 · Bloque 3). Junta lo que ninguna app de mood tiene: check-ins +
 * sueño + entrenamiento + ayuno + sol + fase del ciclo, todo del propio
 * usuario. La matemática y la honestidad estadística viven en
 * emotion-history-core (puro); aquí solo se leen las fuentes.
 *
 * Cada fuente es best-effort: si una query falla, esa correlación sale como
 * "sin datos" en vez de tirar la pantalla completa.
 */
import { supabase } from '@/src/lib/supabase';
import { getCycleBasics, getPhase } from '@/src/services/cycle-service';
import { parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { warn as logWarn } from '@/src/lib/logger';
import type { QuadrantKey } from '@/src/data/emotions-library';
import { type CorrelationDef } from './emotion-history-core';

/** Check-in completo para historial (incluye ejes y contexto). */
export interface HistoryCheckinRecord {
  id: string;
  quadrant: QuadrantKey;
  emotions: string[];
  pleasantness: number | null;
  energy_level: number | null;
  context_where: string | null;
  context_who: string | null;
  context_doing: string | null;
  note: string | null;
  /** MB-17 (mig 245): zona del cuerpo elegida en BodyCheck. null = paso
   *  saltado, o remoto sin la columna todavía (fallback de fetchCheckins). */
  body_zone?: string | null;
  created_at: string;
}

export interface HistoryData {
  checkins: HistoryCheckinRecord[];
  /** Definiciones listas para computeCorrelation (fechas ya resueltas). */
  correlationDefs: CorrelationDef[];
  /** Fase del ciclo por fecha local — null si el ciclo no aplica o no hay datos. */
  phaseByDate: Record<string, string> | null;
}

/** Ventana máxima que carga el historial (el filtro fino es en la UI). */
export const HISTORY_WINDOW_DAYS = 365;

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const sinceIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const sinceDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateString(d);
};

/** Umbral de "dormiste poco" para la correlación de sueño. */
export const SLEEP_LOW_HOURS = 6;

export async function loadHistoryData(): Promise<HistoryData> {
  const userId = await getUserId();
  if (!userId) return { checkins: [], correlationDefs: [], phaseByDate: null };

  const since = sinceDate(HISTORY_WINDOW_DAYS);

  const [checkins, sleep, strength, cardio, fasting, sun, phaseByDate] = await Promise.all([
    fetchCheckins(userId),
    fetchSleep(userId, since),
    fetchDates('workout_sessions', userId, since),
    fetchDates('cardio_sessions', userId, since),
    fetchFasting(userId, since),
    fetchSunDates(userId, since),
    fetchPhaseByDate(userId),
  ]);

  const trainedDates = [...new Set([...strength, ...cardio])];

  const correlationDefs: CorrelationDef[] = [
    {
      key: 'sleep',
      label: 'Sueño',
      withLabel: `dormiste menos de ${SLEEP_LOW_HOURS} h`,
      withoutLabel: `dormiste ${SLEEP_LOW_HOURS} h o más`,
      factorDates: sleep.filter((s) => s.hours < SLEEP_LOW_HOURS).map((s) => s.date),
      // Un día sin dato de sueño NO es un día de buen sueño: se excluye.
      measuredDates: sleep.map((s) => s.date),
    },
    {
      key: 'training',
      label: 'Entrenamiento',
      withLabel: 'entrenaste',
      withoutLabel: 'no entrenaste',
      factorDates: trainedDates,
    },
    {
      key: 'fasting',
      label: 'Ayuno',
      withLabel: 'completaste un ayuno',
      withoutLabel: 'no ayunaste',
      factorDates: fasting,
    },
    {
      key: 'sun',
      // Honesto: ATP registra consciencia solar (1×/día), no minutos de sol.
      label: 'Sol',
      withLabel: 'registraste sol',
      withoutLabel: 'no registraste sol',
      factorDates: sun,
    },
  ];

  return { checkins, correlationDefs, phaseByDate };
}

async function fetchCheckins(userId: string): Promise<HistoryCheckinRecord[]> {
  const base = 'id, quadrant, emotions, pleasantness, energy_level, context_where, context_who, context_doing, note, created_at';
  const query = (cols: string) => supabase
    .from('emotional_checkins')
    .select(cols)
    .eq('user_id', userId)
    .gte('created_at', sinceIso(HISTORY_WINDOW_DAYS))
    .order('created_at', { ascending: false })
    .limit(1000);
  const { data, error } = await query(`${base}, body_zone`);
  if (!error) return (data ?? []) as unknown as HistoryCheckinRecord[];
  // Columna fantasma (mig 245 sin aplicar): el historial completo jamás se
  // pierde por una etiqueta — reintento sin body_zone.
  logWarn('[emotion-history] body_zone fetch failed, retrying without it', error);
  const retry = await query(base);
  if (retry.error) throw retry.error;
  return (retry.data ?? []) as unknown as HistoryCheckinRecord[];
}

async function fetchSleep(userId: string, since: string): Promise<{ date: string; hours: number }[]> {
  try {
    const { data, error } = await supabase
      .from('health_measurements')
      .select('date, sleep_hours')
      .eq('user_id', userId)
      .gte('date', since)
      .not('sleep_hours', 'is', null);
    if (error) throw error;
    return (data ?? [])
      .filter((r: any) => typeof r.sleep_hours === 'number')
      .map((r: any) => ({ date: r.date, hours: r.sleep_hours }));
  } catch (e) {
    logWarn('[emotion-history] sleep fetch failed', e);
    return [];
  }
}

async function fetchDates(table: string, userId: string, since: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('date')
      .eq('user_id', userId)
      .gte('date', since);
    if (error) throw error;
    return [...new Set((data ?? []).map((r: any) => r.date as string))];
  } catch (e) {
    logWarn(`[emotion-history] ${table} fetch failed`, e);
    return [];
  }
}

async function fetchFasting(userId: string, since: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('fasting_logs')
      .select('date')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('date', since);
    if (error) throw error;
    return [...new Set((data ?? []).map((r: any) => r.date as string))];
  } catch (e) {
    logWarn('[emotion-history] fasting fetch failed', e);
    return [];
  }
}

async function fetchSunDates(userId: string, since: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('electron_logs')
      .select('date')
      .eq('user_id', userId)
      .eq('source', 'sun_awareness')
      .gte('date', since);
    if (error) throw error;
    return [...new Set((data ?? []).map((r: any) => r.date as string))];
  } catch (e) {
    logWarn('[emotion-history] sun fetch failed', e);
    return [];
  }
}

/**
 * Fase del ciclo por fecha local, usando los periodos reales registrados
 * (últimos 6) + la fase pura de cycle-service. Días más allá de la longitud
 * del ciclo desde el último periodo conocido quedan SIN fase (no se inventa).
 *
 * Audit V2 B1: consume getCycleBasics, NO getCycleInfo — la guarda de
 * frescura protege la afirmación "HOY estás en fase X", no el mapeo
 * histórico: una usuaria con último inicio hace 46 días conserva el
 * overlay de los días pasados que sí se resuelven (la guarda por fecha de
 * abajo sigue cortando lo que no). El gate viene incluido igual.
 */
async function fetchPhaseByDate(userId: string): Promise<Record<string, string> | null> {
  try {
    const info = await getCycleBasics(userId);
    if (!info || !info.periods?.length) return null;
    const periods: { start_date: string }[] = [...info.periods]
      .sort((a, b) => (a.start_date < b.start_date ? 1 : -1)); // desc
    const cycleLen = info.cycleLen ?? 28;
    const periodLen = info.periodLen ?? 5;

    const map: Record<string, string> = {};
    const today = new Date();
    for (let back = 0; back < HISTORY_WINDOW_DAYS; back++) {
      const d = new Date(today);
      d.setDate(d.getDate() - back);
      const key = toLocalDateString(d);
      const period = periods.find((p) => p.start_date <= key);
      if (!period) continue;
      const day = Math.floor(
        (d.getTime() - parseLocalDate(period.start_date).getTime()) / 86400000,
      ) + 1;
      // Sin periodo nuevo registrado después de un ciclo completo → no se inventa fase.
      if (day < 1 || day > cycleLen) continue;
      map[key] = getPhase(day, cycleLen, periodLen);
    }
    return Object.keys(map).length > 0 ? map : null;
  } catch (e) {
    logWarn('[emotion-history] cycle fetch failed', e);
    return null;
  }
}
