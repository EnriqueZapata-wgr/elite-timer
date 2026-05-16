/**
 * Hydration Service — single source of truth para meta de agua del usuario.
 * Lectura/escritura siempre vía estos helpers.
 */
import { supabase } from '@/src/lib/supabase';

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

export const HYDRATION_DEFAULTS = {
  waterGoalMl: DEFAULT_WATER_GOAL_ML,
};
