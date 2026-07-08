/**
 * ARGOS Recipes cross-módulo (#96) — IO: junta preferencias + labs +
 * objetivo + ciclo y devuelve el bloque de contexto avanzado (o null).
 * Todo best-effort en paralelo: cualquier fuente puede fallar sin romper.
 */
import { supabase } from '@/src/lib/supabase';
import { getCycleInfo } from './cycle-service';
import {
  biomarkerFoodPriorities,
  buildAdvancedRecipeContext,
  cycleNutritionHint,
  type BiomarkerReading,
} from './recipe-context-logic';

/** Última lectura por biomarker_key (solo los que tienen regla nutricional). */
const RELEVANT_KEYS = ['ferritin', 'vitamin_d', 'glucose', 'hba1c', 'insulin', 'hdl', 'triglycerides'];

async function fetchLatestBiomarkers(userId: string): Promise<BiomarkerReading[]> {
  const { data, error } = await supabase
    .from('edad_atp_biomarkers')
    .select('biomarker_key, value, unit, measured_at')
    .eq('user_id', userId)
    .in('biomarker_key', RELEVANT_KEYS)
    .order('measured_at', { ascending: false })
    .limit(60);
  if (error || !data) return [];
  const latest = new Map<string, BiomarkerReading>();
  for (const row of data as any[]) {
    if (!latest.has(row.biomarker_key)) {
      latest.set(row.biomarker_key, {
        key: row.biomarker_key,
        value: Number(row.value),
        unit: row.unit ?? '',
      });
    }
  }
  return Array.from(latest.values());
}

async function fetchFoodPreferences(userId: string) {
  const { data } = await supabase
    .from('food_preferences')
    .select('diet_type, allergies, dislikes')
    .eq('user_id', userId)
    .maybeSingle();
  return data as { diet_type: string | null; allergies: string[] | null; dislikes: string | null } | null;
}

async function fetchPrimaryGoal(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('client_profiles')
    .select('primary_goal')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as any)?.primary_goal ?? null;
}

/**
 * Contexto avanzado para generateRecipe. null = nada que aportar
 * (el caller usa el flujo normal, más rápido y barato).
 */
export async function buildRecipeAdvancedContext(userId: string): Promise<string | null> {
  const [prefsRes, biosRes, goalRes, cycleRes] = await Promise.allSettled([
    fetchFoodPreferences(userId),
    fetchLatestBiomarkers(userId),
    fetchPrimaryGoal(userId),
    getCycleInfo(userId),
  ]);

  const prefs = prefsRes.status === 'fulfilled' ? prefsRes.value : null;
  const bios = biosRes.status === 'fulfilled' ? biosRes.value : [];
  const goal = goalRes.status === 'fulfilled' ? goalRes.value : null;
  const cycle = cycleRes.status === 'fulfilled' ? (cycleRes.value as any) : null;

  return buildAdvancedRecipeContext({
    dietType: prefs?.diet_type ?? null,
    allergies: prefs?.allergies ?? [],
    dislikes: prefs?.dislikes ?? null,
    primaryGoal: goal,
    biomarkerPriorities: biomarkerFoodPriorities(bios),
    cycleHint: cycleNutritionHint(cycle?.currentPhase ?? null),
  });
}
