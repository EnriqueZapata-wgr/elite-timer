/**
 * Habit Times Service (MB-23 P4) — en qué momento del día vive cada hábito.
 *
 * La hora canónica de cada hábito estaba escrita en el código (TAREA_TIME:
 * sol 07:30, meditación 07:00…) y nadie podía moverla. El override por
 * usuario vive en user_day_preferences.goals.habit_times (el mismo jsonb de
 * metas: sin migración) y lo consume el compile → tareaTiming (core puro):
 * la hora manda y el momento (mañana/tarde/noche) se deriva de ella.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { TAREA_TIME } from '@/src/services/hoy/tareas-core';

/** La hora efectiva de un hábito: override del usuario o la canónica. */
export async function getHabitTime(userId: string, source: string): Promise<string> {
  const canonical = TAREA_TIME[source] ?? '12:00';
  try {
    const { data } = await supabase
      .from('user_day_preferences')
      .select('goals')
      .eq('user_id', userId)
      .maybeSingle();
    const t = (data?.goals as any)?.habit_times?.[source];
    return typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t) ? t : canonical;
  } catch {
    return canonical;
  }
}

/** Escribe el override ('HH:MM') y fuerza el recompile del HOY. */
export async function setHabitTime(userId: string, source: string, time: string): Promise<boolean> {
  if (!/^\d{1,2}:\d{2}$/.test(time)) return false;
  const { data: existing } = await supabase
    .from('user_day_preferences')
    .select('goals')
    .eq('user_id', userId)
    .maybeSingle();
  const goals = (existing?.goals as any) || {};
  const newGoals = {
    ...goals,
    habit_times: { ...(goals.habit_times || {}), [source]: time },
  };
  const { error } = await supabase
    .from('user_day_preferences')
    .upsert(
      { user_id: userId, goals: newGoals, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) {
    console.error('setHabitTime error:', error);
    return false;
  }
  DeviceEventEmitter.emit('electrons_changed');
  return true;
}
