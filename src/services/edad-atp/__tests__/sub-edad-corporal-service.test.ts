import { describe, it, expect } from 'vitest';
import { computeEdadCorporal } from '../sub-edad-corporal-service';

describe('Sub-edad Corporal — SF dominio composicion_corporal (matriz)', () => {
  it('composición atlética → edad joven + CE > 0', () => {
    const r = computeEdadCorporal({
      paramValues: { grasa_corporal: 0.12, musculo_esqueletico: 0.45, grasa_visceral: 4, fuerza_de_agarre: 60 },
      sex: 'male',
      chronological_age: 40,
    });
    expect(r.ce_percent).toBeGreaterThan(0);
    expect(r.age_years).toBeLessThan(45);
  });

  it('sin datos → CE 0', () => {
    expect(computeEdadCorporal({ paramValues: {}, sex: 'male', chronological_age: 40 }).ce_percent).toBe(0);
  });
});
