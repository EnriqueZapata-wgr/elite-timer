/**
 * Nutrition Service — Planes, food logs, hidratación, ayuno, scores, recetas.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from './anthropic-client';

// === AUTH ===
async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user.id;
}

// === TYPES ===
export interface NutritionPlan {
  id: string; user_id: string; created_by: string; name: string; description: string | null;
  diet_type: string | null; calorie_target: number | null; protein_target: number | null;
  carb_target: number | null; fat_target: number | null; fiber_target: number | null;
  water_target: number | null; feeding_window_start: string | null; feeding_window_end: string | null;
  fasting_hours: number | null; meals_per_day: number; meal_schedule: any[];
  foods_to_avoid: string[]; foods_to_prioritize: string[]; allergies: string[];
  supplement_notes: string | null; status: string; start_date: string | null;
  end_date: string | null; notes: string | null; created_at: string;
}

export interface FoodLog {
  id: string; user_id: string; date: string; meal_type: string; meal_time: string | null;
  description: string; photo_url: string | null; ai_analysis: any | null;
  calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null;
  hunger_level: number | null; satisfaction_level: number | null; notes: string | null;
  created_at: string;
}

export interface HydrationLog {
  id: string; user_id: string; date: string; entries: any[]; total_ml: number; target_ml: number;
}

export interface FastingLog {
  id: string; user_id: string; date: string; fast_start: string | null; fast_end: string | null;
  target_hours: number; actual_hours: number | null; broke_fast_with: string | null;
  energy_during: number | null; status: string;
}

export interface DailyNutritionScore {
  overall_score: number | null; adherence_score: number | null; hydration_score: number | null;
  fasting_score: number | null; quality_score: number | null; total_calories: number | null;
  total_protein: number | null; meals_logged: number | null; water_ml: number | null;
  fasting_hours: number | null; red_flags: string[]; highlights: string[];
}

export interface Recipe {
  id: string; name: string; description: string | null; category: string | null;
  tags: string[]; prep_time_min: number | null; cook_time_min: number | null;
  servings: number; ingredients: any[]; instructions: any[];
  calories: number | null; protein_g: number | null; carbs_g: number | null;
  fat_g: number | null; fiber_g: number | null; photo_url: string | null;
}

// === NUTRITION PLANS ===

export async function getActivePlan(userId?: string): Promise<NutritionPlan | null> {
  const uid = userId || await getUserId();
  const { data } = await supabase.from('nutrition_plans').select('*')
    .eq('user_id', uid).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
  return data;
}

export async function createPlan(planData: Partial<NutritionPlan> & { user_id: string }): Promise<NutritionPlan> {
  const user = await getUserId();
  const { data, error } = await supabase.from('nutrition_plans')
    .insert({ ...planData, created_by: user }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePlan(planId: string, updates: Partial<NutritionPlan>): Promise<void> {
  const { error } = await supabase.from('nutrition_plans')
    .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', planId);
  if (error) throw error;
}

// === FOOD LOGS ===

export async function logFood(data: {
  meal_type: string; description: string; photo_url?: string; meal_time?: string;
  hunger_level?: number; satisfaction_level?: number; notes?: string;
  ai_analysis?: any; calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number;
  user_id?: string; date?: string;
}): Promise<FoodLog> {
  const userId = data.user_id || await getUserId();
  const date = data.date || new Date().toISOString().split('T')[0];
  const { user_id: _, date: __, ...rest } = data;
  const { data: log, error } = await supabase.from('food_logs')
    .insert({ user_id: userId, date, ...rest }).select('*').single();
  if (error) throw error;
  return log;
}

export async function getFoodLogs(userId?: string, date?: string): Promise<FoodLog[]> {
  const uid = userId || await getUserId();
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('food_logs').select('*')
    .eq('user_id', uid).eq('date', d).order('created_at', { ascending: true });
  return data ?? [];
}

export async function getFoodLogsRange(userId: string, startDate: string, endDate: string): Promise<FoodLog[]> {
  const { data } = await supabase.from('food_logs').select('*')
    .eq('user_id', userId).gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
  return data ?? [];
}

export async function deleteFoodLog(logId: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', logId);
  if (error) throw error;
}

// === FOOD PHOTO ANALYSIS ===

export async function uploadFoodPhoto(base64Data: string): Promise<string> {
  const userId = await getUserId();
  const path = `${userId}/${Date.now()}.jpg`;
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const { error } = await supabase.storage.from('food-photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = await supabase.storage.from('food-photos')
    .createSignedUrl(path, 365 * 24 * 60 * 60);
  return urlData?.signedUrl ?? '';
}

// Prompt base ATP de nutrición — evalúa CALIDAD, no solo calorías
function buildFoodPrompt(plan: NutritionPlan | null, description?: string, extra?: string): string {
  const planCtx = plan ? `
Plan nutricional activo:
- Dieta: ${plan.diet_type ?? 'no definido'} | Cal: ${plan.calorie_target ?? '?'}kcal | Prot: ${plan.protein_target ?? '?'}g
- Evitar: ${(plan.foods_to_avoid ?? []).join(', ') || 'nada'}
- Priorizar: ${(plan.foods_to_prioritize ?? []).join(', ') || 'nada'}
- Alergias: ${(plan.allergies ?? []).join(', ') || 'ninguna'}` : '';

  return `Eres el analista nutricional de ATP. Evalúas CALIDAD nutricional, no conteo exacto de calorías. Datos APROXIMADOS.
${description ? 'El usuario describe: ' + description : ''}
${extra || ''}${planCtx}

FILOSOFÍA: ¿Tiene proteína suficiente (>25g ideal)? ¿Verduras/fibra? ¿Grasas saludables o industriales? ¿Comida REAL o procesada? ¿Azúcar/harina refinada?

SCORE: 90-100=ejemplar, 75-89=muy bien, 60-74=aceptable, 40-59=mejorable, 0-39=ultra-procesado/cochinada.

Responde SOLO JSON válido (sin backticks):
{"food_identified":"Descripción del platillo","ingredients":[{"name":"Huevos revueltos","portion":"~150g (3 huevos)","calories":210,"protein":18,"carbs":2,"fat":15},{"name":"Aguacate","portion":"~1/2 pieza","calories":120,"protein":1,"carbs":6,"fat":11}],"totals":{"calories":330,"protein":19,"carbs":8,"fat":26,"fiber":4},"score":82,"score_label":"Buena","feedback":"Evaluación en español coloquial, 2-3 oraciones enfocadas en calidad.","good_points":["Proteína completa","Grasas saludables"],"improve_points":["Agregar más verduras de color"],"tags":["alta_proteina","grasas_saludables"],"red_flags":[],"suggestions":"Una sugerencia concreta"}

Porciones en LENGUAJE NATURAL: "1/2 pieza", "~1 taza", "3 huevos", "~150g".`;
}

function parseFoodResult(text: string): any {
  try {
    return JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch {
    return { food_identified: 'No identificado', score: 50, ingredients: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, feedback: text, good_points: [], improve_points: [], tags: [], red_flags: [] };
  }
}

export async function analyzeFoodPhoto(
  photoBase64: string, description?: string,
): Promise<any> {
  const userId = await getUserId();
  const plan = await getActivePlan(userId).catch(() => null);
  const prompt = buildFoodPrompt(plan, description);

  const response = await callAnthropic([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photoBase64 } },
      { type: 'text', text: `Analiza esta comida desde la foto.\n${prompt}` },
    ],
  }], 2000, 'claude-sonnet-4-20250514');

  return parseFoodResult(response?.content?.[0]?.text ?? '{}');
}

export async function analyzeFoodText(description: string): Promise<any> {
  const userId = await getUserId();
  const plan = await getActivePlan(userId).catch(() => null);
  const prompt = buildFoodPrompt(plan, description);

  const response = await callAnthropic([{
    role: 'user',
    content: `Analiza esta comida descrita por el usuario. NO hay foto — estima desde la descripción.\n${prompt}`,
  }], 2000, 'claude-sonnet-4-20250514');

  return parseFoodResult(response?.content?.[0]?.text ?? '{}');
}

/** Recalcular con IA después de editar ingredientes */
export async function reanalyzeFood(ingredients: any[], mealType?: string): Promise<any> {
  const userId = await getUserId();
  const plan = await getActivePlan(userId).catch(() => null);
  const desc = ingredients.map(i => `${i.name} (${i.portion})`).join(', ');
  const prompt = buildFoodPrompt(plan, desc, mealType ? `Tipo: ${mealType}` : '');

  const response = await callAnthropic([{
    role: 'user',
    content: `El usuario editó los ingredientes. Recalcula score y feedback.\n${prompt}`,
  }], 2000, 'claude-sonnet-4-20250514');

  return parseFoodResult(response?.content?.[0]?.text ?? '{}');
}

