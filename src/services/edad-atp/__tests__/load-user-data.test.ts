import { describe, it, expect, vi, beforeEach } from 'vitest';

// Estado mutable de tablas (hoisted para que el factory de vi.mock lo vea).
const state = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));

// Mock de supabase: from(table) → query chainable thenable que resuelve { data, error }.
// Los filtros .eq() se ignoran (devuelve todas las filas de la tabla); is_voided lo maneja
// el dedupe de lab-values-service, así que basta con poblar las tablas.
vi.mock('@/src/lib/supabase', () => {
  const makeQuery = (rows: any[]) => {
    const q: any = {
      select: () => q, eq: () => q, order: () => q, limit: () => q, like: () => q, not: () => q,
      insert: () => q, update: () => q, upsert: () => q,
      then: (resolve: any) => resolve({ data: rows, error: null }),
    };
    return q;
  };
  return { supabase: { from: (t: string) => makeQuery(state.tables[t] ?? []) } };
});
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { loadUserData } from '../edad-atp-v2-service';

beforeEach(() => { state.tables = {}; });

// Helper: fila de lab_values canónica.
const lv = (parameter_key: string, value: number, measured_at = '2026-03-01', source = 'lab_pdf') =>
  ({ parameter_key, value, measured_at, source, is_voided: false });

describe('loadUserData — lectura desde la fuente única lab_values', () => {
  it('solo lab_values → mapea sus campos vía bridge PhenoAge, el resto undefined', async () => {
    state.tables.lab_values = [
      lv('glucosa_en_ayuno', 92), lv('hba1c', 0.054), lv('colesterol_hdl', 55),
      lv('creatinina_serica', 0.9), lv('leucocitos_totales', 6200),
      lv('proteina_c_reactiva_cuantitativa_pcr', 0.3), lv('colesterol_total', 180),
      lv('colesterol_ldl', 100), lv('trigliceridos', 90), lv('insulina', 5),
    ];
    const d = await loadUserData('u1');
    expect(d.glucose_mg_dl).toBe(92);
    expect(d.hba1c_pct).toBeCloseTo(5.4, 5); // store decimal 0.054 → % 5.4
    expect(d.pcr_mg_dl).toBe(0.3);
    expect(d.total_cholesterol_mg_dl).toBe(180);
    expect(d.albumin_g_dl).toBeUndefined();
    expect(d.mcv_fl).toBeUndefined();
    expect(d.weight_kg).toBeUndefined();
    expect(d.data_sources_used).toEqual(['lab_values']);
  });

  it('lab_values + health_measurements → unifica (músculo kg→pct, vitals)', async () => {
    state.tables.lab_values = [lv('glucosa_en_ayuno', 92), lv('colesterol_hdl', 55)];
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
    expect(d.data_sources_used).toContain('lab_values');
    expect(d.data_sources_used).toContain('health_measurements');
  });

  it('precedencia POR FECHA dentro de lab_values: el más reciente gana', async () => {
    state.tables.lab_values = [
      lv('glucosa_en_ayuno', 90, '2026-01-01', 'lab_pdf'),
      lv('glucosa_en_ayuno', 95, '2026-03-01', 'manual'),
    ];
    const d = await loadUserData('u1');
    expect(d.glucose_mg_dl).toBe(95); // 2026-03-01 > 2026-01-01
  });

  it('PhenoAge nuevos (albumin/alp/mcv/lymphocyte_pct/rdw) desde lab_values', async () => {
    state.tables.lab_values = [
      lv('albumin', 4.48), lv('alp', 57), lv('lymphocyte_pct', 43),
      lv('mcv', 88.6), lv('rdw_cv', 0.129),
    ];
    const d = await loadUserData('u1');
    expect(d.albumin_g_dl).toBe(4.48);
    expect(d.alp_u_l).toBe(57);
    expect(d.lymphocyte_pct).toBe(43);
    expect(d.mcv_fl).toBe(88.6);
    expect(d.rdw_cv_pct).toBeCloseTo(12.9, 5); // store decimal 0.129 → % 12.9
  });

  it('data_sources_used + sexo/edad desde client_profiles; biomarkers no-lab como vitals', async () => {
    state.tables.client_profiles = [{ date_of_birth: '1980-05-15', biological_sex: 'female', height_cm: 165 }];
    state.tables.lab_values = [lv('albumin', 4.6)];
    state.tables.edad_atp_biomarkers = [{ biomarker_key: 'systolic_bp', value: 120, measured_at: '2026-03-01' }];
    state.tables.edad_atp_questionnaire_responses = [
      { domain: 'metabolismo', parameter_key: 'metabolic_flexibility', value_text: 'excelente' },
      { domain: 'sueno', parameter_key: 'sleep_hours', value_text: '5-6' },
    ];
    state.tables.edad_atp_functional_tests = [{ test_key: 'reaction_time_simple', value_primary: 280 }];
    const d = await loadUserData('u1');
    expect(d.sex).toBe('female');
    expect(d.chronological_age).toBeGreaterThan(0);
    expect(d.albumin_g_dl).toBe(4.6);
    expect(d.systolic_bp_mmHg).toBe(120); // vital desde edad_atp_biomarkers (no-lab)
    expect(d.height_cm).toBe(165);
    expect(d.reaction_time_simple_ms).toBe(280);
    expect(d.sf_scores_by_domain?.metabolismo).toBe(100);
    expect(d.data_sources_used).toContain('lab_values');
    expect(d.data_sources_used).toContain('edad_atp_biomarkers');
    expect(d.data_sources_used).toContain('edad_atp_questionnaire_responses');
    expect(d.data_sources_used).toContain('edad_atp_functional_tests');
    expect(d.data_sources_used).not.toContain('lab_results');
  });

  it('sin datos → defaults (edad 40, sexo male) y data_sources vacío', async () => {
    const d = await loadUserData('u1');
    expect(d.chronological_age).toBe(40);
    expect(d.sex).toBe('male');
    expect(d.data_sources_used).toEqual([]);
  });
});
