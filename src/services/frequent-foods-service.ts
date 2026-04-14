/**
 * Frequent Foods Service — Actualiza la tabla user_frequent_foods al guardar.
 *
 * Cada vez que se guarda un food_log, se hace upsert del alimento
 * en frecuentes para quick-add futuro.
 */
import { supabase } from '@/src/lib/supabase';

export async function updateFrequentFood(
  userId: string,
  mealType: string,
  foodData: {
    description?: string;
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    items?: any[];
  },
) {
  const foodName = (foodData.description || 'Sin nombre').slice(0, 100);
  if (!foodName.trim()) return;

  try {
    // Intentar upsert
    const { error } = await supabase.from('user_frequent_foods').upsert({
      user_id: userId,
      meal_type: mealType,
      food_name: foodName,
      description: foodData.description,
      calories: foodData.calories ?? null,
      protein_g: foodData.protein_g ?? null,
      carbs_g: foodData.carbs_g ?? null,
      fat_g: foodData.fat_g ?? null,
      items: foodData.items ?? [],
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'user_id,meal_type,food_name' });

    if (error) return; // tabla puede no existir aún

    // Incrementar times_used
    const { data: existing } = await supabase
      .from('user_frequent_foods')
      .select('times_used')
      .eq('user_id', userId)
      .eq('meal_type', mealType)
      .eq('food_name', foodName)
      .maybeSingle();

    if (existing) {
      await supabase.from('user_frequent_foods')
        .update({ times_used: (existing.times_used || 0) + 1 })
        .eq('user_id', userId)
        .eq('meal_type', mealType)
        .eq('food_name', foodName);
    }
  } catch {
    // Silenciar — frecuentes es secundario
  }
}