// === HYDRATION ===

export async function getHydration(date?: string): Promise<HydrationLog> {
  const userId = await getUserId();
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('hydration_logs').select('*')
    .eq('user_id', userId).eq('date', d).single();
  if (data) return data;
  // Crear si no existe
  const { data: created, error } = await supabase.from('hydration_logs')
    .insert({ user_id: userId, date: d }).select('*').single();
  if (error) throw error;
  return created;
}

export async function addWater(amount_ml: number, type = 'water'): Promise<HydrationLog> {
  const userId = await getUserId();
  const d = new Date().toISOString().split('T')[0];
  const log = await getHydration(d);
  const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const entries = [...(log.entries ?? []), { time: now, amount_ml, type }];
  const total_ml = entries.reduce((sum: number, e: any) => sum + (e.amount_ml || 0), 0);

  const { data, error } = await supabase.from('hydration_logs')
    .update({ entries, total_ml, updated_at: new Date().toISOString() })
    .eq('id', log.id).select('*').single();
  if (error) throw error;
  return data;
}

export async function getHydrationForUser(userId: string, date: string): Promise<HydrationLog | null> {
  const { data } = await supabase.from('hydration_logs').select('*')
    .eq('user_id', userId).eq('date', date).single();
  return data;
}

// === FASTING ===

