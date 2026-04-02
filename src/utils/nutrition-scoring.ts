// ─────────────────────────────────────────────────────────────
// ATP Nutrition Scoring Algorithm — ELITE Performance App
// Sistema de puntuación nutricional basado en principios de
// rendimiento humano y salud metabólica
// ─────────────────────────────────────────────────────────────

export interface NutritionScore {
  total: number;
  level: string;
  color: string;
  breakdown: {
    macros: number;
    protein: number;
    fiber: number;
    density: number;
    quality: number;
    bonus: number;
    penalties: number;
  };
  details: string[];
}

// Niveles de calificación ATP
const SCORE_LEVELS = [
  { min: 90, level: 'Élite', color: '#639922' },
  { min: 75, level: 'Excelente', color: '#a8e02a' },
  { min: 60, level: 'Buena', color: '#97C459' },
  { min: 40, level: 'Regular', color: '#EF9F27' },
  { min: 20, level: 'Pobre', color: '#D85A30' },
  { min: -Infinity, level: 'Crítica', color: '#E24B4A' },
];

/**
 * Calcula el puntaje nutricional ATP para una comida.
 *
 * IMPORTANTE: Las grasas saturadas animales (mantequilla, ghee, manteca de cerdo,
 * sebo, aceite de coco) se consideran SALUDABLES y NO se penalizan.
 * Solo se penalizan grasas trans, aceites de semillas y grasas oxidadas/quemadas.
 *
 * @param calories - Calorías totales de la comida
 * @param protein_g - Gramos de proteína
 * @param carbs_g - Gramos de carbohidratos
 * @param fat_g - Gramos de grasa
 * @param fiber_g - Gramos de fibra
 * @param ingredients - Lista de ingredientes con bandera de procesado
 * @param detectedIssues - Problemas detectados en la comida
 * @returns NutritionScore con desglose completo
 */
