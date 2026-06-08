import { describe, it, expect } from 'vitest';
import { computeEdadFitness } from '../sub-edad-fitness-service';

describe('Sub-edad Fitness', () => {
  it('atleta → más joven que cronológica', () => {
    const r = computeEdadFitness({
      vo2max_ml_kg_min: 52, grip_strength_kg: 55, push_ups_max: 40,
      resting_hr_bpm: 48, recovery_hr_drop_bpm: 32, sex: 'male', chronological_age: 50,
    });
    expect(r.age_years).toBeLessThan(45);
    expect(r.ce_percent).toBeCloseTo(100, 1);
  });

  it('sedentario → más viejo', () => {
    const r = computeEdadFitness({
      vo2max_ml_kg_min: 24, grip_strength_kg: 24, push_ups_max: 2,
      resting_hr_bpm: 88, recovery_hr_drop_bpm: 9, sex: 'male', chronological_age: 50,
    });
    expect(r.age_years).toBeGreaterThan(55);
  });

  it('solo VO2max y grip (resto faltante) → CE reducido', () => {
    const r = computeEdadFitness({
      vo2max_ml_kg_min: 38, grip_strength_kg: 45, sex: 'male', chronological_age: 50,
    });
    // VO2max 0.35 + grip 0.25 = 0.60 presente.
    expect(r.ce_percent).toBeCloseTo(60, 1);
    expect(r.components.push_ups.missing).toBe(true);
  });
});