export async function startFast(targetHours = 16): Promise<FastingLog> {
  const userId = await getUserId();
  const d = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('fasting_logs')
    .upsert({ user_id: userId, date: d, fast_start: new Date().toISOString(), target_hours: targetHours, status: 'active' },
      { onConflict: 'user_id,date' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function endFast(broke_fast_with?: string, energy_during?: number): Promise<FastingLog> {
  const userId = await getUserId();
  const d = new Date().toISOString().split('T')[0];
  const { data: log } = await supabase.from('fasting_logs').select('*')
    .eq('user_id', userId).eq('date', d).eq('status', 'active').single();
  if (!log) throw new Error('No hay ayuno activo');

  const actual_hours = log.fast_start
    ? Math.round(((Date.now() - new Date(log.fast_start).getTime()) / 3600000) * 10) / 10
    : 0;

  const { data, error } = await supabase.from('fasting_logs')
    .update({ fast_end: new Date().toISOString(), actual_hours, broke_fast_with, energy_during, status: 'completed' })
    .eq('id', log.id).select('*').single();
  if (error) throw error;
  return data;
}

export async function getActiveFast(): Promise<FastingLog | null> {
  const userId = await getUserId();
  const { data } = await supabase.from('fasting_logs').select('*')
    .eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
  return data;
}

export async function getTodayFast(): Promise<FastingLog | null> {
  const userId = await getUserId();
  const d = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('fasting_logs').select('*')
    .eq('user_id', userId).eq('date', d).single();
  return data;
}

// === DAILY SCORE ===

export async function calculateDailyScore(userId?: string, date?: string): Promise<DailyNutritionScore> {
  const uid = userId || await getUserId();
  const d = date || new Date().toISOString().split('T')[0];

  const [foods, hydration, fasting, plan] = await Promise.all([
    getFoodLogs(uid, d),
    getHydrationForUser(uid, d),
    supabase.from('fasting_logs').select('*').eq('user_id', uid).eq('date', d).single().then(r => r.data),
    getActivePlan(uid).catch(() => null),
  ]);

  // Calculate scores
  const aiScores = foods.filter(f => f.ai_analysis?.score).map(f => f.ai_analysis.score as number);
  const adherence = aiScores.length > 0 ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length) : 50;
  const totalCal = foods.reduce((s, f) => s + (f.ai_analysis?.estimated_calories ?? f.calories ?? 0), 0);
  const totalProt = foods.reduce((s, f) => s + (f.ai_analysis?.estimated_protein ?? f.protein_g ?? 0), 0);
  const totalCarbs = foods.reduce((s, f) => s + (f.ai_analysis?.estimated_carbs ?? f.carbs_g ?? 0), 0);
  const totalFat = foods.reduce((s, f) => s + (f.ai_analysis?.estimated_fat ?? f.fat_g ?? 0), 0);

  const waterMl = hydration?.total_ml ?? 0;
  const waterTarget = hydration?.target_ml ?? plan?.water_target ? (plan?.water_target ?? 2.5) * 1000 : 2500;
  const hydrationScore = Math.min(100, Math.round((waterMl / waterTarget) * 100));

  const fastingHours = fasting?.actual_hours ?? 0;
  const fastingTarget = fasting?.target_hours ?? plan?.fasting_hours ?? 16;
  const fastingScore = fasting?.status === 'completed'
    ? Math.min(100, Math.round((fastingHours / fastingTarget) * 100))
    : 0;

  const quality = adherence;
  const overall = Math.round(adherence * 0.4 + hydrationScore * 0.2 + fastingScore * 0.2 + quality * 0.2);

  const red_flags: string[] = [];
  const highlights: string[] = [];
  if (totalProt < (plan?.protein_target ?? 80) * 0.7) red_flags.push('Poca proteína');
  if (waterMl < waterTarget * 0.5) red_flags.push('Deshidratado');
  if (adherence >= 80) highlights.push('Buena adherencia');
  if (hydrationScore >= 90) highlights.push('Hidratación óptima');
  if (fasting?.status === 'completed') highlights.push('Ayuno cumplido');

  const score: DailyNutritionScore = {
    overall_score: overall, adherence_score: adherence, hydration_score: hydrationScore,
    fasting_score: fastingScore, quality_score: quality,
    total_calories: totalCal, total_protein: totalProt, meals_logged: foods.length,
    water_ml: waterMl, fasting_hours: fastingHours, red_flags, highlights,
  };

  // Upsert
  await supabase.from('daily_nutrition_scores').upsert({
    user_id: uid, date: d, ...score, total_carbs: totalCarbs, total_fat: totalFat,
  }, { onConflict: 'user_id,date' });

  return score;
}

// === RECIPES ===

export async function getRecipes(limit = 20): Promise<Recipe[]> {
  const { data } = await supabase.from('recipes').select('*')
    .eq('is_public', true).order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
}

export async function getRecipe(recipeId: string): Promise<Recipe | null> {
  const { data } = await supabase.from('recipes').select('*').eq('id', recipeId).single();
  return data;
}

// === LABEL ANALYSIS ===

export async function analyzeLabelPhoto(
  photoBase64: string, productName?: string, useContext?: string,
): Promise<any> {
  const response = await callAnthropic([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photoBase64 } },
      { type: 'text', text: `Analiza esta etiqueta de producto alimenticio. ${productName ? 'Producto: ' + productName : ''}
CONTEXTO DE USO: ${useContext || 'No especificado'}

REGLA CRÍTICA: Evalúa el producto SEGÚN SU PROPÓSITO.
Electrolitos DEBEN tener sodio, potasio, magnesio — eso es BUENO, no penalizar.
Proteína en polvo DEBE tener alta proteína — no penalizar por "exceso de proteína".
Aceite de oliva DEBE ser 100% grasa — no penalizar por "alto en grasa".
Evalúa si el producto CUMPLE BIEN su propósito, no si es una comida balanceada.

SCORING AJUSTADO POR CONTEXTO:
- ¿Cumple su propósito? (ingredientes correctos para lo que es): 40 pts
- ¿Ingredientes limpios? (sin aditivos innecesarios): 30 pts
- ¿Formas de buena calidad? (ej: sal marina > sal refinada): 20 pts
- ¿Sin ingredientes controversiales innecesarios?: 10 pts

100 = perfecto para su propósito con ingredientes impecables.
Ejemplos: Sardinas (sardinas, aceite de oliva, sal) = 92-95. Electrolitos puros (sodio, potasio, magnesio) sin aditivos = 95-100. Stevia orgánica pura = 95-100.
Un producto de 3 ingredientes naturales que cumple su función PUEDE sacar 95-100.

Responde SOLO con JSON válido (sin backticks ni markdown):
{"product_name":"nombre del producto","cleanliness_score":75,"ingredients_count":12,"natural_ingredients":8,"additives":["E621","E150d"],"additive_alerts":[{"name":"Glutamato monosódico","code":"E621","risk":"medio","explanation":"Potenciador de sabor artificial"}],"sugar_g":12,"sodium_mg":450,"has_trans_fat":false,"ultra_processed":false,"feedback":"Evaluación en español coloquial, 1-2 oraciones.","tags":["sin_azucar","ingredientes_naturales"],"red_flags":["contiene colorantes artificiales"],"suggestions":"Alternativa más limpia concreta"}` }
    ],
  }], 2000, 'claude-sonnet-4-20250514');

  const text = response?.content?.[0]?.text ?? '{}';
  try {
    return JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch {
    return { product_name: productName ?? 'No identificado', cleanliness_score: 50, feedback: text, additives: [], additive_alerts: [], red_flags: [] };
  }
}

