import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { scoreOption, scoreQuestionnaireResponses } from '../questionnaire-scoring';
import { computeEdadAtpV2FromInputs, type EdadAtpV2Inputs } from '../edad-atp-v2-service';
import type { DomainKey } from '@/src/types/edad-atp-v2';

describe('questionnaire-scoring — scoreOption', () => {
  it('opción más sana = 100, menos sana = 0', () => {
    expect(scoreOption('sistema_hormonal', 'libido', 'alta')).toBe(100);
    expect(scoreOption('sistema_hormonal', 'libido', 'muy_baja')).toBe(0);
  });
  it('maneja órdenes invertidos (best-first y worst-first)', () => {
    expect(scoreOption('metabolismo', 'meals_per_day', '1')).toBe(100); // best-first
    expect(scoreOption('metabolismo', 'metabolic_flexibility', 'excelente')).toBe(100); // worst-first
  });
  it('valores desconocidos → 50 neutral', () => {
    expect(scoreOption('cardiovascular', 'family_history', 'desconocido')).toBe(50);
    expect(scoreOption('cardiovascular', 'bp_known', 'desconocido')).toBe(50);
    expect(scoreOption('foo', 'bar', 'baz')).toBe(50);
  });
});

describe('questionnaire-scoring — promedio por dominio', () => {
  it('respuestas saludables → score de dominio alto', () => {
    const rows = [
      { domain: 'vitalidad', parameter_key: 'daily_energy', value_text: 'alta' }, // 100
      { domain: 'vitalidad', parameter_key: 'motivation', value_text: 'buena' }, // 67
      { domain: 'vitalidad', parameter_key: 'mental_clarity', value_text: 'excelente' }, // 100
    ];
    const out = scoreQuestionnaireResponses(rows);
    expect(out.vitalidad).toBeGreaterThanOrEqual(75);
  });
});

// SF global con respuestas saludables (mayoría primera/segunda opción) → SF ≥ 0.75.
describe('SF global desde respuestas saludables', () => {
  it('domain_scores ~80 → sf_score ≥ 0.75', () => {
    const ALL: DomainKey[] = [
      'cardiovascular', 'composicion_corporal', 'habitos', 'inflamacion', 'inmunidad',
      'metabolismo', 'renal_micronutrientes', 'sistema_hormonal', 'sueno', 'vitalidad',
    ];
    const domain_scores: Partial<Record<DomainKey, number>> = {};
    for (const d of ALL) domain_scores[d] = 80;

    const inputs: EdadAtpV2Inputs = {
      chronological_age: 35,
      sex: 'male',
      phenoage_biomarkers: {
        albumin_g_dl: 4.8, creatinine_mg_dl: 0.9, glucose_mg_dl: 85, crp_mg_dl: 0.2,
        lymphocyte_pct: 35, mcv_fl: 89, rdw_cv_pct: 12.5, alp_u_l: 60, wbc_per_ul: 5500,
        chronological_age: 35,
      },
      domain_scores,
      body_composition: { weight_kg: 80, height_cm: 178, body_fat_pct: 12, skeletal_muscle_pct: 45, visceral_fat: 4 },
      metabolic: { glucose_mg_dl: 85, insulin_uU_ml: 4, hba1c_pct: 5.1, hdl_mg_dl: 60, triglycerides_mg_dl: 70 },
      cardiovascular: { total_cholesterol_mg_dl: 170, hdl_mg_dl: 60, systolic_bp_mmHg: 115, on_htn_treatment: false, has_diabetes: false, smoker: false, race: 'other' },
      fitness: { vo2max_ml_kg_min: 55, grip_strength_kg: 60, resting_hr_bpm: 50 },
    };
    const r = computeEdadAtpV2FromInputs(inputs);
    expect(r.sf_score).toBeGreaterThanOrEqual(0.75);
  });
});
