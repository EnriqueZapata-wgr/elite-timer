/**
 * Validación post-IA — Detecta y CORRIGE errores en estimaciones de macros.
 *
 * Dos funciones:
 * - validateFoodEstimate: solo detecta (para UI warnings)
 * - validateAndFixFoodEstimate: detecta Y corrige (para pipeline pre-save)
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

/** Validación ligera — solo detecta, no corrige */
export function validateFoodEstimate(food: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items?: { name?: string; protein_g?: number; quantity?: number; grams?: number }[];
}): ValidationResult {
  const warnings: string[] = [];
  const autoFixes: AutoFix[] = [];

  // 1. Macro consistency
  const calculatedCal = (food.protein_g * 4) + (food.carbs_g * 4) + (food.fat_g * 9);
  if (calculatedCal > 0) {
    const calDiff = Math.abs(food.calories - calculatedCal);
    if (calDiff > calculatedCal * 0.25 && calDiff > 50) {
      warnings.push(`Calorías (${Math.round(food.calories)}) no cuadran con macros (${Math.round(calculatedCal)} calculadas).`);
      autoFixes.push({ field: 'calories', original: food.calories, fixed: Math.round(calculatedCal), reason: 'P×4 + C×4 + G×9' });
    }
  }

  // 2. Peso total estimado vs macros
  const estimatedWeight = (food.items || []).reduce((s: number, i: any) => s + (i.grams || i.quantity_g || 100), 0) || 300;
  const totalMacros = food.protein_g + food.fat_g + food.carbs_g;
  if (totalMacros > estimatedWeight) {
    warnings.push(`Macros (${Math.round(totalMacros)}g) superan el peso del alimento (~${estimatedWeight}g). Probablemente la IA usó el peso como macro.`);
  }

  // 3. Proteína absurda
  if (food.protein_g > estimatedWeight * 0.4) {
    warnings.push(`${Math.round(food.protein_g)}g de proteína es imposible para ~${estimatedWeight}g de alimento (máx ~25-30%).`);
  }

  // 4. Calorías muy altas
  if (food.calories > 3000) {
    warnings.push(`${Math.round(food.calories)} kcal es extremadamente alto.`);
  }

  return { warnings, autoFixes };
}

/** Validación DURA — detecta Y auto-corrige resultados absurdos */
export function validateAndFixFoodEstimate(food: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items?: any[];
}): { fixed: typeof food; warnings: string[]; wasFixed: boolean } {
  const warnings: string[] = [];
  let wasFixed = false;
  const fixed = { ...food };

  // Estimar peso total del plato
  const estimatedWeight = (fixed.items || []).reduce((s: number, i: any) => s + (i.grams || i.quantity_g || 100), 0) || 300;

  // REGLA 1: Proteína > 40% del peso → la IA confundió peso con macro
  if (fixed.protein_g > estimatedWeight * 0.4) {
    const corrected = Math.round(estimatedWeight * 0.25);
    warnings.push(`Proteína corregida: ${Math.round(fixed.protein_g)}g → ${corrected}g (era ${Math.round(fixed.protein_g / estimatedWeight * 100)}% del peso)`);
    fixed.protein_g = corrected;
    wasFixed = true;
  }

  // REGLA 2: Grasa > 50% del peso
  if (fixed.fat_g > estimatedWeight * 0.5) {
    const corrected = Math.round(estimatedWeight * 0.20);
    warnings.push(`Grasa corregida: ${Math.round(fixed.fat_g)}g → ${corrected}g`);
    fixed.fat_g = corrected;
    wasFixed = true;
  }

  // REGLA 3: Carbos > 80% del peso
  if (fixed.carbs_g > estimatedWeight * 0.8) {
    const corrected = Math.round(estimatedWeight * 0.30);
    warnings.push(`Carbos corregidos: ${Math.round(fixed.carbs_g)}g → ${corrected}g`);
    fixed.carbs_g = corrected;
    wasFixed = true;
  }

  // REGLA 4: Total macros > peso total → escalar proporcionalmente
  const totalMacros = fixed.protein_g + fixed.fat_g + fixed.carbs_g;
  if (totalMacros > estimatedWeight) {
    const scale = (estimatedWeight * 0.6) / totalMacros;
    fixed.protein_g = Math.round(fixed.protein_g * scale);
    fixed.fat_g = Math.round(fixed.fat_g * scale);
    fixed.carbs_g = Math.round(fixed.carbs_g * scale);
    warnings.push(`Macros (${Math.round(totalMacros)}g) excedían peso (~${estimatedWeight}g). Escalados.`);
    wasFixed = true;
  }

  // REGLA 5: Corregir items individuales con el mismo bug
  if (fixed.items) {
    for (const item of fixed.items) {
      const grams = item.grams || item.quantity_g || 100;
      const prot = item.protein ?? item.protein_g ?? 0;
      if (prot > grams * 0.4) {
        const corrected = Math.round(grams * 0.25);
        warnings.push(`${item.name}: prot ${Math.round(prot)}g → ${corrected}g`);
        item.protein = corrected;
        item.protein_g = corrected;
        wasFixed = true;
      }
      const fat = item.fat ?? item.fat_g ?? 0;
      if (fat > grams * 0.5) {
        const corrected = Math.round(grams * 0.20);
        item.fat = corrected;
        item.fat_g = corrected;
        wasFixed = true;
      }
    }
  }

  // REGLA 6: Siempre recalcular calorías desde macros
  fixed.calories = Math.round((fixed.protein_g * 4) + (fixed.carbs_g * 4) + (fixed.fat_g * 9));

  return { fixed, warnings, wasFixed };
}
