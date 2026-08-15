// ═══════════════════════════════════════════════════════════════════════════
// Biblioteca de alimentos · acceso a datos
//
// Toda la aritmética vive en food-library-core.ts. Aquí solo hay I/O.
// Fail-soft: si la biblioteca no responde, el registro de comida sigue
// funcionando por el camino manual. Nunca bloquea al usuario.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import type { FoodItem, FoodPortion } from './food-library-core';

const CAMPOS = '*, portions:food_portions(label, grams, is_default, sort_order)';

function ordenarPorciones(f: any): FoodItem {
  const ps = (f?.portions ?? []) as (FoodPortion & { sort_order?: number })[];
  return {
    ...f,
    portions: [...ps].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  };
}

/**
 * Búsqueda con ranking. El orden lo decide el RPC en la base, no el cliente:
 * ordenar aquí obligaría a traerse la tabla entera.
 *
 * Devuelve [] ante cualquier error. Sin resultados y sin biblioteca se ven
 * igual desde la UI, y eso está bien: en los dos casos el usuario captura a
 * mano.
 */
export async function buscarAlimentos(q: string, limite = 30): Promise<FoodItem[]> {
  const termino = q.trim();
  if (termino.length < 2) return [];
  try {
    const { data, error } = await supabase.rpc('buscar_alimentos', { q: termino, lim: limite });
    if (error) {
      logWarn('[food-library] búsqueda falló:', error.message);
      return [];
    }
    const ids = (data ?? []).map((f: any) => f.id);
    if (ids.length === 0) return [];

    // El RPC devuelve food_items sin las porciones: se traen en un segundo
    // viaje y se pegan respetando el orden del ranking.
    const { data: ps } = await supabase
      .from('food_portions')
      .select('food_id, label, grams, is_default, sort_order')
      .in('food_id', ids);

    const porFood = new Map<string, FoodPortion[]>();
    for (const p of ps ?? []) {
      const arr = porFood.get(p.food_id) ?? [];
      arr.push({ label: p.label, grams: Number(p.grams), is_default: p.is_default });
      porFood.set(p.food_id, arr);
    }
    return (data ?? []).map((f: any) => ({ ...f, portions: porFood.get(f.id) ?? [] }));
  } catch (e) {
    logWarn('[food-library] búsqueda reventó:', e);
    return [];
  }
}

/** Un alimento por slug, con sus porciones. null si no existe o falla. */
export async function obtenerAlimento(slug: string): Promise<FoodItem | null> {
  try {
    const { data, error } = await supabase
      .from('food_items')
      .select(CAMPOS)
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return null;
    return ordenarPorciones(data);
  } catch {
    return null;
  }
}

/** Varios alimentos por slug, para reconstruir una receta o un día. */
export async function obtenerAlimentos(slugs: string[]): Promise<Map<string, FoodItem>> {
  const out = new Map<string, FoodItem>();
  if (slugs.length === 0) return out;
  try {
    const { data } = await supabase.from('food_items').select(CAMPOS).in('slug', slugs);
    for (const f of data ?? []) out.set(f.slug, ordenarPorciones(f));
  } catch (e) {
    logWarn('[food-library] lote falló:', e);
  }
  return out;
}

/**
 * Los alimentos que este usuario registra más seguido, para poner arriba del
 * buscador. Sale de sus propios food_logs, no de un ranking global: lo que
 * come el usuario es mejor predictor que lo que come el promedio.
 */
export async function alimentosFrecuentes(userId: string, limite = 12): Promise<FoodItem[]> {
  try {
    const { data } = await supabase
      .from('food_logs')
      .select('food_slug')
      .eq('user_id', userId)
      .not('food_slug', 'is', null)
      .order('date', { ascending: false })
      .limit(300);

    const cuenta = new Map<string, number>();
    for (const r of data ?? []) {
      const s = (r as any).food_slug as string;
      cuenta.set(s, (cuenta.get(s) ?? 0) + 1);
    }
    const top = [...cuenta.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite)
      .map(([s]) => s);

    const mapa = await obtenerAlimentos(top);
    return top.map((s) => mapa.get(s)).filter((f): f is FoodItem => !!f);
  } catch {
    return [];
  }
}

/** Navegación por categoría, para explorar sin escribir. */
export async function alimentosPorCategoria(
  categoria: string,
  limite = 60,
): Promise<FoodItem[]> {
  try {
    const { data } = await supabase
      .from('food_items')
      .select(CAMPOS)
      .eq('category', categoria)
      .order('name_es')
      .limit(limite);
    return (data ?? []).map(ordenarPorciones);
  } catch {
    return [];
  }
}
