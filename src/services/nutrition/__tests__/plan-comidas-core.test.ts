/**
 * Tests de plan-comidas-core (325). Se corren con
 * `node scripts/run-tests-sin-vitest.js src/services/nutrition/__tests__/plan-comidas-core.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { comidasDePlan, encabezadoComida, metasDelPlan } from '../plan-comidas-core';

const meals = [
  { momento: 'cena', hora: '20:00', nombre: 'Pollo con crucíferas', componentes: ['150 g de pollo', 'brócoli'], notas: 'Última comida del día.' },
  { momento: 'desayuno', hora: '07:30', nombre: 'Huevos con verdura', componentes: ['3 huevos', 'espinaca'], notas: null },
  { momento: 'colacion', hora: null, nombre: 'Nueces y fruta', componentes: ['20 g de nueces'], notas: null },
  { momento: 'comida', hora: '14:00', nombre: 'Salmón', componentes: ['180 g de salmón', ' ensalada '], notas: '' },
];

describe('comidasDePlan', () => {
  it('ordena por hora y mete las sin hora por su momento', () => {
    const c = comidasDePlan(meals);
    expect(c.map((x) => x.nombre)).toEqual(['Huevos con verdura', 'Nueces y fruta', 'Salmón', 'Pollo con crucíferas']);
    expect(c[1].hora).toBeNull();
    // Componentes limpios, notas vacias a null.
    expect(c[2].componentes).toEqual(['180 g de salmón', 'ensalada']);
    expect(c[2].notas).toBeNull();
    expect(c[3].notas).toBe('Última comida del día.');
  });

  it('salta filas sin forma y tolera la columna ausente', () => {
    expect(comidasDePlan(null)).toEqual([]);
    expect(comidasDePlan(undefined)).toEqual([]);
    expect(comidasDePlan('[]')).toEqual([]);
    const c = comidasDePlan([
      { momento: 'merienda', hora: '10:00', nombre: 'X', componentes: [] },
      { momento: 'cena', hora: '25:00', nombre: 'Sin hora valida', componentes: ['a', 3, ''] },
      { momento: 'cena', nombre: '', componentes: ['a'] },
      'basura',
    ]);
    expect(c).toHaveLength(1);
    expect(c[0]).toEqual({ momento: 'cena', hora: null, nombre: 'Sin hora valida', componentes: ['a'], notas: null });
  });
});

describe('metasDelPlan y encabezadoComida', () => {
  it('arma solo las metas con numero, en el orden de la tarjeta', () => {
    expect(metasDelPlan({ calorie_target: 2200, protein_target: '150', carb_target: null, fat_target: 70, water_target: 2.8 }))
      .toEqual(['2200 kcal', '150 g de proteína', '70 g de grasa', '2.8 L de agua']);
    expect(metasDelPlan({ water_target: 3 })).toEqual(['3 L de agua']);
    expect(metasDelPlan({})).toEqual([]);
    expect(metasDelPlan({ calorie_target: 0, protein_target: -1 })).toEqual([]);
  });

  it('el encabezado lleva hora solo cuando el plan la fija', () => {
    const [con, sin] = comidasDePlan([meals[1], meals[2]]);
    expect(encabezadoComida(con)).toBe('07:30 · Desayuno');
    expect(encabezadoComida(sin)).toBe('Colación');
  });
});
