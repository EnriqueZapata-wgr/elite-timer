/**
 * Food Log Service — guardado ÚNICO de comidas (MB-8 · Track A).
 *
 * Antes había 4 escrituras divergentes a `food_logs` (food-scan vía logFood,
 * food-text, food-register frecuentes y my-recipes con inserts propios), cada
 * una con su propia forma de `notes` y NINGUNA escribiendo las columnas reales
 * `source` / `was_edited` (existen desde migración y quedaban en default).
 *
 * Reglas:
 *  - `source` y `was_edited` van en SUS columnas; `notes` queda solo para
 *    extras estructurados con una única forma: {fiber_g?, quality_score?,
 *    items?, recipe_id?}. Lectores existentes (nutrition-score-service lee
 *    notes.quality_score) siguen funcionando — la forma es compatible.
 *  - supabase-js no lanza en 4xx: aquí SIEMPRE se chequea `{ error }`, se
 *    loguea y se devuelve resultado tipado. El caller decide el copy.
 *  - Regla #6 CLAUDE.md: emite 'day_changed' tras mutar (los callers ya no
 *    lo emiten por su cuenta).
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { warn as logWarn } from '@/src/lib/logger';

/** Entrada por la que se registró la comida (columna food_logs.source). */
export type FoodLogSource =
  | 'scan_photo'   // food-scan con foto + IA
  | 'scan_text'    // food-scan con texto + IA
  | 'scan_raw'     // food-scan "guardar sin analizar"
  | 'manual_text'  // food-text (builder manual / IA)
  | 'frequent'     // food-register frecuentes de 1 toque
  | 'recipe'       // my-recipes
  | 'barcode'      // food-barcode (código de barras, MB-28B)
  | 'manual';      // fallback histórico (default de la columna)

/** Extras estructurados que viven en notes (JSON, forma única). */
export interface FoodLogExtras {
  fiber_g?: number;
  quality_score?: number;
  items?: any[];
  recipe_id?: string;
}

export interface SaveFoodLogInput {
  /** Si no viene, se resuelve de la sesión (mismo contrato que logFood). */
  userId?: string;
  mealType: string;
  description: string;
  source: FoodLogSource;
  wasEdited?: boolean;
  /** Default: hoy (getLocalToday). */
  date?: string;
  /** HH:MM o HH:MM:SS. */
  mealTime?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  hungerLevel?: number | null;
  photoUrl?: string | null;
  aiAnalysis?: any | null;
  extras?: FoodLogExtras;
}

export type SaveFoodLogResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

async function resolveUserId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function saveFoodLog(input: SaveFoodLogInput): Promise<SaveFoodLogResult> {
  const userId = await resolveUserId(input.userId);
  if (!userId) return { ok: false, message: 'Sesión expirada' };

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: userId,
      date: input.date ?? getLocalToday(),
      meal_type: input.mealType,
      meal_time: input.mealTime ?? null,
      // description es NOT NULL en el esquema real.
      description: input.description?.trim() || 'Sin descripción',
      photo_url: input.photoUrl ?? null,
      ai_analysis: input.aiAnalysis ?? null,
      calories: input.calories ?? null,
      protein_g: input.proteinG ?? null,
      carbs_g: input.carbsG ?? null,
      fat_g: input.fatG ?? null,
      hunger_level: input.hungerLevel ?? null,
      source: input.source,
      was_edited: input.wasEdited ?? false,
      notes: input.extras ? JSON.stringify(input.extras) : null,
    })
    .select('id')
    .single();

  if (error) {
    logWarn('[food-log] insert failed:', error.message);
    return { ok: false, message: error.message };
  }
  DeviceEventEmitter.emit('day_changed');
  return { ok: true, id: (data as { id: string }).id };
}

/** Borrado verificado (mismo criterio que fasting-service: 0 filas ≠ éxito). */
export async function deleteFoodLogChecked(logId: string): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', logId)
    .select('id');
  if (error) {
    logWarn('[food-log] delete failed:', error.message);
    return { ok: false, message: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: 'Row not found or RLS blocked' };
  }
  DeviceEventEmitter.emit('day_changed');
  return { ok: true };
}
