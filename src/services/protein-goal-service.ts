/**
 * Protein Goal Service (MB-23 P4) — single source of truth de la meta de
 * proteína. La leen HOY (day-compiler QUANT_CONFIG) y el calendario de
 * adherencia; su editor murió con ATP PROTOCOLOS (protocol-config,
 * 2026-07-14) y quedó huérfana en su default. Este servicio le devuelve el
 * writer, con el molde exacto de hydration-service: leer goals, spread,
 * upsert por user_id.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';

export const DEFAULT_PROTEIN_GOAL_G = 150;
export const PROTEIN_GOAL_MIN_G = 50;
export const PROTEIN_GOAL_MAX_G = 400;
export const PROTEIN_GOAL_STEP_G = 10;

/** Fuente: user_day_preferences.goals.protein_goal_g (fallback 150 g). */
export async function getProteinGoalG(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('user_day_preferences')
      .select('goals')
      .eq('user_id', userId)
      .maybeSingle();
    const g = (data?.goals as any)?.protein_goal_g;
    if (typeof g === 'number' && g > 0) return g;
    return DEFAULT_PROTEIN_GOAL_G;
  } catch {
    return DEFAULT_PROTEIN_GOAL_G;
  }
}

/** Escribe la meta (clampeada al rango del viejo editor) y avisa al HOY. */
export async function setProteinGoalG(userId: string, grams: number): Promise<boolean> {
  const clamped = Math.max(PROTEIN_GOAL_MIN_G, Math.min(PROTEIN_GOAL_MAX_G, Math.round(grams)));
  const { data: existing } = await supabase
    .from('user_day_preferences')
    .select('goals')
    .eq('user_id', userId)
    .maybeSingle();
  const newGoals = { ...((existing?.goals as any) || {}), protein_goal_g: clamped };
  const { error } = await supabase
    .from('user_day_preferences')
    .upsert(
      { user_id: userId, goals: newGoals, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) {
    console.error('setProteinGoalG error:', error);
    return false;
  }
  DeviceEventEmitter.emit('day_changed');
  return true;
}
