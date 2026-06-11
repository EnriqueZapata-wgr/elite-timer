import { describe, it, expect } from 'vitest';
import { computeEdadMetabolica } from '../sub-edad-metabolica-service';

describe('Sub-edad Metabólica — SF dominio metabolismo (matriz)', () => {
  it('perfil metabólico sano → edad joven + CE > 0', () => {
    const r = computeEdadMetabolica({
      paramValues: { glucosa_en_ayuno: 85, hba1c: 0.051, homair: 1.0, insulina: 4, trigliceridos: 70, relacion_trigliceridos_hdl: 1.2 },
      sex: 'male',
      chronological_age: 40,
    });
    expect(r.ce_percent).toBeGreaterThan(0);
    expect(r.age_years).toBeLessThan(45);
  });

  it('sin datos → CE 0', () => {
    expect(computeEdadMetabolica({ paramValues: {}, sex: 'male', chronological_age: 40 }).ce_percent).toBe(0);
  });
});
