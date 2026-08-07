/**
 * Score nutricional — I/O y cableado (T3 Sprint NUTRICIÓN, #72).
 *
 * Junta las fuentes del día (food_logs, hydration, peso, modo, ventanas de
 * comida), corre el algoritmo determinístico (nutrition-score-core) y
 * persiste en daily_nutrition_scores (upsert user_id+date). El hub lo
 * dispara al enfocarse; el panel coach ya leía esta tabla.
 *
 * NOTA: calculateDailyScore (nutrition-service) y nutrition-scoring.ts eran
 * implementaciones huérfanas sin caller — este service es el camino canónico
 * (flag en delivery para limpiar las viejas en v1.5).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { getUserWaterGoal } from './hydration-service';
import { getMealTimes } from './meal-times-service';
import { getNutritionMode } from './nutrition-mode-service';
import {
  computeNutritionScore,
  detectMicrosFromDescriptions,
  elegirPesoKg,
  mealsWithinWindows,
  qualityRatioFromMealScores,
  type ScoreBreakdown,
} from './nutrition-score-core';

/**
 * Peso más reciente del usuario — null sin medición.
 * MB-27 1.2: la CANÓNICA es health_measurements (onboarding, /health-input,
 * /edad-atp/composition — lo que el usuario de verdad llena). Antes leía
 * SOLO body_measurements, que solo escribe el panel de coach: la meta de
 * proteína caía siempre al default. body_measurements queda de complemento
 * (mismo patrón que health-score-service).
 */
async function fetchLatestWeightKg(userId: string): Promise<number | null> {
  try {
    const [hmRes, bmRes] = await Promise.all([
      supabase
        .from('health_measurements')
        .select('weight_kg')
        .eq('user_id', userId)
        .not('weight_kg', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('body_measurements')
        .select('weight_kg')
        .eq('user_id', userId)
        .not('weight_kg', 'is', null)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (hmRes.error) logWarn('[nutrition-score] health_measurements query failed:', hmRes.error.message);
    if (bmRes.error) logWarn('[nutrition-score] body_measurements query failed:', bmRes.error.message);
    const num = (v: unknown): number | null => (Number.isFinite(v) && (v as number) > 0 ? Number(v) : null);
    return elegirPesoKg(num((hmRes.data as any)?.weight_kg), num((bmRes.data as any)?.weight_kg));
  } catch (e) {
    logWarn('[nutrition-score] weight query failed:', e);
    return null;
  }
}

/**
 * Calcula el score del día y lo persiste. Devuelve el breakdown para la UI.
 * Fail-soft: si algo revienta, devuelve null y no rompe la pantalla.
 */
export async function computeAndSaveDailyScore(
  userId: string,
  date: string = getLocalToday(),
): Promise<ScoreBreakdown | null> {
  try {
    const [mode, weightKg, waterGoalMl, foodRes, waterRes, mealWindows] = await Promise.all([
      getNutritionMode(userId),
      fetchLatestWeightKg(userId),
      getUserWaterGoal(userId),
      supabase.from('food_logs')
        .select('calories, protein_g, carbs_g, fat_g, meal_type, meal_time, description, ai_analysis, notes')
        .eq('user_id', userId)
        .eq('date', date),
      supabase.from('hydration_logs')
        .select('total_ml')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle(),
      getMealTimes(userId).catch(() => null),
    ]);

    // supabase no lanza en 4xx — sin estos checks un error de esquema pasa por "día vacío".
    if (foodRes.error) logWarn('[nutrition-score] food_logs query failed:', foodRes.error.message);
    if (waterRes.error) logWarn('[nutrition-score] hydration query failed:', waterRes.error.message);
    const foods = (foodRes.data ?? []) as any[];
    const waterMl = (waterRes.data as any)?.total_ml ?? 0;

    const proteinG = foods.reduce((s, f) => s + (Number(f.protein_g) || 0), 0);
    const carbsG = foods.reduce((s, f) => s + (Number(f.carbs_g) || 0), 0);
    const fatG = foods.reduce((s, f) => s + (Number(f.fat_g) || 0), 0);
    const calories = foods.reduce((s, f) => s + (Number(f.calories) || 0), 0);

    // Calidad: score IA por comida (ai_analysis.score) o quality_score del
    // registro manual (JSON improvisado en notes) — ambos 0-100.
    const mealScores = foods.map((f) => {
      const ai = f.ai_analysis?.score;
      if (Number.isFinite(ai)) return Number(ai);
      try {
        const notes = typeof f.notes === 'string' ? JSON.parse(f.notes) : f.notes;
        return Number.isFinite(notes?.quality_score) ? Number(notes.quality_score) : null;
      } catch { return null; }
    });

    const mealsInWindow = mealWindows
      ? mealsWithinWindows(
          foods.map((f) => ({ mealType: f.meal_type ?? null, mealTime: f.meal_time ?? null })),
          mealWindows.mealTimes,
        )
      : foods.length; // sin ventanas configuradas → no castigar

    const breakdown = computeNutritionScore({
      mode,
      weightKg,
      proteinG,
      carbsG,
      fatG,
      waterMl,
      waterGoalMl,
      mealsLogged: foods.length,
      microsPresent: detectMicrosFromDescriptions(foods.map((f) => String(f.description ?? ''))),
      mealsInWindow,
      qualityRatio: qualityRatioFromMealScores(mealScores),
    });

    // Persistir (el panel coach ya lee esta tabla — sub-scores en 0-100)
    const { error } = await supabase.from('daily_nutrition_scores').upsert({
      user_id: userId,
      date,
      overall_score: breakdown.total,
      adherence_score: Math.round((breakdown.protein > 0 ? breakdown.protein : 0) / weightOf(mode, 'protein') * 100),
      hydration_score: Math.round(Math.min(1, waterGoalMl > 0 ? waterMl / waterGoalMl : 0) * 100),
      quality_score: breakdown.quality === null ? null : Math.round(breakdown.quality / weightOf(mode, 'quality') * 100),
      fasting_score: breakdown.timing === null ? null : Math.round(breakdown.timing / weightOf(mode, 'timing') * 100),
      total_calories: Math.round(calories),
      total_protein: Math.round(proteinG),
      total_carbs: Math.round(carbsG),
      total_fat: Math.round(fatG),
      meals_logged: foods.length,
      water_ml: waterMl,
      red_flags: breakdown.redFlags,
      highlights: breakdown.highlights,
    }, { onConflict: 'user_id,date' });
    if (error) logWarn('[nutrition-score] upsert failed:', error.message);

    return breakdown;
  } catch (e) {
    logWarn('[nutrition-score] compute failed:', e);
    return null;
  }
}

/** Peso máximo del bloque según modo (para normalizar sub-scores a 0-100). */
function weightOf(mode: 'simple' | 'complete', block: 'protein' | 'quality' | 'timing'): number {
  if (mode === 'simple') return block === 'protein' ? 40 : 1;
  return block === 'protein' ? 25 : block === 'quality' ? 15 : 10;
}

export interface ScoreTrendPoint {
  date: string;
  score: number;
}

/** Trend de scores (últimos `days`) para el hub. */
export async function getScoreTrend(userId: string, days = 7): Promise<ScoreTrendPoint[]> {
  try {
    const { data } = await supabase
      .from('daily_nutrition_scores')
      .select('date, overall_score')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(days);
    return ((data ?? []) as any[])
      .map((r) => ({ date: String(r.date).slice(0, 10), score: r.overall_score ?? 0 }))
      .reverse();
  } catch (e) {
    logWarn('[nutrition-score] trend query failed:', e);
    return [];
  }
}
