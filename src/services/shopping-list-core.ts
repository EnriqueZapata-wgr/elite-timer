/**
 * Lista de compra — agregación pura de ingredientes (#56 parcial, T5).
 *
 * DETERMINÍSTICA (sin IA): toma las recetas seleccionadas y agrega sus
 * ingredientes por nombre normalizado, sumando cantidades cuando la unidad
 * coincide. Tolera los shapes reales de user_recipes.ingredients (jsonb):
 * strings sueltos, {name}, {name, quantity}, {name, quantity, unit}.
 */

export interface RawRecipe {
  name: string;
  ingredients: unknown;
}

export interface NormalizedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  /** Texto original de cantidad cuando no se pudo parsear ("al gusto"). */
  rawQuantity: string | null;
}

export interface AggregatedItem {
  name: string;
  /** "400 g" · "2 pza + al gusto" · "" sin datos. */
  detail: string;
  fromRecipes: string[];
}

/**
 * Fraccion simple ("1/2 taza") o mixta ("1 1/2 taza"). 31-ago-2026: 109 de
 * 812 ingredientes del catalogo publico vienen asi, y el regex de abajo
 * capturaba el "1" y cortaba en la barra: "1/2 taza" se mandaba a la lista
 * como "1" y "3/4 taza de harina" se compraba como "1 harina". No se
 * convierte a decimal a proposito: trimNum redondea a un decimal y 3/4 se
 * volveria "0.8 taza". La fraccion se conserva tal cual como rawQuantity.
 */
const FRACCION = /^\s*\d+(?:\s+\d+)?\s*\/\s*\d+/;

/** "200g" / "2 tazas" → {quantity, unit}; "1/2 cda" / "al gusto" → nulls (se conserva el texto). */
export function parseQuantity(raw: string): { quantity: number | null; unit: string | null } {
  if (FRACCION.test(raw)) return { quantity: null, unit: null };
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*([a-záéíóúñ%]+)?/i.exec(raw);
  if (!m) return { quantity: null, unit: null };
  const quantity = Number(m[1].replace(',', '.'));
  return {
    quantity: Number.isFinite(quantity) ? quantity : null,
    unit: m[2] ? m[2].toLowerCase() : null,
  };
}

/** Normaliza un item de ingredients (string u objeto flexible). */
export function normalizeIngredient(item: unknown): NormalizedIngredient | null {
  if (typeof item === 'string') {
    const name = item.trim();
    return name ? { name, quantity: null, unit: null, rawQuantity: null } : null;
  }
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? o.ingredient ?? '').trim();
    if (!name) return null;
    const rawQty = o.quantity != null ? String(o.quantity).trim() : null;
    if (rawQty) {
      const { quantity, unit } = parseQuantity(rawQty);
      return {
        name,
        quantity,
        unit: unit ?? (typeof o.unit === 'string' ? o.unit.toLowerCase() : null),
        rawQuantity: quantity === null ? rawQty : null,
      };
    }
    return { name, quantity: null, unit: typeof o.unit === 'string' ? o.unit.toLowerCase() : null, rawQuantity: null };
  }
  return null;
}

