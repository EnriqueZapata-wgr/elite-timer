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
  /**
   * 30-ago-2026: pasaron de `number` a `number | null`.
   *
   * Antes num() devolvia 0 para el nulo y la pantalla pintaba "0 kcal · 0g
   * prot". Con las 10 recetas de la 309, que venian completas, nunca se noto.
   * Las 93 de la 310 no vienen completas: 8 tarjetas no traen macros y 5
   * traen calorias pero no el desglose. "0 g de proteina" en un pescado no es
   * un dato faltante, es un dato falso, y ademas se registraba asi en
   * food_logs. null significa "la ficha no lo dice" y la pantalla pinta raya.
   */
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
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

/**
 * Numero de la base, o null si la ficha no lo trae.
 *
 * Se distingue el cero real del ausente a proposito: hay recetas con 0 g de
 * carbohidratos de verdad, y hay recetas cuya tarjeta no imprimio el dato.
 * Pintarlos igual las hace indistinguibles.
 */
function numONulo(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function comoArreglo(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

export function catalogoARecipe(fila: FilaCatalogo): RecetaEnPantalla {
  return {
    id: fila.id,
    name: fila.name,
    ingredients: comoArreglo(fila.ingredients),
    total_calories: numONulo(fila.calories),
    total_protein: numONulo(fila.protein_g),
    total_carbs: numONulo(fila.carbs_g),
    total_fat: numONulo(fila.fat_g),
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

/**
 * 31-ago-2026: la linea SECUNDARIA de un ingrediente en la ficha.
 *
 * Las 93 recetas de la 310 traen dos llaves extra que la tarjeta no pintaba:
 * `sustituto` ("cilantro fresco" para la albahaca) y `nota` ("en cubos de
 * 1 cm"). Son la mitad del valor de la ficha cuando alguien esta cocinando y
 * no tiene el ingrediente. Van juntas en una linea en gris secundario:
 * "o cilantro fresco · en hojas". Vacio si el ingrediente no trae ninguna.
 * Nunca revienta: string suelto, null o basura devuelven ''.
 */
export function detalleIngrediente(i: unknown): string {
  if (!i || typeof i !== 'object') return '';
  const o = i as Record<string, unknown>;
  const limpio = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const sustituto = limpio(o.sustituto) || limpio(o.substitute);
  const nota = limpio(o.nota) || limpio(o.note);
  return [sustituto ? `o ${sustituto}` : '', nota].filter(Boolean).join(' · ');
}

/**
 * La etiqueta humana del momento ("Comida"), o null si la ficha no lo trae o
 * no se entiende. Reusa el mismo cajon que los chips para no tener dos
 * vocabularios: lo que se filtra como Snack se lee como Snack.
 */
export function etiquetaMomento(mealType: string | null | undefined): string | null {
  const id = momentoDeReceta(mealType);
  if (!id) return null;
  return MOMENTOS.find((m) => m.id === id)?.etiqueta ?? null;
}

/** El texto de un paso, venga como objeto {step,text} o como string suelto. */
export function textoPaso(i: unknown): string {
  if (typeof i === 'string') return i;
  if (!i || typeof i !== 'object') return '';
  const o = i as Record<string, unknown>;
  return typeof o.text === 'string' ? o.text : '';
}

/* ---------------------------------------------------------------------------
 * Buscador y filtros (30-ago-2026)
 *
 * Con 10 recetas la pestana se leia de un vistazo. Con 103 no: hay que poder
 * llegar a una. Toda la decision de que se ve y que no vive AQUI, en funciones
 * puras, porque es logica con casos de borde (acentos, mayusculas, momento
 * ausente) y en la pantalla no se puede probar sin montar React.
 * ------------------------------------------------------------------------ */

/** El unico vocabulario de momento que existe rio abajo (defaultMealTypeByHour). */
export const MOMENTOS = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'breakfast', etiqueta: 'Desayuno' },
  { id: 'lunch', etiqueta: 'Comida' },
  { id: 'dinner', etiqueta: 'Cena' },
  { id: 'snack_pm', etiqueta: 'Snack' },
] as const;

export type FiltroMomento = (typeof MOMENTOS)[number]['id'];

/**
 * "salmon" tiene que encontrar "Salmón" y "PIÑA" tiene que encontrarse con
 * "pina". Sin esto el buscador falla justo en el idioma en el que esta escrito
 * el catalogo: 62 de las 93 recetas nuevas llevan acento en el titulo.
 */
export function normalizar(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // acentos fuera
    .toLowerCase()
    .trim();
}

/**
 * El cajon al que va una receta, venga su meal_type de donde venga.
 *
 * Comprobado contra la base el 30-ago-2026: user_recipes tiene una fila con
 * 'snack_am' y food_logs tiene 30 con 'snack_am' y 2 con 'snack'. Ninguno de
 * los dos esta en MOMENTOS, asi que comparar con !== hacia que esas recetas
 * desaparecieran de TODOS los chips menos "Todas", sin aviso: el contador
 * decia "12 de 103" y la persona no encontraba su receta.
 *
 * Los tres snacks caen en el mismo cajon porque el chip se llama "Snack" y a
 * nadie le importa si era de la manana. Lo que NO se hace es inventarle cajon
 * a quien no trae meal_type: esa se ve en Todas y en la busqueda, y ya.
 */
export function momentoDeReceta(mealType: string | null | undefined): FiltroMomento | null {
  const m = String(mealType ?? '').trim().toLowerCase();
  if (!m) return null;
  if (m === 'breakfast' || m === 'lunch' || m === 'dinner') return m;
  if (m === 'snack' || m.startsWith('snack_')) return 'snack_pm';
  // Vocabulario desconocido: MISMO trato que el nulo. Un cajon de sastre que
  // se traga cualquier cadena archivaria un 'Dinner' o un 'desayuno' bajo
  // Snack, que es mentir en silencio; desaparecer del chip se nota y la
  // busqueda por texto lo sigue encontrando.
  return null;
}

/** Forma minima que necesita el filtro. No pide la receta entera a proposito. */
export interface RecetaFiltrable {
  name: string;
  meal_type: string | null;
  is_favorite: boolean | null;
  ingredients?: unknown;
}

export interface OpcionesFiltro {
  texto?: string;
  momento?: FiltroMomento;
  soloFavoritas?: boolean;
}

/**
 * Busca por nombre Y por ingrediente. Lo segundo es la mitad del valor: con el
 * refri abierto uno busca "nopales", no el titulo de la receta.
 *
 * Las favoritas son un filtro APARTE del momento, no otro momento. Antes el
 * chip "Favoritas" ocupaba el mismo lugar que "Todas", asi que no se podian
 * ver las cenas favoritas. Ahora si.
 */
export function filtrarRecetas<T extends RecetaFiltrable>(
  recetas: T[],
  opciones: OpcionesFiltro = {},
): T[] {
  const q = normalizar(opciones.texto);
  const momento = opciones.momento ?? 'todas';
  return recetas.filter((r) => {
    // is_favorite es nullable en user_recipes: se compara por verdad, no por
    // identidad, que es lo unico correcto cuando puede llegar null.
    if (opciones.soloFavoritas && r.is_favorite !== true) return false;
    // Sin momento en la ficha, la receta NO se cuela en un momento que no le
    // toca: se ve en Todas y en la busqueda, y nada mas. Inventarle uno seria
    // meter un dato que nadie escribio.
    if (momento !== 'todas' && momentoDeReceta(r.meal_type) !== momento) return false;
    if (!q) return true;
    if (normalizar(r.name).includes(q)) return true;
    return (Array.isArray(r.ingredients) ? r.ingredients : [])
      .some((i) => normalizar(textoIngrediente(i)).includes(q));
  });
}
