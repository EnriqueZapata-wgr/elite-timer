// ═══════════════════════════════════════════════════════════════════════════
// Biblioteca de alimentos · núcleo puro
//
// Aquí NO hay Supabase, ni React, ni fechas. Solo aritmética sobre el perfil
// nutricional. Todo lo testeable de la biblioteca vive en este archivo.
//
// LA REGLA: el perfil SIEMPRE viene por 100 g. Cualquier cantidad que el
// usuario exprese (3 tortillas, 250 ml, media taza, 6 onzas) se resuelve
// primero a GRAMOS, y de ahí se escala. Un solo camino, sin excepciones.
// ═══════════════════════════════════════════════════════════════════════════

/** Nutrientes que se escalan con la cantidad. Todos por 100 g en la fuente. */
export const NUTRIENTES = [
  'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugars_g', 'added_sugars_g',
  'starch_g', 'sugar_alcohol_g', 'sat_fat_g', 'mono_fat_g', 'poly_fat_g', 'trans_fat_g',
  'omega3_g', 'omega6_g', 'cholesterol_mg', 'vit_a_mcg', 'vit_c_mg', 'vit_d_mcg',
  'vit_e_mg', 'vit_k_mcg', 'vit_b1_mg', 'vit_b2_mg', 'vit_b3_mg', 'vit_b5_mg',
  'vit_b6_mg', 'vit_b7_mcg', 'vit_b9_mcg', 'vit_b12_mcg', 'choline_mg', 'calcium_mg',
  'iron_mg', 'magnesium_mg', 'phosphorus_mg', 'potassium_mg', 'sodium_mg', 'zinc_mg',
  'copper_mg', 'manganese_mg', 'selenium_mcg', 'iodine_mcg', 'water_g', 'caffeine_mg',
  'alcohol_g',
] as const;

export type NutrienteKey = (typeof NUTRIENTES)[number];

/** null = sin dato. 0 = cero medido. NUNCA los mezcles. */
export type PerfilNutricional = { [K in NutrienteKey]?: number | null };

export interface FoodPortion {
  label: string;
  grams: number;
  is_default?: boolean;
}

export interface FoodItem extends PerfilNutricional {
  id?: string;
  slug: string;
  name_es: string;
  name_en?: string | null;
  brand?: string | null;
  category: string;
  subcategory?: string | null;
  region: 'mx' | 'latam' | 'universal';
  state?: 'crudo' | 'cocido' | 'seco' | 'preparado' | null;
  base_unit: 'g' | 'ml';
  density_g_per_ml?: number | null;
  is_processed?: boolean;
  is_prepared?: boolean;
  is_supplement?: boolean;
  nova_group?: number | null;
  tags?: string[];
  portions?: FoodPortion[];
}

// ── Unidades de masa y volumen ─────────────────────────────────────────────
// Conversión pura, sin datos: no necesitan la biblioteca, solo aritmética.

export type UnidadMasa = 'g' | 'kg' | 'oz' | 'lb';
export type UnidadVolumen = 'ml' | 'l' | 'taza' | 'cda' | 'cdta' | 'floz';

const A_GRAMOS: Record<UnidadMasa, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

/** Medidas de volumen en ml. Taza y cucharadas en su valor de cocina mexicano. */
const A_ML: Record<UnidadVolumen, number> = {
  ml: 1,
  l: 1000,
  taza: 240,
  cda: 15,
  cdta: 5,
  floz: 29.5735,
};

export function masaAGramos(cantidad: number, unidad: UnidadMasa): number {
  return cantidad * A_GRAMOS[unidad];
}

/**
 * Volumen a gramos. Exige densidad: sin ella, un vaso de aceite y uno de agua
 * pesarían lo mismo y el conteo de calorías se iría al doble.
 */
export function volumenAGramos(
  cantidad: number,
  unidad: UnidadVolumen,
  densidadGporMl: number | null | undefined,
): number | null {
  if (densidadGporMl == null || densidadGporMl <= 0) return null;
  return cantidad * A_ML[unidad] * densidadGporMl;
}

// ── Resolver cualquier cantidad a gramos ───────────────────────────────────

export type Cantidad =
  | { tipo: 'gramos'; valor: number }
  | { tipo: 'masa'; valor: number; unidad: UnidadMasa }
  | { tipo: 'volumen'; valor: number; unidad: UnidadVolumen }
  | { tipo: 'porcion'; valor: number; label: string };

/**
 * El único camino a gramos. Devuelve null cuando no se puede resolver
 * (porción inexistente, líquido sin densidad): null se propaga y la UI
 * pide otra unidad, en vez de inventar un número.
 */
