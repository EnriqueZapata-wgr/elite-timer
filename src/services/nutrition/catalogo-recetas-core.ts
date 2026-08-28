/**
 * Catálogo público de recetas → la forma que la pantalla ya sabe pintar.
 *
 * Núcleo PURO: cero imports, se prueba en node. Es la única pieza nueva de la
 * unión catálogo + usuario que se puede verificar sin montar React, así que
 * aquí vive toda la traducción y la pantalla solo la llama.
 *
 * Las dos tablas tienen nombres distintos para lo mismo:
 *   recipes:       calories, protein_g, carbs_g, fat_g, category
 *   user_recipes:  total_calories, total_protein, total_carbs, total_fat, meal_type
 */

/** Fila cruda de `recipes` (catálogo público). */
export interface FilaCatalogo {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  ingredients?: unknown;
  instructions?: unknown;
  prep_time_min?: number | null;
  cook_time_min?: number | null;
  servings?: number | null;
  created_at?: string | null;
}

export interface RecetaEnPantalla {
  id: string;
  name: string;
  ingredients: any[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meal_type: string | null;
  created_at: string;
  is_favorite: boolean;
  origin: 'user' | 'catalogo';
  description?: string | null;
  instructions?: any[];
  prep_time_min?: number | null;
  cook_time_min?: number | null;
  servings?: number | null;
}

/**
 * `category` del catálogo → `meal_type` de la app.
 *
 * defaultMealTypeByHour devuelve breakfast | lunch | snack_pm | dinner, así que
 * esos cuatro son el vocabulario válido. 'smoothie' y 'snack' NO están en él y
 * caen a 'snack_pm': mejor una comida plausible que un valor que nadie entiende
 * río abajo.
 */
const CATEGORIA_A_COMIDA: Record<string, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack_pm',
  smoothie: 'snack_pm',
};

export function comidaDeCategoria(categoria?: string | null): string | null {
  if (!categoria) return null;
  return CATEGORIA_A_COMIDA[categoria] ?? 'snack_pm';
}

/** Números que pueden venir nulos y la pantalla pinta sin comprobar. */
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function comoArreglo(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

export function catalogoARecipe(fila: FilaCatalogo): RecetaEnPantalla {
  return {
    id: fila.id,
    name: fila.name,
    ingredients: comoArreglo(fila.ingredients),
    total_calories: num(fila.calories),
    total_protein: num(fila.protein_g),
    total_carbs: num(fila.carbs_g),
    total_fat: num(fila.fat_g),
    meal_type: comidaDeCategoria(fila.category),
    created_at: fila.created_at ?? '',
    // El catálogo no tiene favoritos: es de todos, no de nadie.
    is_favorite: false,
    origin: 'catalogo',
    description: fila.description ?? null,
    instructions: comoArreglo(fila.instructions),
    prep_time_min: fila.prep_time_min ?? null,
    cook_time_min: fila.cook_time_min ?? null,
    servings: fila.servings ?? null,
  };
}

/** '150 g' de un ingrediente, venga como venga. Nunca revienta. */
export function textoIngrediente(i: unknown): string {
  if (typeof i === 'string') return i;
  if (!i || typeof i !== 'object') return '';
  const o = i as Record<string, unknown>;
  const nombre = typeof o.name === 'string' ? o.name : '';
  const cant = o.quantity != null ? String(o.quantity).trim()
    : o.amount != null ? `${o.amount}${o.unit ? ' ' + o.unit : ''}`.trim()
    : '';
  if (!nombre) return cant;
  return cant ? `${nombre} · ${cant}` : nombre;
}

/** El texto de un paso, venga como objeto {step,text} o como string suelto. */
export function textoPaso(i: unknown): string {
  if (typeof i === 'string') return i;
  if (!i || typeof i !== 'object') return '';
  const o = i as Record<string, unknown>;
  return typeof o.text === 'string' ? o.text : '';
}