// === SUPPLEMENT ANALYSIS ===

export async function analyzeSupplementPhoto(
  photoBase64: string, supplementName?: string, useContext?: string,
): Promise<any> {
  const response = await callAnthropic([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photoBase64 } },
      { type: 'text', text: `Analiza esta etiqueta de suplemento. ${supplementName ? 'Suplemento: ' + supplementName : ''}
CONTEXTO DE USO: ${useContext || 'No especificado'}

REGLA CRÍTICA: Evalúa el suplemento SEGÚN SU PROPÓSITO.
SCORING DE SUPLEMENTOS:
- ¿Formas biodisponibles? (citrato/bisglicinato > óxido, metilcobalamina > cianocobalamina): 30 pts
- ¿Dosis terapéuticas adecuadas? (no subdosificado): 25 pts
- ¿Excipientes limpios? (sin dióxido de titanio, talco, colorantes): 25 pts
- ¿Ingredientes activos correctos para el propósito?: 20 pts

100 = grado clínico, formas óptimas, sin excipientes cuestionables.
90-99 = excelente, mínimas observaciones. 80-89 = bueno, alguna forma subóptima.
<70 = calidad cuestionable o ingredientes innecesarios.
Magnesio bisglicinato puro con cápsula vegetal = 95-100.

Responde SOLO con JSON válido (sin backticks ni markdown):
{"supplement_name":"nombre","quality_score":75,"form":"cápsula","active_ingredients":[{"name":"Vitamina D3","amount":"2000 IU","form":"colecalciferol","bioavailability":"alta"}],"inactive_ingredients":["estearato de magnesio","dióxido de titanio"],"red_flags":["Contiene dióxido de titanio"],"feedback":"Evaluación en español coloquial, 1-2 oraciones.","tags":["buena_biodisponibilidad","formas_optimas"],"suggestions":"Sugerencia de mejora o alternativa","daily_dose":"1 cápsula","interactions":"Precauciones relevantes si las hay, o null"}` }
    ],
  }], 2000, 'claude-sonnet-4-20250514');

  const text = response?.content?.[0]?.text ?? '{}';
  try {
    return JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch {
    return { supplement_name: supplementName ?? 'No identificado', quality_score: 50, feedback: text, active_ingredients: [], inactive_ingredients: [], red_flags: [] };
  }
}

