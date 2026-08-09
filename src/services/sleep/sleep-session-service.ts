/**
 * Sleep session service (MB-30A · Pieza 1) — persistencia de la noche propia.
 *
 * Regla "una noche, un registro": la tabla sleep_nights tiene UNIQUE
 * (user_id, night_date). Cuando hay dos fuentes para la misma noche:
 *
 *   · La sesión PROPIA (sleep_cycle) MANDA → upsert ON CONFLICT DO UPDATE:
 *     pisa un import previo. Tiene más señal (score, ronquido) y es la
 *     medición que el usuario hizo a propósito.
 *   · El import NUNCA pisa (ver sleep-import-service: ignoreDuplicates).
 *
 * Sin red no se pierde nada: la noche se encola en AsyncStorage y
 * sincronizarPendientes() la sube cuando vuelve la conexión (se llama al
 * entrar a la pantalla de Sueño). La sesión nocturna completa corre sin
 * internet — modo avión recomendado, doctrina hecha función.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import {
  drenarCola,
  encolarNoche,
  lecturaCola,
  type NocheDormida,
} from './sleep-core';

/** Fila de sleep_nights como la lee la pantalla. */
export interface SleepNightRow {
  night_date: string;
  bed_time: string | null;
  wake_time: string | null;
  duration_minutes: number | null;
  score: number | null;
  snore_minutes: number | null;
  source: string;
}

function filaDesdeNoche(userId: string, noche: NocheDormida) {
  return {
    user_id: userId,
    night_date: noche.nightDate,
    bed_time: noche.bedTimeISO,
    wake_time: noche.wakeTimeISO,
    duration_minutes: noche.durationMinutes,
    score: noche.score,
    snore_minutes: noche.snoreMinutes,
    source: noche.source,
    external_id: noche.externalId,
    updated_at: new Date().toISOString(),
  };
}

async function subirNochePropia(userId: string, noche: NocheDormida): Promise<boolean> {
  // LA PROPIA MANDA: ON CONFLICT (user_id, night_date) DO UPDATE.
  const { error } = await supabase
    .from('sleep_nights')
    .upsert(filaDesdeNoche(userId, noche), { onConflict: 'user_id,night_date' });
  if (error) {
    logWarn('[sleep] subir noche:', error.message);
    return false;
  }
  return true;
}

export interface GuardarNocheResultado {
  ok: boolean;
  /** true si no había red (o falló) y la noche quedó encolada local. */
  encolada: boolean;
}

/**
 * Guarda la noche recién terminada. Si la subida falla (modo avión, sin
 * señal, error del servidor), la encola local: NUNCA se pierde.
 */
export async function guardarNochePropia(
  userId: string,
  noche: NocheDormida,
): Promise<GuardarNocheResultado> {
  let subida = false;
  try {
    subida = await subirNochePropia(userId, noche);
  } catch (e) {
    logWarn('[sleep] guardar noche:', e);
    subida = false;
  }
  if (subida) return { ok: true, encolada: false };
  try {
    await encolarNoche(AsyncStorage, noche);
    return { ok: true, encolada: true };
  } catch (e) {
    logWarn('[sleep] encolar noche:', e);
    return { ok: false, encolada: false };
  }
}

/** Sube las noches pendientes de la cola offline. Devuelve cuántas subieron. */
export async function sincronizarPendientes(userId: string): Promise<number> {
  try {
    return await drenarCola(AsyncStorage, (noche) => subirNochePropia(userId, noche));
  } catch (e) {
    logWarn('[sleep] sincronizar pendientes:', e);
    return 0;
  }
}

/** ¿Hay noches esperando red? (para decirlo honesto en la pantalla). */
export async function hayPendientes(): Promise<number> {
  try {
    return (await lecturaCola(AsyncStorage)).length;
  } catch {
    return 0;
  }
}

/** Últimas noches registradas (cualquier fuente), la más reciente primero. */
export async function fetchNoches(userId: string, limit = 14): Promise<SleepNightRow[]> {
  const { data, error } = await supabase
    .from('sleep_nights')
    .select('night_date, bed_time, wake_time, duration_minutes, score, snore_minutes, source')
    .eq('user_id', userId)
    .order('night_date', { ascending: false })
    .limit(limit);
  if (error) {
    logWarn('[sleep] fetch noches:', error.message);
    return [];
  }
  return (data ?? []) as SleepNightRow[];
}
