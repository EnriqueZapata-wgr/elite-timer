import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { resolveParamValues } from '../load-all-params';

const EMPTY = { canon: {}, hm: {}, quest: {}, ft: {} };

describe('resolveParamValues — labs desde el mapa canónico (lab_values)', () => {
  it('lee params de Laboratorio por clave de matriz (ya convertidos al escribir)', () => {
    // canon viene de lab_values: claves de matriz español, unidades de matriz (decimales).
    const out = resolveParamValues('male', {
      ...EMPTY,
      canon: {
        colesterol_hdl: 38.2, colesterol_ldl: 149.3, colesterol_total: 189,
        hba1c: 0.059, hematocrito: 0.473, trigliceridos: 124,
      },
    });
    expect(out.colesterol_hdl).toBe(38.2);
    expect(out.colesterol_ldl).toBe(149.3);
    expect(out.colesterol_total).toBe(189);
    expect(out.hba1c).toBeCloseTo(0.059, 4);
    expect(out.hematocrito).toBeCloseTo(0.473, 4);
  });

  it('calcula los ratios computed (LDL/HDL, TG/HDL) sobre el canónico', () => {
    const out = resolveParamValues('male', {
      ...EMPTY,
      canon: { colesterol_hdl: 40, colesterol_ldl: 120, trigliceridos: 100 },
    });
    expect(out.indice_de_lipoproteinas_ldlhdl).toBeCloseTo(3.0, 5); // 120/40
    expect(out.relacion_trigliceridos_hdl).toBeCloseTo(2.5, 5); // 100/40
  });

  it('manual (lab sin columna) también desde el canónico por clave de matriz', () => {
    const out = resolveParamValues('male', {
      ...EMPTY,
      ft: { pushups: 30, vo2_max: 55 },
      quest: { ayuno_intermitente: 16, ejercicio_semanal: 8 },
    });
    expect(out.pushups).toBe(30);
    expect(out.vo2_max).toBe(55);
    expect(out.ayuno_intermitente).toBe(16);
    expect(out.ejercicio_semanal).toBe(8);
  });

  it('wearable → health_measurements column', () => {
    const out = resolveParamValues('male', { ...EMPTY, hm: { resting_hr: 50 } });
    expect(out.frecuencia_cardiaca_en_reposo_sueno).toBe(50);
  });

  it('sin datos → dict vacío (No Data, no rompe)', () => {
    expect(Object.keys(resolveParamValues('male', EMPTY)).length).toBe(0);
  });
});

describe('composición corporal desde health_measurements (paciente Enrique)', () => {
  const HM_ENRIQUE = {
    weight_kg: 79, height_cm: 178, body_fat_pct: 11,
    muscle_mass_kg: 55, visceral_fat: 3, grip_strength_kg: 77.8,
  };

  it('resuelve los 4 params de composición con datos en DB + conversión a fracción', () => {
    const out = resolveParamValues('male', { ...EMPTY, hm: HM_ENRIQUE });
    expect(out.grasa_corporal).toBeCloseTo(0.11, 5);
    expect(out.musculo_esqueletico).toBeCloseTo(55 / 79, 5);
    expect(out.fuerza_de_agarre).toBe(77.8);
    expect(out.grasa_visceral).toBe(3);
  });

  it('skeletal_muscle_pct directo gana sobre el derivado kg/peso', () => {
    const out = resolveParamValues('male', {
      ...EMPTY, hm: { ...HM_ENRIQUE, skeletal_muscle_pct: 42 },
    });
    expect(out.musculo_esqueletico).toBeCloseTo(0.42, 5);
  });

  it('musculo_esqueletico ausente si no hay ni pct ni kg/peso (no inventa)', () => {
    const out = resolveParamValues('male', { ...EMPTY, hm: { body_fat_pct: 11 } });
    expect(out.grasa_corporal).toBeCloseTo(0.11, 5);
    expect(out.musculo_esqueletico).toBeUndefined();
  });

  it('edad_corporal y pullups siguen resolviendo desde questionnaire (flag #2)', () => {
    const out = resolveParamValues('male', {
      ...EMPTY, hm: HM_ENRIQUE, quest: { edad_corporal: -5, pullups: 30 },
    });
    expect(out.edad_corporal).toBe(-5);
    expect(out.pullups).toBe(30);
  });
});
