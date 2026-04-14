/**
 * Validación post-IA — Detecta errores comunes en estimaciones de macros.
 *
 * Verifica consistencia calorías vs macros, rangos razonables,
 * y errores frecuentes (ej: huevos con demasiada proteína).
 */

interface AutoFix {
  field: string;
  original: number;
  fixed: number;
  reason: string;
}

export interface ValidationResult {
  warnings: string[];
  autoFixes: AutoFix[];
}

export function validateFoodEstimate(food: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items?: { name?: string; protein_g?: number; quantity?: number }[];
}): ValidationResult {
  const warnings: string[] = [];
  const autoFixes: AutoFix[] = [];

  // 1. Macro consistency: calorías ≈ P×4 + C×4 + G×9
  const calculatedCal = (food.protein_g * 4) + (food.carbs_g * 4) + (food.fat_g * 9);
  if (calculatedCal > 0) {
    const calDiff = Math.abs(food.calories - calculatedCal);
    if (calDiff > calculatedCal * 0.25 && calDiff > 50) {
      warnings.push(`Calorías (${Math.round(food.calories)}) no cuadran con macros (${Math.round(calculatedCal)} calculadas).`);
      autoFixes.push({
        field: 'calories',
        original: food.calories,
        fixed: Math.round(calculatedCal),
        reason: 'P×4 + C×4 + G×9',
      });
    }
  }

  // 2. Proteína por comida > 80g es sospechoso
  if (food.protein_g > 80) {
    warnings.push(`${Math.round(food.protein_g)}g de proteína es inusualmente alto para una comida.`);
  }

  // 3. Calorías > 1500 por comida
  if (food.calories > 1500) {
    warnings.push(`${Math.round(food.calories)} kcal es muy alto para una comida individual.`);
  }

  // 4. Grasa > 80g por comida
  if (food.fat_g > 80) {
    warnings.push(`${Math.round(food.fat_g)}g de grasa es inusualmente alto.`);
  }

  // 5. Validar ingredientes individuales
  if (food.items) {
    for (const item of food.items) {
      const name = (item.name ?? '').toLowerCase();
      const protein = item.protein_g ?? 0;
      const qty = item.quantity ?? 1;

      // Huevos: ~6.3g proteína c/u
      if ((name.includes('huevo') || name.includes('egg')) && protein > qty * 8) {
        warnings.push(`${item.name}: ${Math.round(protein)}g prot parece alto. Un huevo ≈ 6g.`);
        autoFixes.push({
          field: `item_protein_${name}`,
          original: protein,
          fixed: Math.round(qty * 6.3),
          reason: `${qty} huevo(s) × 6.3g`,
        });
      }

      // Pechuga: ~25g prot por 100g
      if (name.includes('pechuga') && protein > qty * 60) {
        warnings.push(`${item.name}: ${Math.round(protein)}g prot parece alto.`);
      }
    }
  }

  return { warnings, autoFixes };
}
