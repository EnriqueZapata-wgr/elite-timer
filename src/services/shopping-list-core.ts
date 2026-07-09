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

/** "200g" / "2 tazas" / "1/2 cda" → {quantity, unit} (best-effort). */
export function parseQuantity(raw: string): { quantity: number | null; unit: string | null } {
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

/** Texto compartible de la lista (Share nativo). */
export function shoppingListToText(items: AggregatedItem[]): string {
  if (items.length === 0) return '';
  const lines = items.map((i) => `☐ ${i.name}${i.detail ? ` — ${i.detail}` : ''}`);
  return `LISTA DE COMPRA ATP\n\n${lines.join('\n')}`;
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}