function keyOf(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Agrega ingredientes de varias recetas: por nombre normalizado, suma
 * cantidades con misma unidad; cantidades no parseables se concatenan.
 * Orden alfabético para recorrer el súper sin brincar.
 */
export function aggregateIngredients(recipes: RawRecipe[]): AggregatedItem[] {
  const map = new Map<string, {
    name: string;
    sums: Map<string, number>; // unit → total
    raws: string[];
    fromRecipes: Set<string>;
  }>();

  for (const recipe of recipes) {
    const list = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    for (const raw of list) {
      const ing = normalizeIngredient(raw);
      if (!ing) continue;
      const key = keyOf(ing.name);
      if (!map.has(key)) {
        map.set(key, { name: ing.name, sums: new Map(), raws: [], fromRecipes: new Set() });
      }
      const entry = map.get(key)!;
      entry.fromRecipes.add(recipe.name);
      if (ing.quantity !== null) {
        const unitKey = ing.unit ?? '';
        entry.sums.set(unitKey, (entry.sums.get(unitKey) ?? 0) + ing.quantity);
      } else if (ing.rawQuantity) {
        entry.raws.push(ing.rawQuantity);
      }
    }
  }

  return Array.from(map.values())
    .map((e) => {
      const parts: string[] = [];
      for (const [unit, total] of e.sums) {
        parts.push(unit ? `${trimNum(total)} ${unit}` : `${trimNum(total)}`);
      }
      parts.push(...e.raws);
      return {
        name: e.name,
        detail: parts.join(' + '),
        fromRecipes: Array.from(e.fromRecipes),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Texto compartible de la lista (Share nativo). Acepta cualquier item con
 * name y detail: los agregados clásicos y los persistentes de la 260. */
export function shoppingListToText(items: { name: string; detail: string; [k: string]: unknown }[]): string {
  if (items.length === 0) return '';
  const lines = items.map((i) => `☐ ${i.name}${i.detail ? ` — ${i.detail}` : ''}`);
  return `LISTA DE COMPRA ATP\n\n${lines.join('\n')}`;
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// MB-28B P3 — la lista persistente y su merge (receta → lista sin duplicar)
// ─────────────────────────────────────────────────────────────────────────────

/** Fila de shopping_list_items ya mapeada a cliente. */
export interface ShoppingListItem {
  id: string;
  name: string;
  nameKey: string;
  detail: string | null;
  status: 'pending' | 'bought';
  source: 'manual' | 'recipe';
  fromRecipes: string[];
  boughtAt: string | null;
}

/** Nombre → llave de dedupe (la misma que el índice único de la migración 260). */
export function itemNameKey(name: string): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** El detail legible de un ingrediente normalizado ("400 g", "al gusto"). */
export function ingredientDetail(ing: NormalizedIngredient): string | null {
  if (ing.quantity !== null) {
    return ing.unit ? `${trimNum(ing.quantity)} ${ing.unit}` : trimNum(ing.quantity);
  }
  return ing.rawQuantity;
}

export interface RecipeToListPlan {
  /** Ingredientes nuevos: no estaban en la lista. */
  inserts: { name: string; nameKey: string; detail: string | null; fromRecipes: string[] }[];
  /** Pendientes que ya estaban: se les suma la receta (y el detail si faltaba). */
  merges: { id: string; detail: string | null; fromRecipes: string[] }[];
  /** Comprados recientes: EN TU DESPENSA — no se vuelven a pedir. */
  pantry: { id: string; name: string }[];
}

/**
 * Decide qué pasa con cada ingrediente de una receta contra la lista actual.
 * Pura y determinística — es la regla del brief hecha función:
 *   - no está → se agrega (insert)
 *   - está pendiente → NO se duplica; se anota la receta que lo pidió (merge)
 *   - está comprado → la despensa responde: no se vuelve a pedir (pantry)
 * Dedupe también dentro de la propia receta (dos "ajo" → uno).
 */
export function planRecipeToList(
  existing: ShoppingListItem[],
  recipeName: string,
  ingredients: unknown,
): RecipeToListPlan {
  const byKey = new Map(existing.map((i) => [i.nameKey, i]));
  const plan: RecipeToListPlan = { inserts: [], merges: [], pantry: [] };
  const seen = new Set<string>();

  const list = Array.isArray(ingredients) ? ingredients : [];
  for (const raw of list) {
    const ing = normalizeIngredient(raw);
    if (!ing) continue;
    const key = itemNameKey(ing.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const detail = ingredientDetail(ing);
    const current = byKey.get(key);
    if (!current) {
      plan.inserts.push({ name: ing.name, nameKey: key, detail, fromRecipes: [recipeName] });
    } else if (current.status === 'bought') {
      plan.pantry.push({ id: current.id, name: current.name });
    } else {
      plan.merges.push({
        id: current.id,
        // El detail existente manda (el usuario pudo editarlo); solo se
        // completa si estaba vacío.
        detail: current.detail ?? detail,
        fromRecipes: current.fromRecipes.includes(recipeName)
          ? current.fromRecipes
          : [...current.fromRecipes, recipeName],
      });
    }
  }
  return plan;
}
