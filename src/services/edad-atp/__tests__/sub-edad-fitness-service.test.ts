import { describe, it, expect } from 'vitest';
import { computeEdadFitness } from '../sub-edad-fitness-service';

describe('Sub-edad Fitness — SF dominio vitalidad (matriz)', () => {
  it('perfil con fuerza/energía altas → edad joven + CE > 0', () => {
    const r = computeEdadFitness({
      paramValues: { fuerza_de_agarre: 60, musculo_esqueletico: 0.45, energia_diaria: 9, motivacion_y_entusiasmo: 9, vitamina_b12: 600, magnesio: 2.2 },
      sex: 'male',
      chronological_age: 40,
    });
    expect(r.ce_percent).toBeGreaterThan(0);
    expect(r.age_years).toBeLessThan(48);
  });

  it('sin datos → CE 0', () => {
    expect(computeEdadFitness({ paramValues: {}, sex: 'male', chronological_age: 40 }).ce_percent).toBe(0);
  });
});
