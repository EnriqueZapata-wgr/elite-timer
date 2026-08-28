/**
 * Traducción del catálogo público a la forma que la pantalla ya pinta.
 * Es la única pieza de la unión catálogo + usuario que se puede probar sin
 * montar React, así que aquí se aprieta fuerte.
 */
import { describe, it, expect } from 'vitest';
import {
  catalogoARecipe, comidaDeCategoria, textoIngrediente, textoPaso,
} from '../catalogo-recetas-core';

// La forma EXACTA que deja la migración 309.
const fila = {
  id: 'u1',
  name: 'Bowl de quinoa con salmón y verduras',
  description: 'Comida completa con omega 3.',
  category: 'lunch',
  calories: 550, protein_g: 38, carbs_g: 42, fat_g: 22,
  ingredients: [{ name: 'Salmón fresco', quantity: '150 g' }, { name: 'Limón', quantity: '0.5 pza' }],
  instructions: [{ step: 1, text: 'Cocina el salmón.' }, { step: 2, text: 'Arma el bowl.' }],
  prep_time_min: 10, cook_time_min: 20, servings: 1,
  created_at: '2026-08-28T00:00:00Z',
};

describe('catalogoARecipe', () => {
  it('renombra las macros: las dos tablas les dicen distinto a lo mismo', () => {
    const r = catalogoARecipe(fila);
    expect(r.total_calories).toBe(550);
    expect(r.total_protein).toBe(38);
    expect(r.total_carbs).toBe(42);
    expect(r.total_fat).toBe(22);
  });

  it('marca el origen, que es lo que impide mentir con el corazón', () => {
    // Sin esta marca, tocar favorito en una receta del catálogo hace un UPDATE
    // sobre user_recipes que afecta cero filas y NO devuelve error.
    expect(catalogoARecipe(fila).origin).toBe('catalogo');
    expect(catalogoARecipe(fila).is_favorite).toBe(false);
  });

  it('conserva lo que hace útil a la receta: pasos, tiempos y porciones', () => {
    const r = catalogoARecipe(fila);
    expect(r.instructions).toHaveLength(2);
    expect(r.prep_time_min).toBe(10);
    expect(r.servings).toBe(1);
  });

  it('con nulos devuelve 0 y arreglos vacíos, nunca NaN ni undefined', () => {
    // La pantalla pinta estos números sin comprobar nada.
    const v = catalogoARecipe({ id: 'x', name: 'Sin datos' });
    expect(v.total_calories).toBe(0);
    expect(v.total_fat).toBe(0);
    expect(v.ingredients).toEqual([]);
    expect(v.instructions).toEqual([]);
    expect(v.created_at).toBe('');
  });

  it('jsonb con forma inesperada no truena', () => {
    const r = catalogoARecipe({ id: 'y', name: 'Rara', ingredients: 'no soy arreglo' as any, instructions: 42 as any });
    expect(r.ingredients).toEqual([]);
    expect(r.instructions).toEqual([]);
  });
});

describe('comidaDeCategoria', () => {
  it('las cuatro comidas reales de la app pasan directo', () => {
    expect(comidaDeCategoria('breakfast')).toBe('breakfast');
    expect(comidaDeCategoria('lunch')).toBe('lunch');
    expect(comidaDeCategoria('dinner')).toBe('dinner');
  });

  it('lo que NO es meal_type cae a snack_pm en vez de colarse crudo', () => {
    // defaultMealTypeByHour solo produce breakfast|lunch|snack_pm|dinner:
    // 'smoothie' no existe en ese vocabulario y río abajo nadie lo entiende.
    expect(comidaDeCategoria('smoothie')).toBe('snack_pm');
    expect(comidaDeCategoria('snack')).toBe('snack_pm');
    expect(comidaDeCategoria('inventada')).toBe('snack_pm');
  });

  it('sin categoría, null', () => {
    expect(comidaDeCategoria(null)).toBeNull();
    expect(comidaDeCategoria(undefined)).toBeNull();
  });
});

describe('textoIngrediente — las tres formas que existen en la base', () => {
  it('la del catálogo, {name, quantity}', () => {
    expect(textoIngrediente({ name: 'Salmón', quantity: '150 g' })).toBe('Salmón · 150 g');
  });

  it('la vieja del archivo TS, {name, amount, unit}', () => {
    // ARGOS y los registros viejos todavía escriben así.
    expect(textoIngrediente({ name: 'Huevos', amount: 3, unit: 'pzas' })).toBe('Huevos · 3 pzas');
  });

  it('el string suelto y el ingrediente sin cantidad', () => {
    expect(textoIngrediente('Sal al gusto')).toBe('Sal al gusto');
    expect(textoIngrediente({ name: 'Agua' })).toBe('Agua');
  });

  it('null y basura no truenan', () => {
    expect(textoIngrediente(null)).toBe('');
    expect(textoIngrediente(42)).toBe('');
  });
});

describe('textoPaso', () => {
  it('objeto, string y basura', () => {
    expect(textoPaso({ step: 1, text: 'Bate los huevos.' })).toBe('Bate los huevos.');
    expect(textoPaso('Paso suelto')).toBe('Paso suelto');
    expect(textoPaso(null)).toBe('');
  });
});
