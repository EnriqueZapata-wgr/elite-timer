import { describe, it, expect } from 'vitest';
import { computeEdadCorporal } from '../sub-edad-corporal-service';
import type { BodyComposition } from '@/src/types/edad-atp-v2';

const PATIENT_HOMBRES_V7: BodyComposition = {
  weight_kg: 87.4, height_cm: 183, body_fat_pct: 24.2, skeletal_muscle_pct: 34.6,
  visceral_fat: 10, grip_strength_kg: 57.4, ffmi: 19.6,
};

describe('Sub-edad Corporal', () => {
  it('paciente HOMBRES V7 (composición neutral) → ~52 ± 3', () => {
    const r = computeEdadCorporal({ body_composition: PATIENT_HOMBRES_V7, sex: 'male', chronological_age: 50 });
    expect(r.age_years).toBeGreaterThanOrEqual(49);
    expect(r.age_years).toBeLessThanOrEqual(55);
    expect(r.ce_percent).toBeCloseTo(100, 1);
  });

  it('composición atlética (mucho músculo, poca grasa) → más joven', () => {
    const athlete: BodyComposition = {
      weight_kg: 85, height_cm: 183, body_fat_pct: 12, skeletal_muscle_pct: 46,
      visceral_fat: 4, ffmi: 23,
    };
    const r = computeEdadCorporal({ body_composition: athlete, sex: 'male', chronological_age: 50 });
    expect(r.age_years).toBeLessThan(50);
  });

  it('composición pobre (alta grasa, bajo músculo) → más viejo', () => {
    const poor: BodyComposition = {
      weight_kg: 95, height_cm: 175, body_fat_pct: 32, skeletal_muscle_pct: 24,
      visceral_fat: 15, ffmi: 16,
    };
    const r = computeEdadCorporal({ body_composition: poor, sex: 'male', chronological_age: 50 });
    expect(r.age_years).toBeGreaterThan(50);
  });
});