// === COACH HELPERS ===

export async function getDailyScoresRange(userId: string, startDate: string, endDate: string): Promise<any[]> {
  const { data } = await supabase.from('daily_nutrition_scores').select('*')
    .eq('user_id', userId).gte('date', startDate).lte('date', endDate).order('date');
  return data ?? [];
}

export async function getFastingLogsRange(userId: string, startDate: string, endDate: string): Promise<FastingLog[]> {
  const { data } = await supabase.from('fasting_logs').select('*')
    .eq('user_id', userId).gte('date', startDate).lte('date', endDate).order('date');
  return data ?? [];
}

export async function updateFoodLog(logId: string, updates: Partial<FoodLog>): Promise<void> {
  const { error } = await supabase.from('food_logs').update(updates).eq('id', logId);
  if (error) throw error;
}

/** Sugerir una comida que cubra el déficit de macros del día */
export async function suggestMealForDeficit(
  clientId: string, currentTotals: { calories: number; protein: number; carbs: number; fat: number },
): Promise<string> {
  const plan = await getActivePlan(clientId).catch(() => null);
  if (!plan) return 'No hay plan activo para calcular déficit.';

  const deficit = {
    calories: (plan.calorie_target ?? 2000) - currentTotals.calories,
    protein: (plan.protein_target ?? 120) - currentTotals.protein,
    carbs: (plan.carb_target ?? 200) - currentTotals.carbs,
    fat: (plan.fat_target ?? 70) - currentTotals.fat,
  };

  const response = await callAnthropic([{
    role: 'user',
    content: `Eres nutriólogo ATP. El paciente lleva hoy: ${currentTotals.calories}kcal, ${currentTotals.protein}g prot, ${currentTotals.carbs}g carb, ${currentTotals.fat}g grasa.
Le faltan: ~${Math.max(0, deficit.calories)}kcal, ~${Math.max(0, deficit.protein)}g prot, ~${Math.max(0, deficit.carbs)}g carb, ~${Math.max(0, deficit.fat)}g grasa.
${plan.foods_to_avoid?.length ? `Evitar: ${plan.foods_to_avoid.join(', ')}` : ''}
${plan.foods_to_prioritize?.length ? `Priorizar: ${plan.foods_to_prioritize.join(', ')}` : ''}
Sugiere UNA comida concreta (alimentos y porciones) que cubra lo faltante. Sé específico. Responde en 2-3 oraciones en español coloquial.`,
  }], 500, 'claude-sonnet-4-20250514');

  return response?.content?.[0]?.text ?? 'No se pudo generar sugerencia.';
}
