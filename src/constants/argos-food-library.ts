/**
 * ARGOS Food Library — Biblioteca unificada de alimentos con macros + unidades naturales.
 *
 * Combina datos nutricionales por 100g con equivalencias de unidades naturales.
 * Usada por: AI prompt, validación post-IA, y UI de registro manual.
 */

import type { FoodUnit } from './food-units';

// === TIPOS ===

export interface ArgosFood {
  /** Nombres por los que se puede buscar (español + inglés) */
  names: string[];
  /** Categoría del alimento */
  category: 'proteina' | 'vegetal' | 'fruta' | 'grano' | 'grasa' | 'lacteo' | 'procesado' | 'bebida';
  /** Macros por 100g */
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  /** Unidad natural para mostrar al usuario */
  naturalUnit: FoodUnit;
  /** Peso en gramos de una unidad natural */
  gramsPerUnit: number;
  /** Cantidad default al agregar */
  defaultQuantity: number;
  /** Porción legible */
  portionLabel: string;
}

// === BIBLIOTECA ===

export const ARGOS_LIBRARY: ArgosFood[] = [
  // ── PROTEÍNAS ──
  { names: ['huevo', 'huevos', 'egg', 'huevo entero'], category: 'proteina',
    per100g: { calories: 155, protein: 13, carbs: 1, fat: 11 },
    naturalUnit: 'pzas', gramsPerUnit: 60, defaultQuantity: 2, portionLabel: '1 pieza (60g)' },
  { names: ['clara de huevo', 'claras', 'egg white'], category: 'proteina',
    per100g: { calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
    naturalUnit: 'pzas', gramsPerUnit: 33, defaultQuantity: 3, portionLabel: '3 claras (100g)' },
  { names: ['pechuga de pollo', 'pechuga', 'chicken breast'], category: 'proteina',
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 200, portionLabel: '1 pieza (~200g)' },
  { names: ['muslo de pollo', 'chicken thigh'], category: 'proteina',
    per100g: { calories: 209, protein: 26, carbs: 0, fat: 11 },
    naturalUnit: 'pzas', gramsPerUnit: 150, defaultQuantity: 1, portionLabel: '1 pieza (150g)' },
  { names: ['carne molida', 'ground beef', 'carne de res molida'], category: 'proteina',
    per100g: { calories: 290, protein: 26, carbs: 0, fat: 20 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 150, portionLabel: '~150g' },
  { names: ['bistec', 'steak', 'res'], category: 'proteina',
    per100g: { calories: 271, protein: 26, carbs: 0, fat: 18 },
    naturalUnit: 'pzas', gramsPerUnit: 150, defaultQuantity: 1, portionLabel: '1 pieza (150g)' },
  { names: ['salmón', 'salmon'], category: 'proteina',
    per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 150, portionLabel: '1 filete (~150g)' },
  { names: ['atún', 'tuna', 'atún en lata'], category: 'proteina',
    per100g: { calories: 130, protein: 30, carbs: 0, fat: 1 },
    naturalUnit: 'latas', gramsPerUnit: 140, defaultQuantity: 1, portionLabel: '1 lata (140g)' },
  { names: ['sardina', 'sardinas', 'sardines'], category: 'proteina',
    per100g: { calories: 208, protein: 25, carbs: 0, fat: 11 },
    naturalUnit: 'latas', gramsPerUnit: 90, defaultQuantity: 1, portionLabel: '1 lata (90g)' },
  { names: ['camarón', 'camarones', 'shrimp'], category: 'proteina',
    per100g: { calories: 99, protein: 24, carbs: 0, fat: 0.3 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 150, portionLabel: '~150g' },
  { names: ['tocino', 'bacon'], category: 'proteina',
    per100g: { calories: 541, protein: 37, carbs: 1, fat: 42 },
    naturalUnit: 'rebanadas', gramsPerUnit: 10, defaultQuantity: 3, portionLabel: '3 tiras (30g)' },
  { names: ['jamón', 'ham', 'jamón de pavo'], category: 'proteina',
    per100g: { calories: 145, protein: 21, carbs: 1, fat: 6 },
    naturalUnit: 'rebanadas', gramsPerUnit: 25, defaultQuantity: 3, portionLabel: '3 rebanadas (75g)' },
  { names: ['proteína whey', 'whey', 'proteina en polvo', 'protein powder'], category: 'proteina',
    per100g: { calories: 400, protein: 80, carbs: 8, fat: 4 },
    naturalUnit: 'cdas', gramsPerUnit: 30, defaultQuantity: 1, portionLabel: '1 scoop (30g)' },

  // ── LÁCTEOS ──
  { names: ['leche', 'leche entera', 'milk'], category: 'lacteo',
    per100g: { calories: 62, protein: 3.3, carbs: 5, fat: 3.3 },
    naturalUnit: 'ml', gramsPerUnit: 1, defaultQuantity: 240, portionLabel: '1 vaso (240ml)' },
  { names: ['yogurt', 'yogurt griego', 'greek yogurt'], category: 'lacteo',
    per100g: { calories: 97, protein: 9, carbs: 4, fat: 5 },
    naturalUnit: 'ml', gramsPerUnit: 1, defaultQuantity: 200, portionLabel: '1 porción (200g)' },
  { names: ['queso', 'cheese'], category: 'lacteo',
    per100g: { calories: 402, protein: 25, carbs: 1, fat: 33 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 30, portionLabel: '~30g' },
  { names: ['queso manchego', 'manchego'], category: 'lacteo',
    per100g: { calories: 380, protein: 24, carbs: 0, fat: 32 },
    naturalUnit: 'rebanadas', gramsPerUnit: 25, defaultQuantity: 2, portionLabel: '2 rebanadas (50g)' },
  { names: ['queso cottage', 'cottage cheese'], category: 'lacteo',
    per100g: { calories: 98, protein: 11, carbs: 3, fat: 4 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 100, portionLabel: '~100g' },
  { names: ['queso de cabra', 'goat cheese'], category: 'lacteo',
    per100g: { calories: 364, protein: 22, carbs: 0, fat: 30 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 30, portionLabel: '~30g' },
  { names: ['crema', 'crema ácida', 'sour cream'], category: 'lacteo',
    per100g: { calories: 193, protein: 2, carbs: 4, fat: 19 },
    naturalUnit: 'cdas', gramsPerUnit: 15, defaultQuantity: 2, portionLabel: '2 cdas (30g)' },

  // ── GRANOS Y CEREALES ──
  { names: ['arroz', 'arroz blanco', 'rice', 'arroz cocido'], category: 'grano',
    per100g: { calories: 130, protein: 2.5, carbs: 28, fat: 0.3 },
    naturalUnit: 'tazas', gramsPerUnit: 185, defaultQuantity: 0.5, portionLabel: '1/2 taza cocido' },
  { names: ['avena', 'oats', 'oatmeal', 'avena en hojuelas'], category: 'grano',
    per100g: { calories: 389, protein: 13, carbs: 68, fat: 7 },
    naturalUnit: 'tazas', gramsPerUnit: 80, defaultQuantity: 0.5, portionLabel: '1/2 taza seca (40g)' },
  { names: ['frijoles', 'frijol', 'beans', 'frijoles cocidos'], category: 'grano',
    per100g: { calories: 130, protein: 9, carbs: 23, fat: 0.5 },
    naturalUnit: 'tazas', gramsPerUnit: 170, defaultQuantity: 0.5, portionLabel: '1/2 taza' },
  { names: ['tortilla', 'tortilla de maíz', 'corn tortilla'], category: 'grano',
    per100g: { calories: 218, protein: 5, carbs: 44, fat: 2.3 },
    naturalUnit: 'pzas', gramsPerUnit: 30, defaultQuantity: 3, portionLabel: '3 piezas (90g)' },
  { names: ['tortilla de harina', 'flour tortilla'], category: 'grano',
    per100g: { calories: 312, protein: 8, carbs: 52, fat: 8 },
    naturalUnit: 'pzas', gramsPerUnit: 45, defaultQuantity: 2, portionLabel: '2 piezas (90g)' },
  { names: ['pan', 'pan integral', 'bread', 'pan de caja'], category: 'grano',
    per100g: { calories: 265, protein: 9, carbs: 49, fat: 3 },
    naturalUnit: 'rebanadas', gramsPerUnit: 30, defaultQuantity: 2, portionLabel: '2 rebanadas (60g)' },
  { names: ['pasta', 'spaghetti', 'pasta cocida'], category: 'grano',
    per100g: { calories: 131, protein: 5, carbs: 25, fat: 1 },
    naturalUnit: 'tazas', gramsPerUnit: 140, defaultQuantity: 1, portionLabel: '1 taza cocida' },
  { names: ['quinoa', 'quinoa cocida'], category: 'grano',
    per100g: { calories: 120, protein: 4, carbs: 21, fat: 2 },
    naturalUnit: 'tazas', gramsPerUnit: 185, defaultQuantity: 0.5, portionLabel: '1/2 taza' },

  // ── FRUTAS ──
  { names: ['plátano', 'banana', 'banano'], category: 'fruta',
    per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    naturalUnit: 'pzas', gramsPerUnit: 120, defaultQuantity: 1, portionLabel: '1 pieza (120g)' },
  { names: ['manzana', 'apple'], category: 'fruta',
    per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
    naturalUnit: 'pzas', gramsPerUnit: 180, defaultQuantity: 1, portionLabel: '1 pieza (180g)' },
  { names: ['naranja', 'orange'], category: 'fruta',
    per100g: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
    naturalUnit: 'pzas', gramsPerUnit: 200, defaultQuantity: 1, portionLabel: '1 pieza (200g)' },
  { names: ['fresa', 'fresas', 'strawberry'], category: 'fruta',
    per100g: { calories: 32, protein: 0.7, carbs: 8, fat: 0.3 },
    naturalUnit: 'tazas', gramsPerUnit: 150, defaultQuantity: 1, portionLabel: '1 taza (150g)' },
  { names: ['mango'], category: 'fruta',
    per100g: { calories: 60, protein: 0.8, carbs: 15, fat: 0.4 },
    naturalUnit: 'pzas', gramsPerUnit: 200, defaultQuantity: 1, portionLabel: '1 pieza (200g)' },
  { names: ['papaya'], category: 'fruta',
    per100g: { calories: 43, protein: 0.5, carbs: 11, fat: 0.3 },
    naturalUnit: 'tazas', gramsPerUnit: 150, defaultQuantity: 1, portionLabel: '1 taza (150g)' },

  // ── VERDURAS ──
  { names: ['aguacate', 'avocado'], category: 'vegetal',
    per100g: { calories: 160, protein: 2, carbs: 9, fat: 15 },
    naturalUnit: 'pzas', gramsPerUnit: 150, defaultQuantity: 0.5, portionLabel: '1/2 pieza (75g)' },
  { names: ['espinacas', 'spinach', 'espinaca'], category: 'vegetal',
    per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
    naturalUnit: 'tazas', gramsPerUnit: 30, defaultQuantity: 2, portionLabel: '2 tazas (60g)' },
  { names: ['tomate', 'jitomate', 'tomato'], category: 'vegetal',
    per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
    naturalUnit: 'pzas', gramsPerUnit: 150, defaultQuantity: 1, portionLabel: '1 pieza (150g)' },
  { names: ['cebolla', 'onion'], category: 'vegetal',
    per100g: { calories: 40, protein: 1.1, carbs: 9, fat: 0.1 },
    naturalUnit: 'pzas', gramsPerUnit: 110, defaultQuantity: 0.5, portionLabel: '1/2 pieza' },
  { names: ['nopal', 'nopales'], category: 'vegetal',
    per100g: { calories: 16, protein: 1.3, carbs: 3, fat: 0.1 },
    naturalUnit: 'pzas', gramsPerUnit: 86, defaultQuantity: 2, portionLabel: '2 piezas' },
  { names: ['brócoli', 'brocoli', 'broccoli'], category: 'vegetal',
    per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    naturalUnit: 'tazas', gramsPerUnit: 90, defaultQuantity: 1, portionLabel: '1 taza (90g)' },
  { names: ['calabaza', 'zucchini'], category: 'vegetal',
    per100g: { calories: 17, protein: 1.2, carbs: 3, fat: 0.3 },
    naturalUnit: 'pzas', gramsPerUnit: 180, defaultQuantity: 1, portionLabel: '1 pieza' },
  { names: ['chayote'], category: 'vegetal',
    per100g: { calories: 19, protein: 0.8, carbs: 4, fat: 0.1 },
    naturalUnit: 'pzas', gramsPerUnit: 200, defaultQuantity: 1, portionLabel: '1 pieza' },

  // ── GRASAS ──
  { names: ['aceite de oliva', 'olive oil', 'aceite'], category: 'grasa',
    per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 },
    naturalUnit: 'cdas', gramsPerUnit: 14, defaultQuantity: 1, portionLabel: '1 cda (14ml)' },
  { names: ['mantequilla', 'butter'], category: 'grasa',
    per100g: { calories: 717, protein: 0.9, carbs: 0, fat: 81 },
    naturalUnit: 'cdas', gramsPerUnit: 14, defaultQuantity: 1, portionLabel: '1 cda (14g)' },
  { names: ['almendras', 'almonds'], category: 'grasa',
    per100g: { calories: 579, protein: 21, carbs: 22, fat: 50 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 30, portionLabel: '~30g (puño)' },
  { names: ['nueces', 'walnuts', 'nuez'], category: 'grasa',
    per100g: { calories: 654, protein: 15, carbs: 14, fat: 65 },
    naturalUnit: 'pzas', gramsPerUnit: 5, defaultQuantity: 6, portionLabel: '6 piezas (30g)' },
  { names: ['cacahuate', 'cacahuates', 'peanuts', 'maní'], category: 'grasa',
    per100g: { calories: 567, protein: 26, carbs: 16, fat: 49 },
    naturalUnit: 'g', gramsPerUnit: 1, defaultQuantity: 30, portionLabel: '~30g' },

  // ── BEBIDAS ──
  { names: ['café', 'coffee', 'café negro'], category: 'bebida',
    per100g: { calories: 2, protein: 0.3, carbs: 0, fat: 0 },
    naturalUnit: 'tazas', gramsPerUnit: 240, defaultQuantity: 1, portionLabel: '1 taza (240ml)' },
  { names: ['jugo de naranja', 'orange juice', 'jugo'], category: 'bebida',
    per100g: { calories: 45, protein: 0.7, carbs: 10, fat: 0.2 },
    naturalUnit: 'ml', gramsPerUnit: 1, defaultQuantity: 250, portionLabel: '1 vaso (250ml)' },
];

// === FUNCIONES DE BÚSQUEDA ===

/** Busca un alimento por nombre (fuzzy match) */
export function findFood(query: string): ArgosFood | null {
  const q = query.toLowerCase().trim();
  // Exacto en cualquier alias
  for (const food of ARGOS_LIBRARY) {
    if (food.names.some(n => n === q)) return food;
  }
  // Parcial
  for (const food of ARGOS_LIBRARY) {
    if (food.names.some(n => q.includes(n) || n.includes(q))) return food;
  }
  return null;
}

/** Calcula macros para una cantidad en gramos */
export function calculateMacros(food: ArgosFood, grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(food.per100g.calories * factor),
    protein: Math.round(food.per100g.protein * factor * 10) / 10,
    carbs: Math.round(food.per100g.carbs * factor * 10) / 10,
    fat: Math.round(food.per100g.fat * factor * 10) / 10,
  };
}

/** Calcula macros usando la unidad natural del alimento */
export function calculateMacrosNatural(food: ArgosFood, quantity: number) {
  const grams = quantity * food.gramsPerUnit;
  return calculateMacros(food, grams);
}

/** Genera tabla de referencia para el prompt de IA */
export function generateAIReferencePrompt(maxItems = 50): string {
  const lines = ARGOS_LIBRARY.slice(0, maxItems).map(f => {
    const p = f.per100g;
    const portion = f.portionLabel;
    return `  ${f.names[0]}: ${p.protein}g prot, ${p.fat}g grasa, ${p.carbs}g carbs = ${p.calories} kcal/100g (porción: ${portion})`;
  });
  return `TABLA DE REFERENCIA POR 100g:\n${lines.join('\n')}`;
}
