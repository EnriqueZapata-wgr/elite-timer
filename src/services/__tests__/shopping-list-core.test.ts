import { describe, it, expect } from 'vitest';
import {
  parseQuantity,
  normalizeIngredient,
  aggregateIngredients,
  shoppingListToText,
} from '@/src/services/shopping-list-core';

describe('parseQuantity (T5 #56)', () => {
  it('parsea número + unidad', () => {
    expect(parseQuantity('200g')).toEqual({ quantity: 200, unit: 'g' });
    expect(parseQuantity('2 tazas')).toEqual({ quantity: 2, unit: 'tazas' });
    expect(parseQuantity('1.5 kg')).toEqual({ quantity: 1.5, unit: 'kg' });
    expect(parseQuantity('0,5 l')).toEqual({ quantity: 0.5, unit: 'l' });
  });
  it('texto no numérico → null (se conserva como raw)', () => {
    expect(parseQuantity('al gusto')).toEqual({ quantity: null, unit: null });
  });
});

describe('normalizeIngredient — shapes reales de user_recipes.ingredients', () => {
  it('string suelto', () => {
    expect(normalizeIngredient('Aguacate')).toEqual({ name: 'Aguacate', quantity: null, unit: null, rawQuantity: null });
  });
  it('objeto {name, quantity}', () => {
    expect(normalizeIngredient({ name: 'Pollo', quantity: '300g' })).toEqual({ name: 'Pollo', quantity: 300, unit: 'g', rawQuantity: null });
  });
  it('cantidad no parseable se conserva', () => {
    expect(normalizeIngredient({ name: 'Sal', quantity: 'al gusto' })).toEqual({ name: 'Sal', quantity: null, unit: null, rawQuantity: 'al gusto' });
  });
  it('basura → null', () => {
    expect(normalizeIngredient(null)).toBeNull();
    expect(normalizeIngredient({ quantity: '2' })).toBeNull();
    expect(normalizeIngredient('')).toBeNull();
    expect(normalizeIngredient(42)).toBeNull();
  });
});

describe('aggregateIngredients — agrega entre recetas', () => {
  const RECIPES = [
    { name: 'Bowl proteico', ingredients: [{ name: 'Pollo', quantity: '300g' }, { name: 'Aguacate', quantity: '1 pza' }] },
    { name: 'Tacos ATP', ingredients: [{ name: 'pollo', quantity: '200g' }, { name: 'Sal', quantity: 'al gusto' }] },
  ];

  it('suma cantidades con misma unidad (case-insensitive por nombre)', () => {
    const items = aggregateIngredients(RECIPES);
    const pollo = items.find(i => i.name.toLowerCase() === 'pollo')!;
    expect(pollo.detail).toBe('500 g');
    expect(pollo.fromRecipes).toEqual(['Bowl proteico', 'Tacos ATP']);
  });

  it('cantidades no parseables se concatenan', () => {
    const items = aggregateIngredients(RECIPES);
    const sal = items.find(i => i.name === 'Sal')!;
    expect(sal.detail).toBe('al gusto');
  });

  it('unidades distintas se muestran separadas', () => {
    const items = aggregateIngredients([
      { name: 'A', ingredients: [{ name: 'Espinaca', quantity: '100g' }] },
      { name: 'B', ingredients: [{ name: 'Espinaca', quantity: '2 tazas' }] },
    ]);
    expect(items[0].detail).toBe('100 g + 2 tazas');
  });

  it('ordena alfabéticamente y tolera ingredients no-array', () => {
    const items = aggregateIngredients([
      { name: 'X', ingredients: null },
      { name: 'Y', ingredients: ['Zanahoria', 'Apio'] },
    ]);
    expect(items.map(i => i.name)).toEqual(['Apio', 'Zanahoria']);
  });

  it('sin recetas → lista vacía', () => {
    expect(aggregateIngredients([])).toEqual([]);
  });
});

describe('shoppingListToText — compartible', () => {
  it('formato con checkboxes', () => {
    const text = shoppingListToText([
      { name: 'Pollo', detail: '500 g', fromRecipes: ['A'] },
      { name: 'Sal', detail: '', fromRecipes: ['B'] },
    ]);
    expect(text).toContain('LISTA DE COMPRA ATP');
    expect(text).toContain('☐ Pollo — 500 g');
    expect(text).toContain('☐ Sal');
    expect(text).not.toContain('Sal —');
  });
  it('vacía → string vacío', () => {
    expect(shoppingListToText([])).toBe('');
  });
});