export function resolverGramos(food: FoodItem, cantidad: Cantidad): number | null {
  switch (cantidad.tipo) {
    case 'gramos':
      return cantidad.valor > 0 ? cantidad.valor : null;

    case 'masa':
      return cantidad.valor > 0 ? masaAGramos(cantidad.valor, cantidad.unidad) : null;

    case 'volumen':
      if (cantidad.valor <= 0) return null;
      return volumenAGramos(cantidad.valor, cantidad.unidad, food.density_g_per_ml);

    case 'porcion': {
      if (cantidad.valor <= 0) return null;
      const p = (food.portions ?? []).find((x) => x.label === cantidad.label);
      if (!p || !(p.grams > 0)) return null;
      return p.grams * cantidad.valor;
    }
  }
}

// ── Escalar el perfil ──────────────────────────────────────────────────────

/**
 * Escala el perfil de 100 g a los gramos pedidos.
 *
 * ⚠️ null se queda null. Un alimento sin dato de vitamina K no aporta 0 de
 * vitamina K: aporta desconocido. Convertirlo en 0 le fabrica al usuario un
 * déficit que no existe, y sobre eso ARGOS acabaría recomendando.
 */
export function escalarPerfil(food: FoodItem, gramos: number): PerfilNutricional {
  const factor = gramos / 100;
  const out: PerfilNutricional = {};
  for (const k of NUTRIENTES) {
    const v = food[k];
    out[k] = v == null ? null : redondear(v * factor, k);
  }
  return out;
}

/** Redondeo por magnitud: las calorías no llevan decimales, la B12 sí. */
function redondear(v: number, k: NutrienteKey): number {
  if (k === 'kcal') return Math.round(v);
  if (Math.abs(v) >= 100) return Math.round(v * 10) / 10;
  if (Math.abs(v) >= 1) return Math.round(v * 100) / 100;
  return Math.round(v * 1000) / 1000;
}

/** El camino completo: alimento + cantidad → perfil. null si no se resuelve. */
export function calcularNutricion(
  food: FoodItem,
  cantidad: Cantidad,
): { gramos: number; perfil: PerfilNutricional } | null {
  const gramos = resolverGramos(food, cantidad);
  if (gramos == null || !Number.isFinite(gramos) || gramos <= 0) return null;
  return { gramos, perfil: escalarPerfil(food, gramos) };
}

// ── Sumar varios alimentos (una comida, un día) ────────────────────────────

/**
 * Suma perfiles preservando la diferencia entre 0 y sin dato.
 *
 * La regla: un nutriente es null en el total SOLO si NINGUNA de las partes
 * tenía dato. Si al menos una lo tiene, el total es la suma de las que sí,
 * y `parciales` dice cuáles quedaron incompletas para que la UI pueda
 * decir "al menos 12 mg" en vez de mentir con un número exacto.
 */
export function sumarPerfiles(perfiles: PerfilNutricional[]): {
  total: PerfilNutricional;
  parciales: NutrienteKey[];
} {
  const total: PerfilNutricional = {};
  const parciales: NutrienteKey[] = [];

  for (const k of NUTRIENTES) {
    let suma = 0;
    let conDato = 0;
    for (const p of perfiles) {
      const v = p[k];
      if (v != null) {
        suma += v;
        conDato++;
      }
    }
    if (conDato === 0) {
      total[k] = null;
    } else {
      total[k] = redondear(suma, k);
      if (conDato < perfiles.length) parciales.push(k);
    }
  }
  return { total, parciales };
}

// ── Utilidades de presentación ─────────────────────────────────────────────

/** La porción con la que se abre el selector. Nunca devuelve undefined. */
export function porcionDefault(food: FoodItem): FoodPortion {
  const ps = food.portions ?? [];
  return ps.find((p) => p.is_default) ?? ps[0] ?? { label: '100 g', grams: 100 };
}

/**
 * Todas las formas en que el usuario puede expresar una cantidad de este
 * alimento. Las porciones caseras necesitan dato; masa y volumen no.
 */
export function unidadesDisponibles(food: FoodItem): {
  porciones: FoodPortion[];
  masa: UnidadMasa[];
  volumen: UnidadVolumen[];
} {
  return {
    porciones: food.portions ?? [],
    masa: ['g', 'kg', 'oz', 'lb'],
    volumen: food.density_g_per_ml ? ['ml', 'l', 'taza', 'cda', 'cdta', 'floz'] : [],
  };
}

/** Reparto de calorías por macro. null si el alimento no aporta energía. */
export function porcentajeMacros(
  p: PerfilNutricional,
): { proteina: number; carbos: number; grasa: number } | null {
  const prot = (p.protein_g ?? 0) * 4;
  const carb = (p.carbs_g ?? 0) * 4;
  const gras = (p.fat_g ?? 0) * 9;
  const kcal = prot + carb + gras;
  if (kcal <= 0) return null;
  return {
    proteina: Math.round((prot / kcal) * 100),
    carbos: Math.round((carb / kcal) * 100),
    grasa: Math.round((gras / kcal) * 100),
  };
}
