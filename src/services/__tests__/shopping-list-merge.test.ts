/**
 * MB-28B P4 — planRecipeToList (pura): de la receta a la lista SIN duplicar.
 *
 * La regla del brief hecha tests:
 *  - lo que no está, entra
 *  - lo que ya está pendiente NO se duplica (punto 4 de la verificación)
 *  - lo comprado responde desde la despensa y no se vuelve a pedir
 */
import { describe, it, expect } from 'vitest';
import {
  itemNameKey, ingredientDetail, planRecipeToList,
  type ShoppingListItem,
} from '@/src/services/shopping-list-core';

function item(over: Partial<ShoppingListItem> & { name: string }): ShoppingListItem {
  return {
    id: `id-${over.name}`,
    nameKey: itemNameKey(over.name),
    detail: null,
    status: 'pending',
    source: 'manual',
    fromRecipes: [],
    boughtAt: null,
    ...over,
  };
}

describe('itemNameKey', () => {
  it('sin acentos, minúsculas, espacios colapsados', () => {
    expect(itemNameKey('  Limón   amarillo ')).toBe('limon amarillo');
    expect(itemNameKey('AGUACATE')).toBe('aguacate');
  });
});

describe('ingredientDetail', () => {
  it('cantidad + unidad → legible; sin parsear → el texto original', () => {
    expect(ingredientDetail({ name: 'x', quantity: 400, unit: 'g', rawQuantity: null })).toBe('400 g');
    expect(ingredientDetail({ name: 'x', quantity: 2, unit: null, rawQuantity: null })).toBe('2');
    expect(ingredientDetail({ name: 'x', quantity: null, unit: null, rawQuantity: 'al gusto' })).toBe('al gusto');
    expect(ingredientDetail({ name: 'x', quantity: null, unit: null, rawQuantity: null })).toBeNull();
  });
});

describe('planRecipeToList', () => {
  const INGREDIENTS = [
    { name: 'Salmón fresco', quantity: '150 g' },
    { name: 'Limón', quantity: '0.5 pza' },
    { name: 'Aceite de oliva', quantity: '1 cda' },
  ];

  it('lista vacía: todo entra como insert con detail y receta de origen', () => {
    const plan = planRecipeToList([], 'Salmón al horno', INGREDIENTS);
    expect(plan.inserts).toHaveLength(3);
    expect(plan.merges).toHaveLength(0);
    expect(plan.pantry).toHaveLength(0);
    expect(plan.inserts[0]).toEqual({
      name: 'Salmón fresco', nameKey: 'salmon fresco', detail: '150 g', fromRecipes: ['Salmón al horno'],
    });
  });

  it('lo pendiente NO se duplica: se anota la receta, insensible a acentos y mayúsculas', () => {
    const existing = [item({ name: 'limón', fromRecipes: ['Ceviche'] })];
    const plan = planRecipeToList(existing, 'Salmón al horno', INGREDIENTS);
    expect(plan.inserts.map((i) => i.name)).toEqual(['Salmón fresco', 'Aceite de oliva']);
    expect(plan.merges).toHaveLength(1);
    expect(plan.merges[0].fromRecipes).toEqual(['Ceviche', 'Salmón al horno']);
  });

  it('mandar la MISMA receta dos veces no duplica ni repite su nombre', () => {
    const existing = [
      item({ name: 'Salmón fresco', fromRecipes: ['Salmón al horno'] }),
      item({ name: 'Limón', fromRecipes: ['Salmón al horno'] }),
      item({ name: 'Aceite de oliva', fromRecipes: ['Salmón al horno'] }),
    ];
    const plan = planRecipeToList(existing, 'Salmón al horno', INGREDIENTS);
    expect(plan.inserts).toHaveLength(0);
    expect(plan.merges.every((m) => m.fromRecipes.length === 1)).toBe(true);
  });

  it('lo comprado responde desde la despensa: no se vuelve a pedir', () => {
    const existing = [item({ name: 'Aceite de oliva', status: 'bought', boughtAt: '2026-08-01' })];
    const plan = planRecipeToList(existing, 'Salmón al horno', INGREDIENTS);
    expect(plan.inserts.map((i) => i.name)).toEqual(['Salmón fresco', 'Limón']);
    expect(plan.pantry).toEqual([{ id: 'id-Aceite de oliva', name: 'Aceite de oliva' }]);
  });

  it('el detail que el usuario ya tenía manda; solo se completa si faltaba', () => {
    const existing = [
      item({ name: 'Limón', detail: '3 pzas' }),
      item({ name: 'Salmón fresco', detail: null }),
    ];
    const plan = planRecipeToList(existing, 'Salmón al horno', INGREDIENTS);
    const limon = plan.merges.find((m) => m.id === 'id-Limón')!;
    const salmon = plan.merges.find((m) => m.id === 'id-Salmón fresco')!;
    expect(limon.detail).toBe('3 pzas');
    expect(salmon.detail).toBe('150 g');
  });

  it('dedupe dentro de la propia receta: dos veces el mismo ingrediente entra una', () => {
    const plan = planRecipeToList([], 'Doble ajo', [
      { name: 'Ajo', quantity: '2 dientes' },
      { name: 'ajo' },
      'Cebolla',
    ]);
    expect(plan.inserts.map((i) => i.nameKey)).toEqual(['ajo', 'cebolla']);
  });

  it('tolera los shapes reales de ingredients: strings, objetos, basura', () => {
    const plan = planRecipeToList([], 'Mixta', ['Espinaca', { name: '' }, null, 42, { ingredient: 'Chía' }]);
    expect(plan.inserts.map((i) => i.name)).toEqual(['Espinaca', 'Chía']);
  });

  it('ingredients no-arreglo (jsonb corrupto) no truena: plan vacío', () => {
    const plan = planRecipeToList([], 'Rota', { no: 'es arreglo' });
    expect(plan).toEqual({ inserts: [], merges: [], pantry: [] });
  });
});
