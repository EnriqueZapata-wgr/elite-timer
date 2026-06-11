import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));

vi.mock('@/src/lib/supabase', () => {
  const makeQuery = (rows: any[]) => {
    const q: any = {
      select: () => q, eq: () => q, order: () => q, limit: () => q, like: () => q, not: () => q, insert: () => q,
      then: (resolve: any) => resolve({ data: rows, error: null }),
    };
    return q;
  };
  return { supabase: { from: (t: string) => makeQuery(state.tables[t] ?? []) } };
});
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { buildInputsFromUnified, computeEdadAtpV2, type UnifiedUserData } from '../edad-atp-v2-service';

beforeEach(() => { state.tables = {}; });

describe('buildInputsFromUnified — mapea UnifiedUserData → EdadAtpV2Inputs', () => {
  it('rellena PhenoAge faltantes con defaults y conserva los presentes', () => {
    const data: UnifiedUserData = {
      chronological_age: 45, sex: 'female',
      glucose_mg_dl: 92, albumin_g_dl: 4.7,
      sf_scores_by_domain: { metabolismo: 50 },
      data_sources_used: ['lab_results', 'edad_atp_biomarkers'],
    };
    const inputs = buildInputsFromUnified(data);
    expect(inputs.chronological_age).toBe(45);
    expect(inputs.sex).toBe('female');
    expect(inputs.phenoage_biomarkers.glucose_mg_dl).toBe(92); // presente
    expect(inputs.phenoage_biomarkers.albumin_g_dl).toBe(4.7); // presente
    expect(inputs.phenoage_biomarkers.mcv_fl).toBe(90); // default
    expect(inputs.phenoage_biomarkers.chronological_age).toBe(45);
    expect(inputs.domain_scores.metabolismo).toBe(50);
    // Composición usa defaults cuando falta.
    expect(inputs.body_composition.weight_kg).toBe(80);
    expect(inputs.cardiovascular.race).toBe('other');
    expect(inputs.reaction_time).toBeUndefined();
  });

  it('deriva has_diabetes desde HbA1c ≥ 6.5 o glucosa ≥ 126', () => {
    const base: UnifiedUserData = { chronological_age: 50, sex: 'male', data_sources_used: [] };
    expect(buildInputsFromUnified(base).cardiovascular.has_diabetes).toBe(false);
    expect(buildInputsFromUnified({ ...base, hba1c_pct: 6.7 }).cardiovascular.has_diabetes).toBe(true);
    expect(buildInputsFromUnified({ ...base, glucose_mg_dl: 130 }).cardiovascular.has_diabetes).toBe(true);
    expect(buildInputsFromUnified({ ...base, hba1c_pct: 5.4, glucose_mg_dl: 90 }).cardiovascular.has_diabetes).toBe(false);
  });

  it('arma reaction_time solo si ambos RT están presentes', () => {
    const base: UnifiedUserData = { chronological_age: 40, sex: 'male', data_sources_used: [] };
    expect(buildInputsFromUnified({ ...base, reaction_time_simple_ms: 280 }).reaction_time).toBeUndefined();
    const both = buildInputsFromUnified({ ...base, reaction_time_simple_ms: 280, reaction_time_choice_ms: 420 });
    expect(both.reaction_time).toEqual({ rt_simple_ms: 280, rt_choice_ms: 420 });
  });
});

describe('computeEdadAtpV2 — E2E desde fuentes existentes (sin tablas nuevas)', () => {
  it('usuario con solo lab_results + health_measurements → calcula Edad Integral', async () => {
    state.tables.client_profiles = [{ date_of_birth: '1981-01-01', biological_sex: 'male' }];
    state.tables.lab_results = [{
      glucose: 90, creatinine: 0.9, pcr: 0.2, wbc: 6000, hdl: 50, ldl: 100,
      triglycerides: 90, cholesterol_total: 180, hba1c: 5.4, insulin: 5, lab_date: '2026-01-01',
    }];
    state.tables.health_measurements = [{
      weight_kg: 80, height_cm: 178, body_fat_pct: 18, muscle_mass_kg: 36,
      systolic_bp: 118, resting_hr: 58, vo2max_estimate: 42, date: '2026-02-01',
    }];
    const r = await computeEdadAtpV2('u1');
    expect(Number.isFinite(r.edad_integral)).toBe(true);
    expect(r.edad_integral).toBeGreaterThan(0);
    expect(r.chronological_age).toBeGreaterThan(0);
    // Motor v2: sub-edades por área (labs/composicion/fitness/cognicion/riesgos).
    expect(r.sub_edades.riesgos.age_years).toBeGreaterThan(0);
    expect(r.sub_edades.composicion.age_years).toBeGreaterThan(0);
    expect(r.sub_edades.labs.age_years).toBeGreaterThan(0);
    // v2 no usa modificador cognitivo separado (cognición se promedia en las áreas).
    expect(r.modificador_cognitivo).toBe(0);
  });
});
