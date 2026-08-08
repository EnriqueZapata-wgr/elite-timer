/**
 * MB-28B P4 — shopping-list-service con supabase-fake (deuda B2: cada MB
 * agrega los tests de servicio de lo que tocó).
 *
 * Se afirma el RESULTADO REAL de las mutaciones (payloads capturados por el
 * fake), no la intención:
 *  - el alta manual escribe name_key (la llave del índice único) y no
 *    duplica lo pendiente; lo comprado vuelve a pendiente.
 *  - la carrera contra el índice único (23505) se reporta como "ya estaba",
 *    no como error.
 *  - el envío de receta inserta SOLO lo nuevo, mergea lo pendiente y deja
 *    lo comprado en la despensa.
 *  - status y borrado verificados: 0 filas != éxito (RLS o id fantasma).
 */
import { describe, it, expect, vi } from 'vitest';
import { makeFakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({ fake: null as any }));

vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));

import {
  fetchShoppingList, addManualItem, sendRecipeToList, setItemStatus, removeItemChecked,
} from '@/src/services/shopping-list-service';

const DB_ROW = {
  id: 'row-1', name: 'Limón', name_key: 'limon', detail: '3 pzas',
  status: 'pending', source: 'recipe', from_recipes: ['Ceviche'],
  created_at: '2026-08-08', bought_at: null,
};

describe('fetchShoppingList', () => {
  it('mapea filas de la 260 al shape de cliente', async () => {
    state.fake = makeFakeSupabase({ shopping_list_items: { data: [DB_ROW], error: null } });
    const r = await fetchShoppingList('u1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items[0]).toEqual({
        id: 'row-1', name: 'Limón', nameKey: 'limon', detail: '3 pzas',
        status: 'pending', source: 'recipe', fromRecipes: ['Ceviche'], boughtAt: null,
      });
    }
  });

  it('error de Postgres → ok:false (un 400 no es "lista vacía")', async () => {
    state.fake = makeFakeSupabase({ shopping_list_items: { data: null, error: { message: 'boom' } } });
    expect((await fetchShoppingList('u1')).ok).toBe(false);
  });
});

describe('addManualItem', () => {
  it('item nuevo → insert con name_key y source manual', async () => {
    state.fake = makeFakeSupabase({
      shopping_list_items: [
        { data: null, error: null },  // read: no existe
        { data: null, error: null },  // insert ok
      ],
    });
    const r = await addManualItem('u1', '  Aguacate  ');
    expect(r).toEqual({ status: 'created' });
    const insert = state.fake.calls.find((c: any) => c.method === 'insert');
    expect(insert.args[0]).toEqual({
      user_id: 'u1', name: 'Aguacate', name_key: 'aguacate', source: 'manual',
    });
  });

  it('ya pendiente → exists, sin insertar', async () => {
    state.fake = makeFakeSupabase({
      shopping_list_items: { data: { id: 'row-1', status: 'pending' }, error: null },
    });
    expect(await addManualItem('u1', 'Limón')).toEqual({ status: 'exists' });
    expect(state.fake.calls.some((c: any) => c.method === 'insert')).toBe(false);
  });

  it('estaba comprado → vuelve a pendiente (bought_at limpio)', async () => {
    state.fake = makeFakeSupabase({
      shopping_list_items: [
        { data: { id: 'row-1', status: 'bought' }, error: null },
        { data: [{ id: 'row-1' }], error: null },
      ],
    });
    expect(await addManualItem('u1', 'Limón')).toEqual({ status: 'repending' });
    const update = state.fake.calls.find((c: any) => c.method === 'update');
    expect(update.args[0]).toEqual({ status: 'pending', bought_at: null });
  });

  it('carrera contra el índice único (23505) → exists, no error', async () => {
    state.fake = makeFakeSupabase({
      shopping_list_items: [
        { data: null, error: null },
        { data: null, error: { code: '23505', message: 'duplicate key value' } },
      ],
    });
    expect(await addManualItem('u1', 'Aguacate')).toEqual({ status: 'exists' });
  });

  it('nombre vacío → error sin tocar la tabla', async () => {
    state.fake = makeFakeSupabase({});
    const r = await addManualItem('u1', '   ');
    expect(r.status).toBe('error');
    expect(state.fake.queried).toEqual([]);
  });
});

