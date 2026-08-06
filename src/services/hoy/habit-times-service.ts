/**
 * Habit Times Service (MB-23 P4, reglas en MB-26 Pieza 5) — en qué momento
 * del día vive cada hábito.
 *
 * El override por usuario vive en user_day_preferences.goals.habit_times
 * (el mismo jsonb de metas: sin migración). Desde MB-26 una entrada puede
 * ser hora fija 'HH:MM' (el usuario la eligió a mano, o la traía de antes:
 * nadie pierde su hora) o una REGLA { ancla, offsetMin } relativa a
 * despertar / dormir / uv. La hora absoluta se calcula al compilar
 * (habit-times-core); aquí viven los writers y el horario del usuario.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { TAREA_TIME } from '@/src/services/hoy/tareas-core';
import {
  esHoraHHMM, parseHabitTimeEntry, resolverHora,
  type ContextoHorario, type HoraRegla,
} from '@/src/services/hoy/habit-times-core';

/** 'HH:MM[:SS]' de la base → 'HH:MM', o null. */
function horaDeDb(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.slice(0, 5);
  return esHoraHHMM(t) ? t : null;
}

/**
 * El horario REAL del usuario: lo que editó en config (goals) pisa al
 * cronotipo, y el cronotipo pisa al default. MB-26 P5: el horario base
 * sale del cronotipo que ya existe — no se le pregunta nada nuevo a nadie.
 */
export async function getUserSchedule(
  userId: string,
): Promise<{ despertar: string; dormir: string }> {
  let goals: Record<string, unknown> = {};
  let chrono: Record<string, unknown> = {};
  try {
    const [prefsRes, chronoRes] = await Promise.all([
      supabase.from('user_day_preferences').select('goals').eq('user_id', userId).maybeSingle(),
      supabase.from('user_chronotype').select('wake_time, sleep_time').eq('user_id', userId).maybeSingle(),
    ]);
    goals = (prefsRes.data?.goals as Record<string, unknown>) ?? {};
    chrono = (chronoRes.data as Record<string, unknown>) ?? {};
  } catch { /* defaults */ }
  return {
    despertar: horaDeDb(goals.wake_time) ?? horaDeDb(chrono.wake_time) ?? '07:00',
    dormir: horaDeDb(goals.sleep_time) ?? horaDeDb(chrono.sleep_time) ?? '23:00',
  };
}

/**
 * La hora efectiva de un hábito, ya resuelta: fija → tal cual; regla →
 * contra el horario real (sin dato UV, el ancla 'uv' cae a despertar +
 * 30). Sin entrada → la canónica de tareas-core.
 */
export async function getHabitTime(userId: string, source: string): Promise<string> {
  const canonical = TAREA_TIME[source] ?? '12:00';
  try {
    const [{ data }, schedule] = await Promise.all([
      supabase.from('user_day_preferences').select('goals').eq('user_id', userId).maybeSingle(),
      getUserSchedule(userId),
    ]);
    const entry = parseHabitTimeEntry((data?.goals as any)?.habit_times?.[source]);
    if (entry == null) return canonical;
    const ctx: ContextoHorario = { ...schedule, uvInicio: null };
    return resolverHora(entry, ctx).time;
  } catch {
    return canonical;
  }
}

async function writeHabitTimeEntry(
  userId: string,
  source: string,
  entry: string | HoraRegla,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('user_day_preferences')
    .select('goals')
    .eq('user_id', userId)
    .maybeSingle();
  const goals = (existing?.goals as any) || {};
  const newGoals = {
    ...goals,
    habit_times: { ...(goals.habit_times || {}), [source]: entry },
  };
  const { error } = await supabase
    .from('user_day_preferences')
    .upsert(
      { user_id: userId, goals: newGoals, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) {
    console.error('writeHabitTimeEntry error:', error);
    return false;
  }
  DeviceEventEmitter.emit('electrons_changed');
  return true;
}

/** Escribe el override FIJO ('HH:MM': el usuario eligió esa hora a mano)
 *  y fuerza el recompile del HOY. */
export async function setHabitTime(userId: string, source: string, time: string): Promise<boolean> {
  if (!esHoraHHMM(time)) return false;
  return writeHabitTimeEntry(userId, source, time);
}

/** Escribe una REGLA relativa (los packs y el sol viven aquí). */
export async function setHabitTimeRegla(
  userId: string,
  source: string,
  regla: HoraRegla,
): Promise<boolean> {
  return writeHabitTimeEntry(userId, source, regla);
}
