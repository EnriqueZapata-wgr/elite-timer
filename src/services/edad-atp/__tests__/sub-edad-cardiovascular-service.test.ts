import { describe, it, expect } from 'vitest';
import { computeAscvdRisk, computeEdadCardiovascular } from '../sub-edad-cardiovascular-service';

describe('Sub-edad Cardiovascular — ASCVD', () => {
  it('paciente HOMBRES V7 (conservador) → riesgo razonable + edad CV definida', () => {
    const r = computeEdadCardiovascular({
      chronological_age: 50, sex: 'male', race: 'other',
      total_cholesterol_mg_dl: 189, hdl_mg_dl: 38, systolic_bp_mmHg: 132,
      on_htn_treatment: false, has_diabetes: false, smoker: false,
    });
    const risk = r.components.ascvd_risk_10y_pct.value;
    expect(risk).toBeGreaterThan(0);
    expect(risk).toBeLessThan(30); // riesgo de 10 años plausible
    expect(r.age_years).toBeGreaterThanOrEqual(30);
    expect(r.age_years).toBeLessThanOrEqual(90);
  });

  it('perfil de alto riesgo → edad CV mayor que perfil óptimo', () => {
    const base = { chronological_age: 50, sex: 'male' as const, race: 'other' as const };
    const highRisk = computeEdadCardiovascular({
      ...base, total_cholesterol_mg_dl: 260, hdl_mg_dl: 30, systolic_bp_mmHg: 160,
      on_htn_treatment: true, has_diabetes: true, smoker: true,
    });
    const optimal = computeEdadCardiovascular({
      ...base, total_cholesterol_mg_dl: 170, hdl_mg_dl: 60, systolic_bp_mmHg: 110,
      on_htn_treatment: false, has_diabetes: false, smoker: false,
    });
    expect(highRisk.age_years).toBeGreaterThan(optimal.age_years);
  });

  it('riesgo aumenta con factores adversos', () => {
    const low = computeAscvdRisk('male', 'white', {
      age: 50, total_cholesterol_mg_dl: 170, hdl_mg_dl: 60, systolic_bp_mmHg: 110,
      on_htn_treatment: false, has_diabetes: false, smoker: false,
    });
    const high = computeAscvdRisk('male', 'white', {
      age: 50, total_cholesterol_mg_dl: 260, hdl_mg_dl: 30, systolic_bp_mmHg: 160,
      on_htn_treatment: true, has_diabetes: true, smoker: true,
    });
    expect(high).toBeGreaterThan(low);
  });
});