describe('sendRecipeToList', () => {
  it('inserta lo nuevo, mergea lo pendiente, la despensa responde por lo comprado', async () => {
    const existing = [
      DB_ROW, // Limón pendiente
      { ...DB_ROW, id: 'row-2', name: 'Aceite de oliva', name_key: 'aceite de oliva', status: 'bought', detail: null, from_recipes: [] },
    ];
    state.fake = makeFakeSupabase({
      shopping_list_items: [
        { data: existing, error: null },  // fetch
        { data: null, error: null },      // upsert inserts
        { data: null, error: null },      // update merge
      ],
    });
    const r = await sendRecipeToList('u1', {
      name: 'Salmón al horno',
      ingredients: [
        { name: 'Salmón fresco', quantity: '150 g' },
        { name: 'Limón', quantity: '0.5 pza' },
        { name: 'Aceite de oliva', quantity: '1 cda' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.added).toBe(1);
    expect(r.merged).toBe(1);
    expect(r.inPantry).toEqual(['Aceite de oliva']);

    const upsert = state.fake.calls.find((c: any) => c.method === 'upsert');
    expect(upsert.args[0]).toEqual([{
      user_id: 'u1', name: 'Salmón fresco', name_key: 'salmon fresco',
      detail: '150 g', source: 'recipe', from_recipes: ['Salmón al horno'],
    }]);
    // El upsert va protegido contra carreras: conflicto en la llave = ignorar.
    expect(upsert.args[1]).toEqual({ onConflict: 'user_id,name_key', ignoreDuplicates: true });

    const update = state.fake.calls.find((c: any) => c.method === 'update');
    expect(update.args[0].from_recipes).toEqual(['Ceviche', 'Salmón al horno']);
  });

  it('si la lista no se pudo leer, NO se escribe nada (cero pérdida)', async () => {
    state.fake = makeFakeSupabase({
      shopping_list_items: { data: null, error: { message: 'boom' } },
    });
    const r = await sendRecipeToList('u1', { name: 'X', ingredients: ['Ajo'] });
    expect(r.ok).toBe(false);
    expect(state.fake.calls.some((c: any) => c.method === 'upsert' || c.method === 'insert')).toBe(false);
  });
});

describe('setItemStatus / removeItemChecked', () => {
  it('comprado escribe bought_at; 0 filas → ok:false', async () => {
    state.fake = makeFakeSupabase({ shopping_list_items: { data: [{ id: 'row-1' }], error: null } });
    expect((await setItemStatus('row-1', 'bought')).ok).toBe(true);
    const update = state.fake.calls.find((c: any) => c.method === 'update');
    expect(update.args[0].status).toBe('bought');
    expect(typeof update.args[0].bought_at).toBe('string');

    state.fake = makeFakeSupabase({ shopping_list_items: { data: [], error: null } });
    expect((await setItemStatus('fantasma', 'bought')).ok).toBe(false);
  });

  it('borrado verificado: 0 filas o error → ok:false', async () => {
    state.fake = makeFakeSupabase({ shopping_list_items: { data: [], error: null } });
    expect((await removeItemChecked('fantasma')).ok).toBe(false);

    state.fake = makeFakeSupabase({ shopping_list_items: { data: null, error: { message: 'boom' } } });
    expect((await removeItemChecked('row-1')).ok).toBe(false);

    state.fake = makeFakeSupabase({ shopping_list_items: { data: [{ id: 'row-1' }], error: null } });
    expect((await removeItemChecked('row-1')).ok).toBe(true);
  });
});
