import { describe, it, expect } from 'vitest';
import { computeEdadMetabolica } from '../sub-edad-metabolica-service';

describe('Sub-edad Metabólica', () => {
  it('caso ideal → más joven que cronológica', () => {
    const r = computeEdadMetabolica({
      glucose_mg_dl: 85, insulin_uU_ml: 4, hba1c_pct: 5.0, hdl_mg_dl: 60,
      triglycerides_mg_dl: 80, cgm_time_in_range_pct: 95, waist_cm: 82,
      sex: 'male', chronological_age: 50,
    });
    expect(r.age_years).toBeLessThan(50);
    expect(r.ce_percent).toBeCloseTo(100, 1);
  });

  it('resistencia a insulina → más viejo', () => {
    const r = computeEdadMetabolica({
      glucose_mg_dl: 110, insulin_uU_ml: 18, hba1c_pct: 6.0, hdl_mg_dl: 35,
      triglycerides_mg_dl: 200, cgm_time_in_range_pct: 55, waist_cm: 105,
      sex: 'male', chronological_age: 50,
    });
    expect(r.age_years).toBeGreaterThan(50);
    expect(r.components.homa_ir.score_0_100).toBeLessThan(50); // HOMA-IR ~4.9 → RI
  });

  it('sin CGM → CE reducido, peso redistribuido', () => {
    const r = computeEdadMetabolica({
      glucose_mg_dl: 85, insulin_uU_ml: 4, hba1c_pct: 5.0, hdl_mg_dl: 60,
      triglycerides_mg_dl: 80, waist_cm: 82, // sin cgm
      sex: 'male', chronological_age: 50,
    });
    expect(r.components.cgm_tir.missing).toBe(true);
    expect(r.ce_percent).toBeCloseTo(80, 1); // falta el 20% del CGM
    expect(r.age_years).toBeLessThan(50); // sigue joven (peso redistribuido)
  });
});