export function scoreNutrition(
  calories: number,
  protein_g: number,
  carbs_g: number,
  fat_g: number,
  fiber_g: number,
  ingredients: { name: string; isProcessed: boolean }[],
  detectedIssues?: {
    hasFriedFood?: boolean;
    hasTransFat?: boolean;
    hasSeedOils?: boolean;
    hasSugar?: boolean;
    hasArtificialSweetener?: boolean;
  }
): NutritionScore {
  const details: string[] = [];

  // Evitar división por cero
  const totalCal = Math.max(calories, 1);

  // Calcular porcentajes de macronutrientes por calorías
  const fatCalPct = ((fat_g * 9) / totalCal) * 100;
  const proteinCalPct = ((protein_g * 4) / totalCal) * 100;
  const carbCalPct = ((carbs_g * 4) / totalCal) * 100;

  // ═══════════════════════════════════════════════════════════
  // 1. MACROS (0-35 puntos)
  // ═══════════════════════════════════════════════════════════
  let macros = 0;

  // Grasa: 50-75% de calorías = +15
  if (fatCalPct >= 50 && fatCalPct <= 75) {
    macros += 15;
    details.push('+15 Grasa en rango óptimo (50-75%)');
  } else if (fatCalPct >= 35 && fatCalPct < 50) {
    macros += 8;
    details.push('+8 Grasa aceptable (35-50%)');
  } else if (fatCalPct > 75) {
    macros += 5;
    details.push('+5 Grasa elevada (>75%)');
  } else {
    details.push('+0 Grasa baja (<35%)');
  }

  // Proteína: 20-35% de calorías = +10
  if (proteinCalPct >= 20 && proteinCalPct <= 35) {
    macros += 10;
    details.push('+10 Proteína en rango óptimo (20-35%)');
  } else if (proteinCalPct >= 15 && proteinCalPct < 20) {
    macros += 5;
    details.push('+5 Proteína aceptable (15-20%)');
  } else if (proteinCalPct > 35) {
    macros += 8;
    details.push('+8 Proteína alta (>35%)');
  } else {
    details.push('+0 Proteína insuficiente (<15%)');
  }

  // Carbohidratos: ≤25% de calorías = +10
  if (carbCalPct <= 25) {
    macros += 10;
    details.push('+10 Carbohidratos controlados (≤25%)');
  } else if (carbCalPct <= 40) {
    macros += 5;
    details.push('+5 Carbohidratos moderados (25-40%)');
  } else {
    details.push('+0 Carbohidratos elevados (>40%)');
  }

  // ═══════════════════════════════════════════════════════════
  // 2. PROTEÍNA NETA (0-15 puntos)
  // ═══════════════════════════════════════════════════════════
  let protein = 0;

  if (protein_g >= 30 && protein_g <= 60) {
    protein = 15;
    details.push('+15 Proteína neta óptima (30-60g)');
  } else if (protein_g >= 20 && protein_g < 30) {
    protein = 8;
    details.push('+8 Proteína neta aceptable (20-30g)');
  } else if (protein_g > 60) {
    protein = 12;
    details.push('+12 Proteína neta alta (>60g)');
  } else {
    protein = 3;
    details.push('+3 Proteína neta baja (<20g)');
  }

  // ═══════════════════════════════════════════════════════════
  // 3. FIBRA (0-10 puntos)
  // ═══════════════════════════════════════════════════════════
  let fiber = 0;

  if (fiber_g >= 5 && fiber_g <= 25) {
    fiber = 10;
    details.push('+10 Fibra óptima (5-25g)');
  } else if (fiber_g >= 2 && fiber_g < 5) {
    fiber = 5;
    details.push('+5 Fibra aceptable (2-5g)');
  } else if (fiber_g > 25) {
    fiber = 8;
    details.push('+8 Fibra alta (>25g)');
  } else {
    details.push('+0 Fibra insuficiente (<2g)');
  }

  // ═══════════════════════════════════════════════════════════
  // 4. DENSIDAD NUTRICIONAL (0-15 puntos)
  // ═══════════════════════════════════════════════════════════
  let density = 0;

  // Contar categorías únicas de alimentos
  const uniqueCategories = new Set<string>();
  ingredients.forEach(ing => {
    const nameLower = ing.name.toLowerCase();
    // Clasificar aproximadamente por nombre
    if (isProteinSource(nameLower)) uniqueCategories.add('proteina');
    if (isVegetableSource(nameLower)) uniqueCategories.add('vegetal');
    if (isFruitSource(nameLower)) uniqueCategories.add('fruta');
    if (isGrainSource(nameLower)) uniqueCategories.add('grano');
    if (isFatSource(nameLower)) uniqueCategories.add('grasa');
    if (isDairySource(nameLower)) uniqueCategories.add('lacteo');
  });

  if (uniqueCategories.size >= 3) {
    density += 8;
    details.push(`+8 Diversidad nutricional (${uniqueCategories.size} categorías)`);
  } else if (uniqueCategories.size === 2) {
    density += 4;
    details.push(`+4 Diversidad limitada (${uniqueCategories.size} categorías)`);
  } else {
    details.push('+0 Baja diversidad nutricional');
  }

  // ≥80% comida real (no procesada) = +7
  const totalIngredients = Math.max(ingredients.length, 1);
  const realFoodCount = ingredients.filter(i => !i.isProcessed).length;
  const realFoodPct = (realFoodCount / totalIngredients) * 100;

  if (realFoodPct >= 80) {
    density += 7;
    details.push('+7 ≥80% comida real');
  } else if (realFoodPct >= 50) {
    density += 3;
    details.push('+3 50-80% comida real');
  } else {
    details.push('+0 Mayoría procesada');
  }

  // ═══════════════════════════════════════════════════════════
  // 5. CALIDAD (0-10 puntos)
  // ═══════════════════════════════════════════════════════════
  let quality = 0;

  // Proteína limpia (+5)
  const hasCleanProtein = ingredients.some(i => {
    const n = i.name.toLowerCase();
    return (
      !i.isProcessed &&
      (isProteinSource(n))
    );
  });

  if (hasCleanProtein) {
    quality += 5;
    details.push('+5 Proteína de calidad');
  }

  // Grasa saludable (+5)
  // Nota: mantequilla, ghee, manteca, aceite de coco SON saludables
  const hasHealthyFat = ingredients.some(i => {
    const n = i.name.toLowerCase();
    return (
      n.includes('oliva') ||
      n.includes('aguacate') ||
      n.includes('avocado') ||
      n.includes('almendra') ||
      n.includes('nuez') ||
      n.includes('chia') ||
      n.includes('linaza') ||
      n.includes('coco') ||
      n.includes('mantequilla') ||
      n.includes('ghee') ||
      n.includes('salmon') ||
      n.includes('sardina') ||
      n.includes('cacahuate') ||
      n.includes('macadamia') ||
      n.includes('pepita')
    );
  });

  if (hasHealthyFat) {
    quality += 5;
    details.push('+5 Grasa saludable presente');
  }

  // ═══════════════════════════════════════════════════════════
  // 6. BONUS (0-15 puntos)
  // ═══════════════════════════════════════════════════════════
  let bonus = 0;

  // Sin azúcar añadida (+5)
  const hasSugar = detectedIssues?.hasSugar ?? false;
  if (!hasSugar) {
    bonus += 5;
    details.push('+5 Sin azúcar añadida');
  }

  // Sin procesados (+5)
  const hasProcessed = ingredients.some(i => i.isProcessed);
  if (!hasProcessed) {
    bonus += 5;
    details.push('+5 Sin alimentos procesados');
  }

  // Tiene vegetales (+5)
  const hasVegetables = ingredients.some(i => {
    const n = i.name.toLowerCase();
    return isVegetableSource(n);
  });

  if (hasVegetables) {
    bonus += 5;
    details.push('+5 Incluye vegetales');
  }

  // ═══════════════════════════════════════════════════════════
  // 7. PENALIZACIONES (negativas)
  // ═══════════════════════════════════════════════════════════
  let penalties = 0;

  // Comida frita o quemada: -15
  if (detectedIssues?.hasFriedFood) {
    penalties -= 15;
    details.push('-15 Comida frita o quemada (oxidación)');
  }

  // Grasas trans: -20
  if (detectedIssues?.hasTransFat) {
    penalties -= 20;
    details.push('-20 Grasas trans detectadas');
  }

  // Aceites de semillas (canola, soya, maíz, girasol): -10
  if (detectedIssues?.hasSeedOils) {
    penalties -= 10;
    details.push('-10 Aceites de semillas (inflamatorios)');
  }

  // Alimentos procesados: -8 a -15
  if (hasProcessed) {
    const processedCount = ingredients.filter(i => i.isProcessed).length;
    const processedPct = (processedCount / totalIngredients) * 100;
    if (processedPct > 50) {
      penalties -= 15;
      details.push('-15 Mayoría de ingredientes procesados');
    } else {
      penalties -= 8;
      details.push('-8 Contiene alimentos procesados');
    }
  }

  // Azúcar / HFCS: -12 a -15
  if (hasSugar) {
    // Verificar si hay ingredientes que sugieren mucha azúcar
    const highSugar = ingredients.some(i => {
      const n = i.name.toLowerCase();
      return (
        n.includes('refresco') ||
        n.includes('soda') ||
        n.includes('helado') ||
        n.includes('dulce') ||
        n.includes('hfcs') ||
        n.includes('jarabe')
      );
    });
    if (highSugar) {
      penalties -= 15;
      details.push('-15 Alto contenido de azúcar / HFCS');
    } else {
      penalties -= 12;
      details.push('-12 Contiene azúcar añadida');
    }
  }

  // Edulcorantes artificiales: -6 a -10
  if (detectedIssues?.hasArtificialSweetener) {
    const hasDiet = ingredients.some(i => {
      const n = i.name.toLowerCase();
      return n.includes('diet') || n.includes('light') || n.includes('zero');
    });
    if (hasDiet) {
      penalties -= 10;
      details.push('-10 Edulcorantes artificiales (producto diet/light)');
    } else {
      penalties -= 6;
      details.push('-6 Edulcorantes artificiales detectados');
    }
  }

  // Carbohidratos altos (>60%): -20
  if (carbCalPct > 60) {
    penalties -= 20;
    details.push('-20 Exceso de carbohidratos (>60% calorías)');
  }

  // ═══════════════════════════════════════════════════════════
  // PUNTAJE FINAL
  // ═══════════════════════════════════════════════════════════
  const rawTotal = macros + protein + fiber + density + quality + bonus + penalties;
  const total = Math.max(0, Math.min(100, rawTotal));

  // Determinar nivel
  const scoreLevel = SCORE_LEVELS.find(s => total >= s.min)!;

  return {
    total,
    level: scoreLevel.level,
    color: scoreLevel.color,
    breakdown: {
      macros,
      protein,
      fiber,
      density,
      quality,
      bonus,
      penalties,
    },
    details,
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers de clasificación de ingredientes
// ─────────────────────────────────────────────────────────────

function isProteinSource(name: string): boolean {
  return (
    name.includes('pollo') ||
    name.includes('chicken') ||
    name.includes('res') ||
    name.includes('beef') ||
    name.includes('salmon') ||
    name.includes('atun') ||
    name.includes('tuna') ||
    name.includes('huevo') ||
    name.includes('egg') ||
    name.includes('cerdo') ||
    name.includes('pork') ||
    name.includes('pavo') ||
    name.includes('turkey') ||
    name.includes('camaron') ||
    name.includes('sardina') ||
    name.includes('tilapia') ||
    name.includes('mojarra') ||
    name.includes('pulpo') ||
    name.includes('machaca') ||
    name.includes('whey') ||
    name.includes('barbacoa') ||
    name.includes('carnitas') ||
    name.includes('arrachera') ||
    name.includes('bistec') ||
    name.includes('higado') ||
    name.includes('proteina')
  );
}

function isVegetableSource(name: string): boolean {
  return (
    name.includes('espinaca') ||
    name.includes('brocoli') ||
    name.includes('nopal') ||
    name.includes('chayote') ||
    name.includes('calabaza') ||
    name.includes('tomate') ||
    name.includes('jitomate') ||
    name.includes('cebolla') ||
    name.includes('pimiento') ||
    name.includes('lechuga') ||
    name.includes('kale') ||
    name.includes('coliflor') ||
    name.includes('pepino') ||
    name.includes('zanahoria') ||
    name.includes('ejote') ||
    name.includes('champinon') ||
    name.includes('hongo') ||
    name.includes('chile') ||
    name.includes('quelite') ||
    name.includes('verdolaga') ||
    name.includes('rabano') ||
    name.includes('betabel') ||
    name.includes('acelga') ||
    name.includes('vegetal') ||
    name.includes('ensalada')
  );
}

function isFruitSource(name: string): boolean {
  return (
    name.includes('aguacate') ||
    name.includes('platano') ||
    name.includes('manzana') ||
    name.includes('fresa') ||
    name.includes('arandano') ||
    name.includes('mango') ||
    name.includes('papaya') ||
    name.includes('guayaba') ||
    name.includes('pina') ||
    name.includes('naranja') ||
    name.includes('mandarina') ||
    name.includes('sandia') ||
    name.includes('melon') ||
    name.includes('jicama') ||
    name.includes('tuna') ||
    name.includes('limon') ||
    name.includes('zarzamora') ||
    name.includes('fruta')
  );
}

function isGrainSource(name: string): boolean {
  return (
    name.includes('arroz') ||
    name.includes('frijol') ||
    name.includes('lenteja') ||
    name.includes('avena') ||
    name.includes('quinoa') ||
    name.includes('camote') ||
    name.includes('papa') ||
    name.includes('tortilla') ||
    name.includes('elote') ||
    name.includes('garbanzo') ||
    name.includes('chicharo') ||
    name.includes('amaranto') ||
    name.includes('pan') ||
    name.includes('cereal') ||
    name.includes('grano')
  );
}

function isFatSource(name: string): boolean {
  return (
    name.includes('aceite') ||
    name.includes('oliva') ||
    name.includes('coco') ||
    name.includes('almendra') ||
    name.includes('nuez') ||
    name.includes('cacahuate') ||
    name.includes('mantequilla') ||
    name.includes('ghee') ||
    name.includes('pepita') ||
    name.includes('chia') ||
    name.includes('linaza') ||
    name.includes('macadamia') ||
    name.includes('grasa')
  );
}

function isDairySource(name: string): boolean {
  return (
    name.includes('yogur') ||
    name.includes('queso') ||
    name.includes('leche') ||
    name.includes('cottage') ||
    name.includes('requeson') ||
    name.includes('crema') ||
    name.includes('panela') ||
    name.includes('oaxaca') ||
    name.includes('chihuahua') ||
    name.includes('lacteo')
  );
}

// ─────────────────────────────────────────────────────────────
// Detectar aceites de semillas en ingredientes
// ─────────────────────────────────────────────────────────────
export function detectSeedOils(ingredientNames: string[]): boolean {
  const seedOilKeywords = [
    'canola', 'soya', 'soy', 'maiz', 'corn oil',
    'girasol', 'sunflower', 'cartamo', 'safflower',
    'vegetal', 'vegetable oil', 'margarina', 'margarine',
  ];
  return ingredientNames.some(name => {
    const n = name.toLowerCase();
    return seedOilKeywords.some(keyword => n.includes(keyword));
  });
}

// ─────────────────────────────────────────────────────────────
// Obtener color y emoji del nivel de puntaje
// ─────────────────────────────────────────────────────────────
export function getScoreDisplay(score: number): { level: string; color: string } {
  const scoreLevel = SCORE_LEVELS.find(s => score >= s.min)!;
  return { level: scoreLevel.level, color: scoreLevel.color };
}
