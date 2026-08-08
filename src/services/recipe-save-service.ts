/**
 * recipe-save-service — guardar lo que acabas de registrar como receta
 * (MB-28B · Pieza 2).
 *
 * La promesa del registro ("guarda tus comidas como recetas y reúsalas al
 * registrar") estaba a la mitad: registrar DESDE una receta existía
 * (my-recipes → saveFoodLog), pero guardar una comida registrada COMO receta
 * no existía en ningún lado — solo el alta manual tecleando macros. Este
 * servicio cierra esa mitad, con una sola forma de fila (la misma que
 * my-recipes y argos-recipes escriben en user_recipes).
 *
 * supabase-js no lanza en 4xx: aquí SIEMPRE se chequea { error } y se
 * devuelve resultado tipado. Dedupe por nombre normalizado: comer lo mismo
 * tres veces no debe crear tres recetas iguales.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';

export interface MealAsRecipeInput {
  name: string;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  mealType?: string | null;
  /** Forma de user_recipes.ingredients: [{name, quantity}] (lista-compra la lee). */
  ingredients?: { name: string; quantity?: string }[];
}

export type SaveRecipeResult =
  | { status: 'created' }
  | { status: 'duplicate'; existingName: string }
  | { status: 'error'; message: string };

/** Nombre → llave de dedupe: sin acentos, minúsculas, espacios colapsados. */
export function recipeNameKey(name: string): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Items del registro (ReviewItem de las pantallas, o ingredients de
 * ai_analysis) → la forma de user_recipes.ingredients. Pura, para tests.
 */
export function logItemsToIngredients(items: unknown): { name: string; quantity?: string }[] {
  if (!Array.isArray(items)) return [];
  const out: { name: string; quantity?: string }[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const name = String(o.name ?? o.food ?? '').trim();
    if (!name) continue;
    // ReviewItem: {quantity: number, unit: string} · IA: {portion: "100g"}.
    let quantity: string | undefined;
    if (o.quantity != null && o.unit != null) quantity = `${o.quantity} ${o.unit}`.trim();
    else if (o.quantity != null) quantity = String(o.quantity).trim();
    else if (typeof o.portion === 'string' && o.portion.trim()) quantity = o.portion.trim();
    out.push(quantity ? { name, quantity } : { name });
  }
  return out;
}

/**
 * Guarda una comida registrada como receta reutilizable. Si ya existe una
 * receta con el mismo nombre (normalizado), NO crea duplicado.
 */
export async function saveMealAsRecipe(
  userId: string,
  input: MealAsRecipeInput,
): Promise<SaveRecipeResult> {
  const name = input.name?.trim();
  if (!name) return { status: 'error', message: 'Receta sin nombre' };

  const { data: existing, error: readError } = await supabase
    .from('user_recipes')
    .select('id, name')
    .eq('user_id', userId);
  if (readError) {
    logWarn('[recipe-save] read failed:', readError.message);
    return { status: 'error', message: readError.message };
  }

  const key = recipeNameKey(name);
  const dup = (existing ?? []).find((r: { name: string }) => recipeNameKey(r.name) === key);
  if (dup) return { status: 'duplicate', existingName: dup.name };

  const { error } = await supabase.from('user_recipes').insert({
    user_id: userId,
    name,
    total_calories: Math.round(input.calories ?? 0) || 0,
    total_protein: input.proteinG ?? 0,
    total_carbs: input.carbsG ?? 0,
    total_fat: input.fatG ?? 0,
    meal_type: input.mealType ?? null,
    ingredients: input.ingredients ?? [],
  });
  if (error) {
    logWarn('[recipe-save] insert failed:', error.message);
    return { status: 'error', message: error.message };
  }
  return { status: 'created' };
}

export interface RecentLogForRecipe {
  id: string;
  description: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  mealType: string | null;
  date: string;
  ingredients: { name: string; quantity?: string }[];
}

/**
 * Los registros recientes, deduplicados por descripción, para convertirlos en
 * receta con un toque desde Mis Recetas ("comes algo dos veces y a la tercera
 * ya no lo quieres teclear"). Los items salen de notes.items (camino manual)
 * o de ai_analysis.ingredients (caminos con IA); sin items la receta nace
 * solo con macros, igual que el alta manual.
 */
export async function fetchRecentLogsForRecipe(
  userId: string,
  limit = 20,
): Promise<{ ok: true; logs: RecentLogForRecipe[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('id, description, calories, protein_g, carbs_g, fat_g, meal_type, date, notes, ai_analysis')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(60);
  if (error) {
    logWarn('[recipe-save] recent logs failed:', error.message);
    return { ok: false, message: error.message };
  }

  const seen = new Set<string>();
  const logs: RecentLogForRecipe[] = [];
  for (const row of (data ?? []) as any[]) {
    const description = String(row.description ?? '').trim();
    if (!description || description === 'Sin descripción') continue;
    const key = recipeNameKey(description);
    if (seen.has(key)) continue;
    seen.add(key);

    let notesItems: unknown = null;
    if (typeof row.notes === 'string' && row.notes.trim().startsWith('{')) {
      try { notesItems = JSON.parse(row.notes)?.items ?? null; } catch { /* notes libre */ }
    }
    const ingredients = logItemsToIngredients(notesItems ?? row.ai_analysis?.ingredients);

    logs.push({
      id: String(row.id),
      description,
      calories: row.calories ?? null,
      proteinG: row.protein_g ?? null,
      carbsG: row.carbs_g ?? null,
      fatG: row.fat_g ?? null,
      mealType: row.meal_type ?? null,
      date: String(row.date ?? ''),
      ingredients,
    });
    if (logs.length >= limit) break;
  }
  return { ok: true, logs };
}
