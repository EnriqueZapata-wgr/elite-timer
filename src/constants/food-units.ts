/**
 * Equivalencias de alimentos — unidades naturales para comida mexicana/latina.
 *
 * Permite mostrar "4 pzas" en vez de "240g" para huevos,
 * "1 cdas" en vez de "14g" para aceite, etc.
 */

export type FoodUnit = 'g' | 'ml' | 'pzas' | 'cdas' | 'tazas' | 'rebanadas' | 'latas';

interface FoodEquiv {
  naturalUnit: FoodUnit;
  gramsPerUnit: number;
  defaultQuantity: number;
}

export const FOOD_EQUIVALENCES: Record<string, FoodEquiv> = {
  // Proteínas
  'huevo': { naturalUnit: 'pzas', gramsPerUnit: 60, defaultQuantity: 1 },
  'huevos': { naturalUnit: 'pzas', gramsPerUnit: 60, defaultQuantity: 2 },
  'pechuga de pollo': { naturalUnit: 'pzas', gramsPerUnit: 200, defaultQuantity: 1 },
  'pechuga': { naturalUnit: 'pzas', gramsPerUnit: 200, defaultQuantity: 1 },
  'muslo de pollo': { naturalUnit: 'pzas', gramsPerUnit: 150, defaultQuantity: 1 },
  'bistec': { naturalUnit: 'pzas', gramsPerUnit: 150, defaultQuantity: 1 },
  'sardina': { naturalUnit: 'latas', gramsPerUnit: 120, defaultQuantity: 1 },
  'atún': { naturalUnit: 'latas', gramsPerUnit: 140, defaultQuantity: 1 },

  // Lácteos
  'queso': { naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 30 },
  'queso de cabra': { naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 30 },
  'queso manchego': { naturalUnit: 'rebanadas', gramsPerUnit: 25, defaultQuantity: 2 },
  'leche': { naturalUnit: 'ml', gramsPerUnit: 1, defaultQuantity: 250 },
  'yogurt': { naturalUnit: 'ml', gramsPerUnit: 1, defaultQuantity: 200 },

  // Frutas
  'aguacate': { naturalUnit: 'pzas', gramsPerUnit: 150, defaultQuantity: 0.5 },
  'plátano': { naturalUnit: 'pzas', gramsPerUnit: 120, defaultQuantity: 1 },
  'manzana': { naturalUnit: 'pzas', gramsPerUnit: 180, defaultQuantity: 1 },
  'naranja': { naturalUnit: 'pzas', gramsPerUnit: 200, defaultQuantity: 1 },
  'limón': { naturalUnit: 'pzas', gramsPerUnit: 40, defaultQuantity: 1 },

  // Verduras
  'espinacas': { naturalUnit: 'tazas', gramsPerUnit: 30, defaultQuantity: 2 },
  'tomate': { naturalUnit: 'pzas', gramsPerUnit: 150, defaultQuantity: 1 },
  'cebolla': { naturalUnit: 'pzas', gramsPerUnit: 110, defaultQuantity: 0.5 },
  'nopal': { naturalUnit: 'pzas', gramsPerUnit: 86, defaultQuantity: 2 },
  'chayote': { naturalUnit: 'pzas', gramsPerUnit: 200, defaultQuantity: 1 },
  'calabaza': { naturalUnit: 'pzas', gramsPerUnit: 180, defaultQuantity: 1 },

  // Grasas
  'aceite de oliva': { naturalUnit: 'cdas', gramsPerUnit: 14, defaultQuantity: 1 },
  'aceite': { naturalUnit: 'cdas', gramsPerUnit: 14, defaultQuantity: 1 },
  'mantequilla': { naturalUnit: 'cdas', gramsPerUnit: 14, defaultQuantity: 1 },
  'almendras': { naturalUnit: 'pzas', gramsPerUnit: 1.2, defaultQuantity: 20 },
  'nueces': { naturalUnit: 'pzas', gramsPerUnit: 5, defaultQuantity: 6 },

  // Tortillas y pan
  'tortilla': { naturalUnit: 'pzas', gramsPerUnit: 30, defaultQuantity: 2 },
  'tortilla de maíz': { naturalUnit: 'pzas', gramsPerUnit: 30, defaultQuantity: 2 },
  'tortilla de harina': { naturalUnit: 'pzas', gramsPerUnit: 45, defaultQuantity: 1 },
  'pan': { naturalUnit: 'rebanadas', gramsPerUnit: 30, defaultQuantity: 2 },

  // Bebidas
  'café': { naturalUnit: 'tazas', gramsPerUnit: 240, defaultQuantity: 1 },
  'agua': { naturalUnit: 'ml', gramsPerUnit: 1, defaultQuantity: 250 },
  'jugo': { naturalUnit: 'ml', gramsPerUnit: 1, defaultQuantity: 250 },

  // Cereales/Granos
  'arroz': { naturalUnit: 'tazas', gramsPerUnit: 185, defaultQuantity: 0.5 },
  'avena': { naturalUnit: 'tazas', gramsPerUnit: 80, defaultQuantity: 0.5 },
  'frijoles': { naturalUnit: 'tazas', gramsPerUnit: 170, defaultQuantity: 0.5 },
};

/** Buscar equivalencia por nombre (fuzzy match) */
export function findEquivalence(name: string): FoodEquiv | null {
  const lower = name.toLowerCase().trim();
  if (FOOD_EQUIVALENCES[lower]) return FOOD_EQUIVALENCES[lower];
  for (const [key, value] of Object.entries(FOOD_EQUIVALENCES)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return null;
}

/** Ciclo de unidades para el botón de cambiar */
export const UNIT_CYCLE: Record<string, FoodUnit> = {
  g: 'ml', ml: 'pzas', pzas: 'cdas', cdas: 'tazas',
  tazas: 'rebanadas', rebanadas: 'latas', latas: 'g',
};
