/**
 * MB-28B P4 — recipe-save-service con supabase-fake.
 *
 * Lo que se cementa:
 *  - saveMealAsRecipe escribe la MISMA forma de fila que my-recipes y
 *    argos-recipes (una sola forma de user_recipes conviviendo).
 *  - Dedupe por nombre normalizado: "Bowl de Pollo" y "bowl de pollo" son
 *    la misma receta — no se crea duplicado y el caller se entera.
 *  - fetchRecentLogsForRecipe deduplica registros por descripción y extrae
 *    ingredientes de notes.items o ai_analysis.ingredients.
 */
import { describe, it, expect, vi } from 'vitest';
import { makeFakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({ fake: null as any }));

vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));

import {
  saveMealAsRecipe, fetchRecentLogsForRecipe, logItemsToIngredients, recipeNameKey,
} from '@/src/services/recipe-save-service';

describe('recipeNameKey', () => {
  it('sin acentos, minúsculas, espacios colapsados', () => {
    expect(recipeNameKey('  Bowl   de  Pollo ')).toBe('bowl de pollo');
    expect(recipeNameKey('Salmón al horno')).toBe('salmon al horno');
  });
});

describe('logItemsToIngredients', () => {
  it('ReviewItem {quantity, unit} → quantity legible', () => {
    expect(logItemsToIngredients([{ name: 'Huevo', quantity: 3, unit: 'pzas' }]))
      .toEqual([{ name: 'Huevo', quantity: '3 pzas' }]);
  });

  it('items de IA {portion} → quantity', () => {
    expect(logItemsToIngredients([{ name: 'Arroz', portion: '100g' }]))
      .toEqual([{ name: 'Arroz', quantity: '100g' }]);
  });

  it('basura filtrada, nunca truena', () => {
    expect(logItemsToIngredients([null, 42, { sin: 'nombre' }, { name: '  ' }])).toEqual([]);
    expect(logItemsToIngredients('no es arreglo')).toEqual([]);
  });
});

describe('saveMealAsRecipe', () => {
  it('crea con la misma forma de fila que my-recipes (mas meal_type e ingredients)', async () => {
    state.fake = makeFakeSupabase({
      user_recipes: [
        { data: [], error: null },   // read: sin recetas
        { data: null, error: null }, // insert ok
      ],
    });
    const r = await saveMealAsRecipe('u1', {
      name: 'Bowl de pollo',
      calories: 520.4, proteinG: 42, carbsG: 40, fatG: 18,
      mealType: 'lunch',
      ingredients: [{ name: 'Pollo', quantity: '180 g' }],
    });
    expect(r).toEqual({ status: 'created' });
    const insert = state.fake.calls.find((c: any) => c.method === 'insert');
    expect(insert.table).toBe('user_recipes');
    expect(insert.args[0]).toEqual({
      user_id: 'u1', name: 'Bowl de pollo',
      total_calories: 520, total_protein: 42, total_carbs: 40, total_fat: 18,
      meal_type: 'lunch', ingredients: [{ name: 'Pollo', quantity: '180 g' }],
    });
  });

  it('nombre duplicado (normalizado) → duplicate, sin insertar', async () => {
    state.fake = makeFakeSupabase({
      user_recipes: { data: [{ id: 'r1', name: 'Bowl de Pollo' }], error: null },
    });
    const r = await saveMealAsRecipe('u1', { name: '  bowl de pollo ' });
    expect(r).toEqual({ status: 'duplicate', existingName: 'Bowl de Pollo' });
    expect(state.fake.calls.some((c: any) => c.method === 'insert')).toBe(false);
  });

  it('error de lectura o escritura → status error (nunca "creado" en falso)', async () => {
    state.fake = makeFakeSupabase({ user_recipes: { data: null, error: { message: 'boom' } } });
    expect((await saveMealAsRecipe('u1', { name: 'X' })).status).toBe('error');

    state.fake = makeFakeSupabase({
      user_recipes: [
        { data: [], error: null },
        { data: null, error: { message: 'RLS' } },
      ],
    });
    expect((await saveMealAsRecipe('u1', { name: 'X' })).status).toBe('error');
  });

  it('sin nombre → error sin tocar la tabla', async () => {
    state.fake = makeFakeSupabase({});
    expect((await saveMealAsRecipe('u1', { name: '  ' })).status).toBe('error');
    expect(state.fake.queried).toEqual([]);
  });
});

describe('fetchRecentLogsForRecipe', () => {
  const LOG = (over: any) => ({
    id: 'l1', description: 'Bowl de pollo', calories: 520, protein_g: 42,
    carbs_g: 40, fat_g: 18, meal_type: 'lunch', date: '2026-08-08',
    notes: null, ai_analysis: null, ...over,
  });

  it('deduplica por descripción normalizada y salta "Sin descripción"', async () => {
    state.fake = makeFakeSupabase({
      food_logs: {
        data: [
          LOG({ id: 'l1' }),
          LOG({ id: 'l2', description: 'bowl de pollo' }),  // dup normalizado
          LOG({ id: 'l3', description: 'Sin descripción' }),
          LOG({ id: 'l4', description: 'Omelette' }),
        ],
        error: null,
      },
    });
    const r = await fetchRecentLogsForRecipe('u1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.logs.map((l) => l.description)).toEqual(['Bowl de pollo', 'Omelette']);
  });

  it('extrae ingredientes de notes.items, con fallback a ai_analysis', async () => {
    state.fake = makeFakeSupabase({
      food_logs: {
        data: [
          LOG({ id: 'l1', notes: JSON.stringify({ items: [{ name: 'Pollo', quantity: 180, unit: 'g' }] }) }),
          LOG({ id: 'l2', description: 'Tacos', ai_analysis: { ingredients: [{ name: 'Tortilla', portion: '2 pzas' }] } }),
        ],
        error: null,
      },
    });
    const r = await fetchRecentLogsForRecipe('u1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.logs[0].ingredients).toEqual([{ name: 'Pollo', quantity: '180 g' }]);
      expect(r.logs[1].ingredients).toEqual([{ name: 'Tortilla', quantity: '2 pzas' }]);
    }
  });

  it('error de Postgres → ok:false (un 400 no es "sin registros")', async () => {
    state.fake = makeFakeSupabase({ food_logs: { data: null, error: { message: 'boom' } } });
    expect((await fetchRecentLogsForRecipe('u1')).ok).toBe(false);
  });
});
