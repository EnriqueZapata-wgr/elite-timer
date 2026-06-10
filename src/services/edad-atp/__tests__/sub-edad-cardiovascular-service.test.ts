import { describe, it, expect } from 'vitest';
import { computeEdadCardiovascular, sfToAge } from '../sub-edad-cardiovascular-service';

describe('Sub-edad Cardiovascular — SF de la matriz (no ASCVD)', () => {
  it('sfToAge: curva piecewise (SF alto → joven, SF bajo → mayor)', () => {
    expect(sfToAge(100, 40)).toBeCloseTo(22, 0); // 40 × 0.55
    expect(sfToAge(80, 40)).toBeCloseTo(38, 0); // 40 × 0.95
    expect(sfToAge(50, 40)).toBeCloseTo(68, 0); // 40 × 1.70
    expect(sfToAge(85, 40)).toBeGreaterThan(sfToAge(95, 40)); // monótona
  });

  it('perfil cardio sano → edad funcional joven + CE > 0', () => {
    const r = computeEdadCardiovascular({
      paramValues: {
        colesterol_hdl: 65, colesterol_ldl: 90, colesterol_total: 170, trigliceridos: 70,
        presion_sistolica: 115, presion_diastolica: 72, apolipoproteinas_b: 70,
      },
      sex: 'male',
      chronological_age: 40,
    });
    expect(r.ce_percent).toBeGreaterThan(0);
    expect(r.age_years).toBeLessThan(45);
    expect(r.components.colesterol_hdl).toBeDefined();
  });

  it('sin datos → CE 0', () => {
    const r = computeEdadCardiovascular({ paramValues: {}, sex: 'male', chronological_age: 40 });
    expect(r.ce_percent).toBe(0);
  });
});
