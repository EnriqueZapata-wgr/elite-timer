/**
 * shopping-list-service — la lista de súper persistente (MB-28B · Pieza 3).
 *
 * Efectos sobre shopping_list_items (migración 260). La decisión de qué se
 * inserta, qué se mergea y qué responde la despensa vive en
 * shopping-list-core.planRecipeToList (pura); aquí solo se aplica.
 *
 * Reglas de la casa:
 *  - supabase-js no lanza en 4xx: SIEMPRE se chequea { error } y se devuelve
 *    resultado tipado.
 *  - Mutaciones destructivas verificadas: 0 filas ≠ éxito (RLS o id fantasma).
 *  - Nada de lo que el usuario ya tenga en su lista se pierde: este servicio
 *    solo borra con removeItemChecked, que es acción explícita del usuario.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import {
  itemNameKey, planRecipeToList,
  type ShoppingListItem,
} from '@/src/services/shopping-list-core';

function mapRow(row: any): ShoppingListItem {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    nameKey: String(row.name_key ?? ''),
    detail: row.detail ?? null,
    status: row.status === 'bought' ? 'bought' : 'pending',
    source: row.source === 'recipe' ? 'recipe' : 'manual',
    fromRecipes: Array.isArray(row.from_recipes) ? row.from_recipes.map(String) : [],
    boughtAt: row.bought_at ?? null,
  };
}

export async function fetchShoppingList(
  userId: string,
): Promise<{ ok: true; items: ShoppingListItem[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    logWarn('[shopping-list] fetch failed:', error.message);
    return { ok: false, message: error.message };
  }
  return { ok: true, items: ((data ?? []) as any[]).map(mapRow) };
}

export type AddManualResult =
  | { status: 'created' }
  | { status: 'exists' }        // ya estaba pendiente: no se duplica
  | { status: 'repending' }     // estaba en la despensa: vuelve a la lista
  | { status: 'error'; message: string };

/** Alta a mano. Si ya está pendiente no duplica; si estaba comprado, vuelve. */
export async function addManualItem(userId: string, name: string): Promise<AddManualResult> {
  const clean = name.trim();
  if (!clean) return { status: 'error', message: 'Sin nombre' };
  const key = itemNameKey(clean);

  const { data: existing, error: readError } = await supabase
    .from('shopping_list_items')
    .select('id, status')
    .eq('user_id', userId)
    .eq('name_key', key)
    .maybeSingle();
  if (readError) {
    logWarn('[shopping-list] read failed:', readError.message);
    return { status: 'error', message: readError.message };
  }

  if (existing) {
    if ((existing as any).status === 'pending') return { status: 'exists' };
    const { data: updated, error } = await supabase
      .from('shopping_list_items')
      .update({ status: 'pending', bought_at: null })
      .eq('id', (existing as any).id)
      .select('id');
    if (error || !updated?.length) {
      logWarn('[shopping-list] repending failed:', error?.message ?? 'no rows');
      return { status: 'error', message: error?.message ?? 'Row not found or RLS blocked' };
    }
    return { status: 'repending' };
  }

  const { error } = await supabase.from('shopping_list_items').insert({
    user_id: userId,
    name: clean,
    name_key: key,
    source: 'manual',
  });
  if (error) {
    // Carrera contra el índice único (user_id, name_key): ya está, no es falla.
    if (error.code === '23505') return { status: 'exists' };
    logWarn('[shopping-list] insert failed:', error.message);
    return { status: 'error', message: error.message };
  }
  return { status: 'created' };
}

export interface SendRecipeResult {
  ok: boolean;
  message?: string;
  /** Ingredientes agregados a la lista. */
  added: number;
  /** Ya estaban pendientes: se les anotó la receta, sin duplicar. */
  merged: number;
  /** En tu despensa (comprados): la lista no los vuelve a pedir. */
  inPantry: string[];
}

/** Manda los ingredientes de una receta a la lista, sin duplicar nada. */
export async function sendRecipeToList(
  userId: string,
  recipe: { name: string; ingredients: unknown },
): Promise<SendRecipeResult> {
  const current = await fetchShoppingList(userId);
  if (!current.ok) return { ok: false, message: current.message, added: 0, merged: 0, inPantry: [] };

  const plan = planRecipeToList(current.items, recipe.name, recipe.ingredients);

  if (plan.inserts.length > 0) {
    const rows = plan.inserts.map((i) => ({
      user_id: userId,
      name: i.name,
      name_key: i.nameKey,
      detail: i.detail,
      source: 'recipe',
      from_recipes: i.fromRecipes,
    }));
    // upsert con ignoreDuplicates: si otra sesión metió el mismo ingrediente
    // entre el fetch y el insert, el índice único responde y no se duplica.
    const { error } = await supabase
      .from('shopping_list_items')
      .upsert(rows, { onConflict: 'user_id,name_key', ignoreDuplicates: true });
    if (error) {
      logWarn('[shopping-list] send inserts failed:', error.message);
      return { ok: false, message: error.message, added: 0, merged: 0, inPantry: [] };
    }
  }

  for (const m of plan.merges) {
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ detail: m.detail, from_recipes: m.fromRecipes })
      .eq('id', m.id);
    if (error) logWarn('[shopping-list] merge failed:', error.message);
  }

  return {
    ok: true,
    added: plan.inserts.length,
    merged: plan.merges.length,
    inPantry: plan.pantry.map((p) => p.name),
  };
}

/** Comprado ↔ pendiente. Verificado: 0 filas ≠ éxito. */
export async function setItemStatus(
  itemId: string,
  status: 'pending' | 'bought',
): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .update({ status, bought_at: status === 'bought' ? new Date().toISOString() : null })
    .eq('id', itemId)
    .select('id');
  if (error) {
    logWarn('[shopping-list] status failed:', error.message);
    return { ok: false, message: error.message };
  }
  if (!data || data.length === 0) return { ok: false, message: 'Row not found or RLS blocked' };
  return { ok: true };
}

/** Borrado explícito del usuario. Verificado: 0 filas ≠ éxito. */
export async function removeItemChecked(itemId: string): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', itemId)
    .select('id');
  if (error) {
    logWarn('[shopping-list] delete failed:', error.message);
    return { ok: false, message: error.message };
  }
  if (!data || data.length === 0) return { ok: false, message: 'Row not found or RLS blocked' };
  return { ok: true };
}
