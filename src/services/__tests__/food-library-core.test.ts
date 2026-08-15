/**
 * NOCHE-2 · Candados del núcleo de la biblioteca de alimentos.
 *
 * Los tests van contra el core, nunca contra el service: aquí no hay Supabase
 * ni red, solo la aritmética que decide lo que el usuario ve.
 *
 * Lo que estos tests protegen, en orden de importancia:
 *  1. NULL no es cero. Un alimento sin dato de vitamina K no aporta 0 de
 *     vitamina K: aporta desconocido. Si esto se rompe, la app le fabrica al
 *     usuario un déficit que no existe.
 *  2. Todo pasa por gramos. Ninguna unidad se escala por su cuenta.
 *  3. Sin densidad no hay conversión de volumen. Devolver null es la
 *     respuesta correcta, inventar un número no lo es.
 */
import { describe, it, expect } from 'vitest';
import {
  masaAGramos,
  volumenAGramos,
  resolverGramos,
  escalarPerfil,
  calcularNutricion,
  sumarPerfiles,
  porcionDefault,
  unidadesDisponibles,
  porcentajeMacros,
  type FoodItem,
} from '../food-library-core';

/** Sólido con porciones caseras. Sin dato de vitamina K a propósito. */
const tortilla: FoodItem = {
  slug: 'tortilla-maiz-nixtamalizada',
  name_es: 'Tortilla de maíz nixtamalizada',
  category: 'grano',
  region: 'mx',
  base_unit: 'g',
  kcal: 218,
  protein_g: 5.7,
  carbs_g: 44.6,
  fat_g: 2.85,
  fiber_g: 5.2,
  calcium_mg: 150,
  vit_k_mcg: null,
  sodium_mg: 0,
  portions: [
    { label: '1 tortilla', grams: 30, is_default: true },
    { label: '1 taza (troceada)', grams: 45 },
  ],
};

/** Líquido con densidad: los ml sí se pueden pesar. */
const leche: FoodItem = {
  slug: 'leche-entera',
  name_es: 'Leche entera',
  category: 'lacteo',
  region: 'universal',
  base_unit: 'ml',
  density_g_per_ml: 1.03,
  kcal: 61,
  protein_g: 3.2,
  carbs_g: 4.8,
  fat_g: 3.3,
  calcium_mg: 113,
  vit_k_mcg: 0.2,
  portions: [{ label: '1 vaso (240 ml)', grams: 247, is_default: true }],
};

/** Sólido sin densidad: pedirle mililitros no tiene respuesta honesta. */
const pollo: FoodItem = {
  slug: 'pechuga-pollo-asada',
  name_es: 'Pechuga de pollo asada',
  category: 'proteina',
  region: 'universal',
  base_unit: 'g',
  kcal: 165,
  protein_g: 31,
  carbs_g: 0,
  fat_g: 3.6,
  calcium_mg: 15,
  vit_k_mcg: null,
  portions: [],
};

describe('conversión de masa', () => {
  it('las unidades de masa son aritmética pura, sin tocar la biblioteca', () => {
    expect(masaAGramos(1, 'g')).toBe(1);
    expect(masaAGramos(1, 'kg')).toBe(1000);
    expect(masaAGramos(6, 'oz')).toBeCloseTo(170.097, 3);
    expect(masaAGramos(1, 'lb')).toBeCloseTo(453.592, 3);
  });
});

describe('conversión de volumen', () => {
  it('con densidad convierte mililitros a gramos', () => {
    expect(volumenAGramos(250, 'ml', 1.03)).toBeCloseTo(257.5, 2);
    expect(volumenAGramos(1, 'taza', 1.03)).toBeCloseTo(247.2, 1);
  });

  it('sin densidad devuelve null en vez de inventar un peso', () => {
    expect(volumenAGramos(250, 'ml', null)).toBeNull();
    expect(volumenAGramos(250, 'ml', undefined)).toBeNull();
    expect(volumenAGramos(250, 'ml', 0)).toBeNull();
  });
});

describe('resolverGramos: el único camino a gramos', () => {
  it('multiplica la porción casera por la cantidad', () => {
    expect(resolverGramos(tortilla, { tipo: 'porcion', valor: 3, label: '1 tortilla' })).toBe(90);
  });

  it('una porción que no existe devuelve null, no un default silencioso', () => {
    expect(resolverGramos(tortilla, { tipo: 'porcion', valor: 1, label: '1 bistec' })).toBeNull();
  });

  it('un sólido sin densidad no acepta mililitros', () => {
    expect(resolverGramos(pollo, { tipo: 'volumen', valor: 200, unidad: 'ml' })).toBeNull();
  });

  it('un líquido con densidad sí acepta mililitros', () => {
    expect(resolverGramos(leche, { tipo: 'volumen', valor: 250, unidad: 'ml' })).toBeCloseTo(257.5, 2);
  });

  it('cantidad cero o negativa no es cantidad', () => {
    expect(resolverGramos(tortilla, { tipo: 'gramos', valor: 0 })).toBeNull();
    expect(resolverGramos(tortilla, { tipo: 'masa', valor: -2, unidad: 'oz' })).toBeNull();
    expect(resolverGramos(tortilla, { tipo: 'porcion', valor: 0, label: '1 tortilla' })).toBeNull();
  });
});

