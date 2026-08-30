/**
 * Traducción del catálogo público a la forma que la pantalla ya pinta.
 * Es la única pieza de la unión catálogo + usuario que se puede probar sin
 * montar React, así que aquí se aprieta fuerte.
 */
import { describe, it, expect } from 'vitest';
import {
  catalogoARecipe, comidaDeCategoria, textoIngrediente, textoPaso,
  normalizar, filtrarRecetas, momentoDeReceta, MOMENTOS,
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

  /**
   * 30-ago-2026: este contrato CAMBIÓ a propósito. Antes exigía 0 para el nulo.
   * Con las 10 recetas de la 309, todas completas, daba igual. Con las 93 de la
   * 310 no: 14 no traen ningún macro y 5 traen calorías sin desglose. "0 g de
   * proteína" en un pescado no es un dato faltante, es un dato falso, y además
   * se escribía así en food_logs al registrar. null = la ficha no lo dice.
   */
  it('con la columna ausente devuelve null, no 0: el cero sería un dato inventado', () => {
    const v = catalogoARecipe({ id: 'x', name: 'Sin datos' });
    expect(v.total_calories).toBeNull();
    expect(v.total_protein).toBeNull();
    expect(v.total_carbs).toBeNull();
    expect(v.total_fat).toBeNull();
    expect(v.ingredients).toEqual([]);
    expect(v.instructions).toEqual([]);
    expect(v.created_at).toBe('');
  });

  it('el cero REAL sobrevive: hay recetas con 0 g de carbohidratos de verdad', () => {
    expect(catalogoARecipe({ id: 'z', name: 'Cero', carbs_g: 0 }).total_carbs).toBe(0);
  });

  it('la cadena vacía de postgres es ausencia, no cero', () => {
    expect(catalogoARecipe({ id: 'v', name: 'Vacio', calories: '' as any }).total_calories).toBeNull();
  });

  it('numeric de postgres llega como cadena y se convierte', () => {
    // supabase-js devuelve las columnas numeric como string: '449.0'.
    expect(catalogoARecipe({ id: 'p', name: 'PG', calories: '449.0' as any }).total_calories).toBe(449);
  });

  it('basura no numérica cae a null, nunca a NaN', () => {
    // NaN en la tarjeta se pinta literal y contamina cualquier suma río abajo.
    expect(catalogoARecipe({ id: 'b', name: 'B', fat_g: 'gordo' as any }).total_fat).toBeNull();
  });

  it('la ficha parcial conserva lo que sí trae', () => {
    // Caso real: 5 tarjetas de la 310 traen calorías y ningún desglose.
    const r = catalogoARecipe({ id: 'q', name: 'Sierra en adobo', calories: 449 });
    expect(r.total_calories).toBe(449);
    expect(r.total_protein).toBeNull();
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
    expect(comidaDeCategoria('')).toBeNull();
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

/* ---------------------------------------------------------------------------
 * Buscador y filtros (30-ago-2026). Es la lógica con casos de borde por la que
 * se decidió que esto viviera en el núcleo puro, así que aquí se aprieta.
 * ------------------------------------------------------------------------ */

describe('normalizar', () => {
  it('quita acentos: sin esto el buscador falla en el idioma del catálogo', () => {
    // 62 de las 93 recetas nuevas llevan acento en el título.
    expect(normalizar('Salmón al horno con ESPÁRRAGOS')).toBe('salmon al horno con esparragos');
  });

  it('la ñ NO es un acento y se conserva', () => {
    expect(normalizar('Piña')).toBe('pina');
    expect(normalizar('champiñones')).toBe('champinones');
  });

  it('recorta y no truena con nulos', () => {
    expect(normalizar('  Pollo  ')).toBe('pollo');
    expect(normalizar(null)).toBe('');
    expect(normalizar(undefined)).toBe('');
  });
});

describe('momentoDeReceta', () => {
  it('los tres momentos con chip propio pasan directo', () => {
    expect(momentoDeReceta('breakfast')).toBe('breakfast');
    expect(momentoDeReceta('lunch')).toBe('lunch');
    expect(momentoDeReceta('dinner')).toBe('dinner');
  });

  it('los tres snacks que EXISTEN en la base caen en el chip Snack', () => {
    // Comprobado el 30-ago contra la base: user_recipes tiene una fila con
    // 'snack_am' y food_logs tiene 30 con 'snack_am' y 2 con 'snack'. Con una
    // comparación exacta, esas recetas desaparecían de todos los chips.
    expect(momentoDeReceta('snack_pm')).toBe('snack_pm');
    expect(momentoDeReceta('snack_am')).toBe('snack_pm');
    expect(momentoDeReceta('snack')).toBe('snack_pm');
  });

  it('sin meal_type no hay cajón: no se le inventa uno', () => {
    expect(momentoDeReceta(null)).toBeNull();
    expect(momentoDeReceta(undefined)).toBeNull();
    expect(momentoDeReceta('')).toBeNull();
    expect(momentoDeReceta('   ')).toBeNull();
  });

  it('mayúsculas y espacios no mandan una cena al cajón de los snacks', () => {
    // meal_type llega de tres fuentes, y una de ellas es lo que escriba ARGOS.
    expect(momentoDeReceta('Dinner')).toBe('dinner');
    expect(momentoDeReceta('  BREAKFAST  ')).toBe('breakfast');
  });

  it('el vocabulario desconocido recibe el MISMO trato que el nulo', () => {
    // Un cajón de sastre que se traga cualquier cadena archivaría 'desayuno'
    // bajo Snack, que es mentir en silencio. Que no aparezca en el chip se
    // nota, y la búsqueda por texto lo sigue encontrando.
    expect(momentoDeReceta('desayuno')).toBeNull();
    expect(momentoDeReceta('pre_workout')).toBeNull();
    expect(momentoDeReceta('inventado')).toBeNull();
  });
});

describe('MOMENTOS', () => {
  it('el vocabulario es exactamente el de defaultMealTypeByHour más "todas"', () => {
    // defaultMealTypeByHour solo produce breakfast|lunch|snack_pm|dinner.
    expect(MOMENTOS.map((m) => m.id)).toEqual(['todas', 'breakfast', 'lunch', 'dinner', 'snack_pm']);
  });

  it('todo lo que produce comidaDeCategoria cae en un chip que existe', () => {
    const ids = MOMENTOS.map((m) => String(m.id));
    for (const cat of ['breakfast', 'lunch', 'dinner', 'snack', 'smoothie', 'inventada']) {
      expect(ids).toContain(String(comidaDeCategoria(cat)));
    }
  });
});

describe('filtrarRecetas', () => {
  const R = [
    { id: 1, name: 'Salmón al horno con espárragos', meal_type: 'dinner', is_favorite: true,
      ingredients: [{ name: 'Salmón', quantity: '150 g' }, { name: 'Espárragos', quantity: '200 g' }] },
    { id: 2, name: 'Huevos a la mexicana con nopales', meal_type: 'breakfast', is_favorite: false,
      ingredients: [{ name: 'nopales', quantity: '2 pieza' }, { name: 'huevo', quantity: '3 pieza' }] },
    { id: 3, name: 'Cena rápida de pollo', meal_type: 'dinner', is_favorite: false,
      ingredients: [{ name: 'pollo', quantity: '200 g' }] },
    { id: 4, name: 'Ficha sin momento', meal_type: null, is_favorite: true,
      ingredients: 'no soy un arreglo' },
    { id: 5, name: 'Almendras de media mañana', meal_type: 'snack_am', is_favorite: null as any,
      ingredients: [{ name: 'almendras', quantity: '30 g' }] },
  ];
  const ids = (o?: any) => filtrarRecetas(R as any, o).map((r: any) => r.id);

  it('sin opciones no filtra nada', () => {
    expect(ids()).toEqual([1, 2, 3, 4, 5]);
    expect(ids({ texto: '   ' })).toEqual([1, 2, 3, 4, 5]);
  });

  it('busca sin acentos y sin mayúsculas', () => {
    expect(ids({ texto: 'salmon' })).toEqual([1]);
    expect(ids({ texto: '  SALMÓN ' })).toEqual([1]);
  });

  it('busca POR INGREDIENTE, que es la mitad del valor del buscador', () => {
    // Con el refri abierto uno busca "nopales", no el título de la receta.
    expect(ids({ texto: 'NOPALES' })).toEqual([2]);
    expect(ids({ texto: 'esparragos' })).toEqual([1]);
  });

  it('el chip de momento filtra, y el snack de la mañana cae en Snack', () => {
    // 'snack_am' existe de verdad: 1 fila en user_recipes y 30 en food_logs.
    expect(ids({ momento: 'dinner' })).toEqual([1, 3]);
    expect(ids({ momento: 'snack_pm' })).toEqual([5]);
  });

  it('la receta sin momento no se cuela en ningún chip, pero sí sale en todas', () => {
    expect(ids({ momento: 'breakfast' })).toEqual([2]);
    expect(ids({ momento: 'todas' })).toContain(4);
  });

  it('favoritas y momento se COMBINAN: "cenas favoritas" por fin existe', () => {
    // Antes "Favoritas" ocupaba el mismo chip que "Todas" y era imposible.
    expect(ids({ momento: 'dinner', soloFavoritas: true })).toEqual([1]);
    expect(ids({ soloFavoritas: true })).toEqual([1, 4]);
  });

  it('is_favorite null (columna nullable) no cuenta como favorita', () => {
    expect(ids({ soloFavoritas: true })).not.toContain(5);
  });

  it('texto y momento se aplican juntos', () => {
    expect(ids({ texto: 'pollo', momento: 'dinner' })).toEqual([3]);
    expect(ids({ texto: 'pollo', momento: 'breakfast' })).toEqual([]);
  });

  it('ingredients con forma inesperada no truena', () => {
    expect(ids({ texto: 'arreglo' })).toEqual([]);
    expect(() => filtrarRecetas([{ name: 'X', meal_type: null, is_favorite: false }] as any, { texto: 'x' })).not.toThrow();
  });

  it('no muta el arreglo que recibe', () => {
    const antes = R.map((r) => r.id);
    filtrarRecetas(R as any, { texto: 'salmon', momento: 'dinner', soloFavoritas: true });
    expect(R.map((r) => r.id)).toEqual(antes);
  });
});
