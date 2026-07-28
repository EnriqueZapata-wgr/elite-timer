/**
 * Adherence Calendar Service (MB-11 C) — trae las señales por día de un mes
 * para el calendario de puntos: ayuno · proteína · agua · actividad.
 * (Sueño no tiene fuente por día todavía — wearable desactivado; la métrica
 * queda ausente y la UI lo dice.)
 *
 * Criterio MB-6/Track A: cada query chequea { error } y loguea; una métrica
 * que falla queda AUSENTE ese día (sin datos), nunca pintada como "no cumplió".
 * Esquema cruzado contra el remoto (2026-07-28): fasting_logs(date, status,
 * actual_hours, target_hours) · food_logs(date, protein_g) · hydration_logs
 * (date, total_ml, target_ml) · workout_sessions(date) ·
 * user_day_preferences(goals jsonb).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import {
  type FlagsByDate,
  fastingMet,
  proteinMet,
  waterMet,
  dateKey,
  daysInMonth,
} from './adherence-calendar-core';

const DEFAULT_PROTEIN_GOAL_G = 150; // mismo default que QUANT_CONFIG del day-compiler
const DEFAULT_WATER_GOAL_ML = 2500; // mismo default que hydration-service

export async function getMonthAdherence(
  userId: string,
  year: number,
  month0: number,
): Promise<FlagsByDate> {
  const from = dateKey(year, month0, 1);
  const to = dateKey(year, month0, daysInMonth(year, month0));
  const flags: FlagsByDate = {};
  const dayOf = (date: string): Record<string, boolean> => (flags[date] ??= {});

  const [goalsRes, fastRes, foodRes, waterRes, workoutRes] = await Promise.all([
    supabase.from('user_day_preferences').select('goals').eq('user_id', userId).maybeSingle(),
    supabase.from('fasting_logs')
      .select('date, status, actual_hours, target_hours')
      .eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('food_logs')
      .select('date, protein_g')
      .eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('hydration_logs')
      .select('date, total_ml, target_ml')
      .eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('workout_sessions')
      .select('date')
      .eq('user_id', userId).gte('date', from).lte('date', to),
  ]);

  if (goalsRes.error) logWarn('[Adherencia] user_day_preferences query failed', goalsRes.error);
  const goals = (goalsRes.data?.goals ?? {}) as Record<string, number>;
  const proteinGoal = Number(goals.protein_goal_g) > 0 ? Number(goals.protein_goal_g) : DEFAULT_PROTEIN_GOAL_G;
  const waterGoal = Number(goals.water_goal_ml) > 0 ? Number(goals.water_goal_ml) : DEFAULT_WATER_GOAL_ML;

  if (fastRes.error) {
    logWarn('[Adherencia] fasting_logs query failed', fastRes.error);
  } else {
    for (const r of fastRes.data ?? []) {
      if (!r.date || r.status === 'active') continue; // el activo aún no cuenta
      const met = fastingMet(r.status, r.actual_hours == null ? null : Number(r.actual_hours), r.target_hours);
      // Varios ayunos el mismo día: con que uno cumpla, el día cumple.
      dayOf(r.date).ayuno = dayOf(r.date).ayuno || met;
    }
  }

  if (foodRes.error) {
    logWarn('[Adherencia] food_logs query failed', foodRes.error);
  } else {
    const byDay = new Map<string, number>();
    for (const r of foodRes.data ?? []) {
      if (!r.date) continue;
      byDay.set(r.date, (byDay.get(r.date) ?? 0) + (Number(r.protein_g) || 0));
    }
    for (const [date, total] of byDay) dayOf(date).proteina = proteinMet(total, proteinGoal);
  }

  if (waterRes.error) {
    logWarn('[Adherencia] hydration_logs query failed', waterRes.error);
  } else {
    for (const r of waterRes.data ?? []) {
      if (!r.date) continue;
      dayOf(r.date).agua = waterMet(Number(r.total_ml) || 0, Number(r.target_ml) || waterGoal);
    }
  }

  if (workoutRes.error) {
    logWarn('[Adherencia] workout_sessions query failed', workoutRes.error);
  } else {
    // Actividad: la sesión existe → el hábito se hizo (binaria, sin meta).
    for (const r of workoutRes.data ?? []) if (r.date) dayOf(r.date).actividad = true;
  }

  return flags;
}