describe('escalarPerfil: null sobrevive al escalado', () => {
  it('escala desde 100 g sin tocar los faltantes', () => {
    const p = escalarPerfil(tortilla, 90);
    expect(p.kcal).toBe(196);
    expect(p.calcium_mg).toBe(135);
    // Sin dato en la fuente: sigue sin dato después de escalar.
    expect(p.vit_k_mcg).toBeNull();
    // Cero medido: sigue siendo cero, no se vuelve null.
    expect(p.sodium_mg).toBe(0);
  });

  it('las calorías van enteras y los micros conservan decimales', () => {
    const p = escalarPerfil(pollo, 170.1);
    expect(Number.isInteger(p.kcal!)).toBe(true);
    expect(p.protein_g).toBeCloseTo(52.73, 1);
  });
});

describe('calcularNutricion: alimento + cantidad', () => {
  it('tres tortillas dan 90 g y su perfil', () => {
    const r = calcularNutricion(tortilla, { tipo: 'porcion', valor: 3, label: '1 tortilla' });
    expect(r).not.toBeNull();
    expect(r!.gramos).toBe(90);
    expect(r!.perfil.kcal).toBe(196);
  });

  it('devuelve null cuando la cantidad no se puede resolver', () => {
    expect(calcularNutricion(pollo, { tipo: 'volumen', valor: 200, unidad: 'ml' })).toBeNull();
    expect(calcularNutricion(tortilla, { tipo: 'gramos', valor: 0 })).toBeNull();
  });
});

describe('sumarPerfiles: la regla que protege a ARGOS', () => {
  const conDato = { kcal: 100, vit_k_mcg: 12, sodium_mg: 0 };
  const sinDato = { kcal: 50, vit_k_mcg: null, sodium_mg: 30 };

  it('un nutriente es null solo si NINGUNA parte tenía dato', () => {
    const { total } = sumarPerfiles([{ vit_k_mcg: null }, { vit_k_mcg: null }]);
    expect(total.vit_k_mcg).toBeNull();
  });

  it('si alguna parte tiene dato, suma las que sí y marca el nutriente como parcial', () => {
    const { total, parciales } = sumarPerfiles([conDato, sinDato]);
    expect(total.kcal).toBe(150);
    expect(total.vit_k_mcg).toBe(12);
    expect(parciales).toContain('vit_k_mcg');
  });

  it('un cero medido no ensucia el total ni lo vuelve parcial', () => {
    const { total, parciales } = sumarPerfiles([conDato, sinDato]);
    expect(total.sodium_mg).toBe(30);
    expect(parciales).not.toContain('sodium_mg');
  });

  it('sumar nada devuelve todo sin dato, nunca ceros', () => {
    const { total, parciales } = sumarPerfiles([]);
    expect(total.kcal).toBeNull();
    expect(total.protein_g).toBeNull();
    expect(parciales).toHaveLength(0);
  });
});

describe('presentación', () => {
  it('el selector abre en la porción marcada como default', () => {
    expect(porcionDefault(tortilla).label).toBe('1 tortilla');
    expect(porcionDefault(tortilla).grams).toBe(30);
  });

  it('un alimento sin porciones cae a 100 g, nunca a undefined', () => {
    expect(porcionDefault(pollo)).toEqual({ label: '100 g', grams: 100 });
  });

  it('las unidades de volumen solo se ofrecen si hay densidad', () => {
    expect(unidadesDisponibles(pollo).volumen).toHaveLength(0);
    expect(unidadesDisponibles(leche).volumen).toContain('taza');
    // La masa siempre está: no necesita dato de la biblioteca.
    expect(unidadesDisponibles(pollo).masa).toEqual(['g', 'kg', 'oz', 'lb']);
  });

  it('el reparto de macros suma 100 o muy cerca', () => {
    const m = porcentajeMacros({ protein_g: 31, carbs_g: 0, fat_g: 3.6 })!;
    expect(m.proteina).toBeGreaterThan(70);
    expect(m.carbos).toBe(0);
    expect(m.proteina + m.carbos + m.grasa).toBeGreaterThanOrEqual(99);
  });

  it('sin energía no hay reparto que mostrar', () => {
    expect(porcentajeMacros({ protein_g: 0, carbs_g: 0, fat_g: 0 })).toBeNull();
    expect(porcentajeMacros({})).toBeNull();
  });
});
