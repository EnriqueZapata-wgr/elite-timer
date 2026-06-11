import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { computeEdadAtpV2FromInputs, type EdadAtpV2Inputs } from '../edad-atp-v2-service';
import { computeSFGlobalReal } from '../sf-9band-service';
import { MATRIZ_MUJERES } from '@/src/constants/edad-atp-matriz-v7-v6';
import { SF_DOMAIN_WEIGHTS } from '@/src/constants/edad-atp-v2-model';
import type { DomainKey } from '@/src/types/edad-atp-v2';

// No hay paciente MUJERES V6 en el handoff → perfil sintético sano + coherencia interna.
const FEMALE_PARAMS: Record<string, number> = {
  // cardiovascular
  colesterol_hdl: 65, colesterol_ldl: 95, colesterol_total: 180, trigliceridos: 75,
  presion_sistolica: 112, presion_diastolica: 70, apolipoproteinas_b: 72,
  // metabolismo
  glucosa_en_ayuno: 86, hba1c: 0.051, homair: 1.1, insulina: 5,
  // composicion
  grasa_corporal: 0.22, musculo_esqueletico: 0.36, grasa_visceral: 5, fuerza_de_agarre: 32,
  // renal / micro
  sodio: 140, potasio: 4.2, creatinina_serica: 0.8, vitamina_d: 40, magnesio: 2.1,
  // sistema hormonal
  tsh: 1.8, cortisol_matutino: 9,
};

describe('REGRESIÓN — MUJERES V6 (perfil sintético, coherencia interna)', () => {
  it('la matriz MUJERES V6 tiene los 10 dominios', () => {
    const doms = Object.keys(MATRIZ_MUJERES);
    expect(doms.length).toBe(10);
    expect(doms).toContain('renal_micronutrientes'); // clave canónica (no renal_y_*)
    expect(doms).toContain('cardiovascular');
  });

  it('computeSFGlobalReal female → SF en (0,1) con dominios puntuados', () => {
    const sf = computeSFGlobalReal(FEMALE_PARAMS, 'female', SF_DOMAIN_WEIGHTS as Record<DomainKey, number>);
    expect(sf.sf).toBeGreaterThan(0);
    expect(sf.sf).toBeLessThanOrEqual(1);
    expect(sf.ce_percent).toBeGreaterThan(0);
    // perfil sano → SF razonablemente alto
    expect(sf.sf).toBeGreaterThan(0.55);
    expect(Object.keys(sf.domain_scores).length).toBeGreaterThanOrEqual(6);
  });

  it('flow completo female → outputs finitos y plausibles', () => {
    const sf = computeSFGlobalReal(FEMALE_PARAMS, 'female', SF_DOMAIN_WEIGHTS as Record<DomainKey, number>);
    const inputs: EdadAtpV2Inputs = {
      chronological_age: 38,
      sex: 'female',
      phenoage_biomarkers: {
        albumin_g_dl: 4.6, creatinine_mg_dl: 0.8, glucose_mg_dl: 86, crp_mg_dl: 0.3,
        lymphocyte_pct: 34, mcv_fl: 89, rdw_cv_pct: 12.6, alp_u_l: 62, wbc_per_ul: 5800,
        chronological_age: 38,
      },
      domain_scores: sf.domain_scores as EdadAtpV2Inputs['domain_scores'],
      body_composition: { weight_kg: 62, height_cm: 165, body_fat_pct: 22, skeletal_muscle_pct: 36, visceral_fat: 5, grip_strength_kg: 32 },
      metabolic: {},
      cardiovascular: { total_cholesterol_mg_dl: 180, hdl_mg_dl: 65, systolic_bp_mmHg: 112, on_htn_treatment: false, has_diabetes: false, smoker: false },
      fitness: {},
      paramValues: FEMALE_PARAMS,
    };
    const r = computeEdadAtpV2FromInputs(inputs);
    expect(r.phenoage).toBeGreaterThan(0);
    expect(Number.isFinite(r.edad_integral)).toBe(true);
    expect(r.edad_integral).toBeGreaterThan(15);
    expect(r.edad_integral).toBeLessThan(90);
    expect(r.sf_score).toBeGreaterThan(0.5);
    // sub-edades definidas
    for (const k of ['metabolica', 'corporal', 'cardiovascular', 'fitness'] as const) {
      expect(Number.isFinite(r.sub_edades[k].age_years)).toBe(true);
    }
  });
});
