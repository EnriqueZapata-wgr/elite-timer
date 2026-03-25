/**
 * Schedule Service — CRUD de rutinas programadas (calendario).
 *
 * Permite programar rutinas en ciclo semanal o fecha específica,
 * y consultar las rutinas programadas para hoy.
 */
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';

// === AUTH HELPER ===

async function getAuthenticatedUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

// === TYPES ===

export interface ScheduledRoutine {
  id: string;
  routine_id: string;
  schedule_type: 'weekly_cycle' | 'specific_date';
  day_of_week: number | null;
  specific_date: string | null;
  is_active: boolean;
}

export interface TodayRoutine {
  routine_id: string;
  routine_name: string;
  routine_mode: string;
  schedule_type: string;
  assigned_by: string | null;
  assigned_by_name: string | null;
}

// === QUERIES ===

/** Obtiene las rutinas programadas para hoy (vía RPC de Supabase) */
export async function getTodayRoutines(): Promise<TodayRoutine[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('get_today_routines', {
    p_user_id: user.id,
  });
  if (error) throw error;
  return data ?? [];
}

/** Obtiene los schedules activos de una rutina específica */
export async function getRoutineSchedule(routineId: string): Promise<ScheduledRoutine[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from('scheduled_routines')
    .select('id, routine_id, schedule_type, day_of_week, specific_date, is_active')
    .eq('user_id', user.id)
    .eq('routine_id', routineId)
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

/**
 * Programa una rutina en ciclo semanal.
 * Reemplaza los días anteriores: borra todos los weekly_cycle y crea los nuevos.
 * @param days — array de day_of_week (0=dom, 1=lun ... 6=sáb)
 */
export async function scheduleWeeklyCycle(routineId: string, days: number[]): Promise<void> {
  const user = await getAuthenticatedUser();

  // Borrar ciclo semanal existente para esta rutina
  await supabase
    .from('scheduled_routines')
    .delete()
    .eq('user_id', user.id)
    .eq('routine_id', routineId)
    .eq('schedule_type', 'weekly_cycle');

  // Insertar nuevos días
  if (days.length > 0) {
    const rows = days.map(day => ({
      user_id: user.id,
      routine_id: routineId,
      schedule_type: 'weekly_cycle' as const,
      day_of_week: day,
    }));
    const { error } = await supabase.from('scheduled_routines').insert(rows);
    if (error) throw error;
  }
}

/** Programa una rutina para una fecha específica */
export async function scheduleSpecificDate(routineId: string, date: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase.from('scheduled_routines').insert({
    user_id: user.id,
    routine_id: routineId,
    schedule_type: 'specific_date',
    specific_date: date,
  });
  if (error) throw error;
}

/** Elimina un schedule por id */
export async function removeSchedule(scheduleId: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_routines')
    .delete()
    .eq('id', scheduleId);
  if (error) throw error;
}

/** Sesiones recientes para la pantalla HOY (agrupadas por fecha) */
export async function getRecentSessions(limit = 3): Promise<{
  date: string;
  exercises: number;
  sets: number;
}[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('logged_at, exercise_id')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Agrupar por fecha
  const byDate = new Map<string, Set<string>>();
  const countByDate = new Map<string, number>();
  for (const log of data) {
    const date = new Date(log.logged_at).toISOString().split('T')[0];
    if (!byDate.has(date)) byDate.set(date, new Set());
    byDate.get(date)!.add(log.exercise_id);
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }

  return Array.from(byDate.entries())
    .slice(0, limit)
    .map(([date, exercises]) => ({
      date,
      exercises: exercises.size,
      sets: countByDate.get(date) ?? 0,
    }));
}
