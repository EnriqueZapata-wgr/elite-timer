/**
 * Hydration Service — single source of truth para meta de agua del usuario.
 * Lectura/escritura siempre vía estos helpers.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';

const DEFAULT_WATER_GOAL_ML = 2500;

/**
 * Obtiene la meta de agua del usuario en ml.
 * Fuente: user_day_preferences.goals.water_goal_ml
 * Si no existe, fallback al default (2500ml).
 */
export async function getUserWaterGoal(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('user_day_preferences')
      .select('goals')
      .eq('user_id', userId)
      .maybeSingle();

    const goalMl = (data?.goals as any)?.water_goal_ml;
    if (typeof goalMl === 'number' && goalMl > 0) return goalMl;
    return DEFAULT_WATER_GOAL_ML;
  } catch {
    return DEFAULT_WATER_GOAL_ML;
  }
}

/**
 * Establece la meta de agua del usuario en ml.
 * Persiste en user_day_preferences.goals.water_goal_ml.
 */
export async function setUserWaterGoal(userId: string, waterMl: number): Promise<boolean> {
  if (waterMl <= 0 || waterMl > 10000) {
    throw new Error(`Meta de agua inválida: ${waterMl}ml (rango válido: 1-10000)`);
  }

  const { data: existing } = await supabase
    .from('user_day_preferences')
    .select('goals')
    .eq('user_id', userId)
    .maybeSingle();

  const newGoals = {
    ...((existing?.goals as any) || {}),
    water_goal_ml: waterMl,
  };

  const { error } = await supabase
    .from('user_day_preferences')
    .upsert(
      { user_id: userId, goals: newGoals, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('setUserWaterGoal error:', error);
    return false;
  }
  return true;
}

/**
 * Registra una entrada de agua (delta en ml) en hydration_logs del día actual.
 * INSERT-or-UPDATE atómico. Emite 'day_changed' al final. Devuelve el nuevo total_ml
 * en caso de éxito o null si falló.
 */
export async function addWater(userId: string, deltaMl: number): Promise<number | null> {
  try {
    const date = getLocalToday();
    const nowTime = new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit',
    });

    const { data: existing } = await supabase
      .from('hydration_logs')
      .select('id, total_ml, entries')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    const prevTotal = (existing?.total_ml as number) ?? 0;
    const newTotal = Math.max(0, prevTotal + deltaMl);
    const actualDelta = newTotal - prevTotal;
    if (actualDelta === 0) return prevTotal;

    const entries = [
      ...(((existing?.entries as any[]) ?? [])),
      { time: nowTime, amount_ml: actualDelta },
    ];

    if (existing?.id) {
      const { error } = await supabase
        .from('hydration_logs')
        .update({ total_ml: newTotal, entries })
        .eq('id', existing.id);
      if (error) return null;
    } else {
      const goalMl = await getUserWaterGoal(userId);
      const { error } = await supabase
        .from('hydration_logs')
        .insert({ user_id: userId, date, total_ml: newTotal, target_ml: goalMl, entries });
      if (error) return null;
    }

    // Reglas #5 + #6: tras mutar agua, refrescar día Y electrones (la barra/electrón de agua
    // y cualquier pantalla suscrita se actualizan al instante, sin pull-to-refresh).
    DeviceEventEmitter.emit('day_changed');
    DeviceEventEmitter.emit('electrons_changed');
    return newTotal;
  } catch {
    return null;
  }
}

export const HYDRATION_DEFAULTS = {
  waterGoalMl: DEFAULT_WATER_GOAL_ML,
};

/**
 * Estadísticas resumidas de hidratación: promedio últimos 7 días y
 * progreso de HOY contra la meta del usuario. Para contexto a ARGOS.
 */
export async function getHydrationStats(userId: string): Promise<{
  last7dAvgMl: number;
  todayProgressPct: number;
} | null> {
  try {
    const todayStr = getLocalToday();
    const since = parseLocalDate(todayStr);
    since.setDate(since.getDate() - 6); // incluye hoy = 7 días
    const sinceStr = toLocalDateString(since);

    const { data, error } = await supabase
      .from('hydration_logs')
      .select('date, total_ml')
      .eq('user_id', userId)
      .gte('date', sinceStr);
    if (error) return null;

    const rows = data ?? [];
    const last7dAvgMl = rows.length > 0
      ? Math.round(rows.reduce((s: number, r: any) => s + (Number(r.total_ml) || 0), 0) / rows.length)
      : 0;

    const todayTotal = Number(rows.find((r: any) => r.date === todayStr)?.total_ml || 0);
    const goal = await getUserWaterGoal(userId);
    const todayProgressPct = goal > 0 ? Math.round((todayTotal / goal) * 100) : 0;

    return { last7dAvgMl, todayProgressPct };
  } catch {
    return null;
  }
}
