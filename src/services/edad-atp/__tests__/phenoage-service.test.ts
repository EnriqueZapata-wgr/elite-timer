import { describe, it, expect } from 'vitest';
import { computePhenoAge } from '../phenoage-service';
import type { PhenoAgeBiomarkers } from '@/src/types/edad-atp-v2';

describe('PhenoAge — paciente HOMBRES V7 del Excel (50 años)', () => {
  const patient: PhenoAgeBiomarkers = {
    albumin_g_dl: 5.28,
    creatinine_mg_dl: 0.81,
    glucose_mg_dl: 90,
    crp_mg_dl: 0.18,
    lymphocyte_pct: 33,
    mcv_fl: 90,
    rdw_cv_pct: 12.8,
    alp_u_l: 71,
    wbc_per_ul: 7400,
    chronological_age: 50,
  };

  it('xb debe ser aproximadamente -9.158', () => {
    const result = computePhenoAge(patient);
    expect(result.xb).toBeCloseTo(-9.158, 2);
  });

  it('Mort_Score debe ser aproximadamente 0.02057', () => {
    const result = computePhenoAge(patient);
    expect(result.mort_score).toBeCloseTo(0.02057, 4);
  });

  it('PhenoAge debe ser 40.897 ± 0.1', () => {
    const result = computePhenoAge(patient);
    expect(result.phenoage).toBeCloseTo(40.897, 1);
  });

  it('PhenoAge no debe explotar si CRP es ~0', () => {
    const edgeCase = { ...patient, crp_mg_dl: 0.01 };
    expect(() => computePhenoAge(edgeCase)).not.toThrow();
    expect(Number.isFinite(computePhenoAge(edgeCase).phenoage)).toBe(true);
  });

  it('Albumin más alta debe rejuvenecer (PhenoAge menor)', () => {
    const better = { ...patient, albumin_g_dl: 5.0 };
    const worse = { ...patient, albumin_g_dl: 3.5 };
    expect(computePhenoAge(better).phenoage).toBeLessThan(computePhenoAge(worse).phenoage);
  });

  it('Edad cronológica afecta PhenoAge proporcionalmente', () => {
    const young = computePhenoAge({ ...patient, chronological_age: 30 }).phenoage;
    const old = computePhenoAge({ ...patient, chronological_age: 70 }).phenoage;
    expect(old).toBeGreaterThan(young);
  });
});
