import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { resolveParamValues } from '../load-all-params';

const EMPTY = { lab: {}, bio: {}, ext: {}, hm: {}, quest: {}, ft: {} };

describe('resolveParamValues — mapeo de fuentes → claves de matriz', () => {
  it('lab columns inglesas → claves español + conversión de unidades', () => {
    const out = resolveParamValues('male', {
      ...EMPTY,
      lab: { hdl: 38.2, ldl: 149.3, cholesterol_total: 189, hba1c: 5.9, hematocrit: 47.3, triglycerides: 124 },
    });
    expect(out.colesterol_hdl).toBe(38.2);
    expect(out.colesterol_ldl).toBe(149.3);
    expect(out.colesterol_total).toBe(189);
    expect(out.hba1c).toBeCloseTo(0.059, 4); // 5.9% → 0.059 decimal
    expect(out.hematocrito).toBeCloseTo(0.473, 4);
  });

  it('calcula los ratios computed (LDL/HDL, TG/HDL)', () => {
    const out = resolveParamValues('male', { ...EMPTY, lab: { hdl: 40, ldl: 120, triglycerides: 100 } });
    expect(out.indice_de_lipoproteinas_ldlhdl).toBeCloseTo(3.0, 5); // 120/40
    expect(out.relacion_trigliceridos_hdl).toBeCloseTo(2.5, 5); // 100/40
  });

  it('manual (edad_atp_biomarkers) + functional_test + questionnaire por clave de matriz', () => {
    const out = resolveParamValues('male', {
      ...EMPTY,
      bio: { albumina: 4.8 }, // lab sin columna → manual por clave de matriz
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
