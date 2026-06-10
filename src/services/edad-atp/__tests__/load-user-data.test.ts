import { describe, it, expect, vi, beforeEach } from 'vitest';

// Estado mutable de tablas (hoisted para que el factory de vi.mock lo vea).
const state = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));

// Mock de supabase: from(table) → query chainable thenable que resuelve { data, error }.
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

import { loadUserData } from '../edad-atp-v2-service';

beforeEach(() => { state.tables = {}; });

describe('loadUserData — lectura unificada de fuentes existentes', () => {
  it('solo lab_results → mapea sus campos, el resto undefined', async () => {
    state.tables.lab_results = [{
      glucose: 92, hba1c: 5.4, hdl: 55, creatinine: 0.9, wbc: 6200,
      pcr: 0.3, cholesterol_total: 180, ldl: 100, triglycerides: 90, insulin: 5, lab_date: '2026-01-01',
    }];
    const d = await loadUserData('u1');
    expect(d.glucose_mg_dl).toBe(92);
    expect(d.hba1c_pct).toBe(5.4);
    expect(d.pcr_mg_dl).toBe(0.3);
    expect(d.total_cholesterol_mg_dl).toBe(180);
    // Los 5 PhenoAge "nuevos" no existen en lab_results → undefined.
    expect(d.albumin_g_dl).toBeUndefined();
    expect(d.mcv_fl).toBeUndefined();
    // Sin composición.
    expect(d.weight_kg).toBeUndefined();
    expect(d.data_sources_used).toEqual(['lab_results']);
  });

  it('lab_results + health_measurements → unifica ambos (músculo kg→pct)', async () => {
    state.tables.lab_results = [{ glucose: 92, hdl: 55, lab_date: '2026-01-01' }];
    state.tables.health_measurements = [{
      weight_kg: 80, height_cm: 178, body_fat_pct: 18, muscle_mass_kg: 36,
      systolic_bp: 118, resting_hr: 58, vo2max_estimate: 42, date: '2026-02-01',
    }];
    const d = await loadUserData('u1');
    expect(d.glucose_mg_dl).toBe(92);
    expect(d.weight_kg).toBe(80);
    expect(d.skeletal_muscle_pct).toBeCloseTo(45, 5); // 36/80*100
    expect(d.systolic_bp_mmHg).toBe(118);
    expect(d.vo2max_ml_kg_min).toBe(42);
    expect(d.data_sources_used).toContain('lab_results');
    expect(d.data_sources_used).toContain('health_measurements');
  });

  it('conflicto glucose: edad_atp_biomarkers gana sobre lab_results', async () => {
    state.tables.lab_results = [{ glucose: 90, lab_date: '2026-01-01' }];
    state.tables.edad_atp_biomarkers = [{ biomarker_key: 'glucose', value: 95, measured_at: '2026-03-01' }];
    const d = await loadUserData('u1');
    expect(d.glucose_mg_dl).toBe(95);
  });

  it('lab_uploads.extracted_data se considera (sobre lab_results, bajo biomarkers)', async () => {
    state.tables.lab_uploads = [{ extracted_data: { values: { glucose: { value: 88, unit: 'mg/dL' } } } }];
    state.tables.lab_results = [{ glucose: 90, lab_date: '2026-01-01' }];
    const d = await loadUserData('u1');
    expect(d.glucose_mg_dl).toBe(88); // extracted_data > lab_results
    expect(d.data_sources_used).toContain('lab_uploads');
  });

  it('data_sources_used + sexo/edad desde client_profiles', async () => {
    state.tables.client_profiles = [{ date_of_birth: '1980-05-15', biological_sex: 'female', height_cm: 165 }];
    state.tables.edad_atp_biomarkers = [{ biomarker_key: 'albumin', value: 4.6, measured_at: '2026-03-01' }];
    state.tables.edad_atp_questionnaire_responses = [
      { domain: 'metabolismo', parameter_key: 'metabolic_flexibility', value_text: 'excelente' }, // → 100
      { domain: 'sueno', parameter_key: 'sleep_hours', value_text: '5-6' }, // → 33
    ];
    state.tables.edad_atp_functional_tests = [{ test_key: 'reaction_time_simple', value_primary: 280 }];
    const d = await loadUserData('u1');
    expect(d.sex).toBe('female');
    expect(d.chronological_age).toBeGreaterThan(0);
    expect(d.albumin_g_dl).toBe(4.6);
    expect(d.height_cm).toBe(165); // de client_profiles (fallback)
    expect(d.reaction_time_simple_ms).toBe(280);
    expect(d.sf_scores_by_domain?.metabolismo).toBe(100); // 'excelente' = más sano
    expect(d.data_sources_used).toContain('edad_atp_biomarkers');
    expect(d.data_sources_used).toContain('edad_atp_questionnaire_responses');
    expect(d.data_sources_used).toContain('edad_atp_functional_tests');
    expect(d.data_sources_used).not.toContain('lab_results');
  });

  it('los 5 PhenoAge nuevos se leen desde lab_uploads.extracted_data (key rdw)', async () => {
    state.tables.lab_uploads = [{ extracted_data: { values: {
      albumin: { value: 4.48, unit: 'g/dL' },
      alp: { value: 57, unit: 'U/L' },
      lymphocyte_pct: { value: 43, unit: '%' },
      mcv: { value: 88.6, unit: 'fL' },
      rdw: { value: 12.9, unit: '%' },
    } } }];
    const d = await loadUserData('u1');
    expect(d.albumin_g_dl).toBe(4.48);
    expect(d.alp_u_l).toBe(57);
    expect(d.lymphocyte_pct).toBe(43);
    expect(d.mcv_fl).toBe(88.6);
    expect(d.rdw_cv_pct).toBe(12.9); // desde la key 'rdw'
  });

  it('extracted_data shape FLAT { albumin: 4.48 } también se lee', async () => {
    state.tables.lab_uploads = [{ extracted_data: { albumin: 4.48, glucose: 88 } }];
    const d = await loadUserData('u1');
    expect(d.albumin_g_dl).toBe(4.48);
    expect(d.glucose_mg_dl).toBe(88);
    expect(d.data_sources_used).toContain('lab_uploads');
  });

  it('los 5 PhenoAge nuevos se leen desde columnas de lab_results (mig 017)', async () => {
    state.tables.lab_results = [{
      albumin: 4.6, alp: 60, lymphocyte_pct: 38, mcv: 89, rdw: 13.1, lab_date: '2026-01-01',
    }];
    const d = await loadUserData('u1');
    expect(d.albumin_g_dl).toBe(4.6);
    expect(d.alp_u_l).toBe(60);
    expect(d.lymphocyte_pct).toBe(38);
    expect(d.mcv_fl).toBe(89);
    expect(d.rdw_cv_pct).toBe(13.1);
  });

  it('jerarquía PhenoAge: edad_atp_biomarkers > extracted_data > lab_results', async () => {
    state.tables.lab_results = [{ albumin: 4.6, lab_date: '2026-01-01' }];
    state.tables.lab_uploads = [{ extracted_data: { values: { albumin: { value: 4.5 } } } }];
    state.tables.edad_atp_biomarkers = [{ biomarker_key: 'albumin', value: 4.4, measured_at: '2026-03-01' }];
    const d = await loadUserData('u1');
    expect(d.albumin_g_dl).toBe(4.4); // manual gana
  });

  it('sin datos → defaults (edad 40, sexo male) y data_sources vacío', async () => {
    const d = await loadUserData('u1');
    expect(d.chronological_age).toBe(40);
    expect(d.sex).toBe('male');
    expect(d.data_sources_used).toEqual([]);
  });
});
