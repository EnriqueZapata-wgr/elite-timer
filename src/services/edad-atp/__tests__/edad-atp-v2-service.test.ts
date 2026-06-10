import { describe, it, expect, vi } from 'vitest';

// El servicio importa supabase + logger (→ react-native/Sentry). Mock para node.
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { computeEdadAtpV2FromInputs, type EdadAtpV2Inputs } from '../edad-atp-v2-service';
import type { DomainKey } from '@/src/types/edad-atp-v2';

const DOMAIN_SCORES: Partial<Record<DomainKey, number>> = {
  metabolismo: 52.87, habitos: 57.50, cardiovascular: 51.30, sueno: 60.08,
  sistema_hormonal: 62.00, vitalidad: 59.55, inflamacion: 66.22,
  composicion_corporal: 50.00, renal_micronutrientes: 82.42, inmunidad: 89.60,
};

const BASE_INPUTS: EdadAtpV2Inputs = {
  chronological_age: 50,
  sex: 'male',
  phenoage_biomarkers: {
    albumin_g_dl: 5.28, creatinine_mg_dl: 0.81, glucose_mg_dl: 90, crp_mg_dl: 0.18,
    lymphocyte_pct: 33, mcv_fl: 90, rdw_cv_pct: 12.8, alp_u_l: 71, wbc_per_ul: 7400,
    chronological_age: 50,
  },
  domain_scores: DOMAIN_SCORES,
  body_composition: {
    weight_kg: 87.4, height_cm: 183, body_fat_pct: 24.2, skeletal_muscle_pct: 34.6,
    visceral_fat: 10, grip_strength_kg: 57.4, ffmi: 19.6,
  },
  metabolic: { glucose_mg_dl: 90, insulin_uU_ml: 6, hba1c_pct: 5.5, hdl_mg_dl: 45, triglycerides_mg_dl: 110, waist_cm: 95 },
  cardiovascular: { total_cholesterol_mg_dl: 189, hdl_mg_dl: 38, systolic_bp_mmHg: 132, on_htn_treatment: false, has_diabetes: false, smoker: false, race: 'other' },
  fitness: { vo2max_ml_kg_min: 35, grip_strength_kg: 57.4, push_ups_max: 20, resting_hr_bpm: 65, recovery_hr_drop_bpm: 18 },
};

describe('Edad ATP v2 — orquestador E2E (paciente HOMBRES V7)', () => {
  it('con cognitivo (curva Der & Deary 2006) → Edad Integral ajustada', () => {
    // RT 301/459 → edad cognitiva ~33.3 con la curva recalibrada (antes daba 58).
    const result = computeEdadAtpV2FromInputs({
      ...BASE_INPUTS,
      reaction_time: { rt_simple_ms: 301, rt_choice_ms: 459 },
    });
    expect(result.algoritmo_excel).toBeCloseTo(54.55, 1);
    expect(result.sub_edades.cognitiva.age_years).toBeCloseTo(33.3, 1);
    expect(result.modificador_cognitivo).toBeCloseTo(-1.5, 1); // clamp ±1.5
    expect(result.edad_integral).toBeCloseTo(53.05, 1);
  });

  it('sin cognitivo → Edad Integral = Algoritmo Excel', () => {
    const result = computeEdadAtpV2FromInputs(BASE_INPUTS);
    expect(result.modificador_cognitivo).toBe(0);
    expect(result.edad_integral).toBe(result.algoritmo_excel);
    expect(result.edad_integral).toBeCloseTo(54.55, 1);
  });

  it('reporta las 5 sub-edades + métricas core', () => {
    const result = computeEdadAtpV2FromInputs(BASE_INPUTS);
    expect(result.phenoage).toBeCloseTo(40.90, 1);
    expect(result.sf_score).toBeCloseTo(0.6083, 3);
    expect(result.ritmo_envejecimiento).toBeCloseTo(14.66, 1);
    expect(result.sub_edades.metabolica.age_years).toBeGreaterThan(0);
    expect(result.sub_edades.corporal.age_years).toBeGreaterThan(0);
    expect(result.sub_edades.cardiovascular.age_years).toBeGreaterThan(0);
    expect(result.sub_edades.fitness.age_years).toBeGreaterThan(0);
  });
});
