import { describe, it, expect } from 'vitest';
import { computeAreaComposicion, computeFFMI } from '../area-composicion-service';
import { PATIENTS, inputFromFixture, expectedFor } from './motor-v2-fixture-helper';

describe('area-composicion — bandas por sexo + FFMI (gate 4 pacientes)', () => {
  for (const pt of PATIENTS) {
    it(`${pt} reproduce edad_composicion_ciega ±1.5`, () => {
      const r = computeAreaComposicion(inputFromFixture(pt));
      expect(r.edad_ciega).toBeCloseTo(expectedFor(pt).edad_composicion_ciega, 1);
    });
  }

  it('FFMI = peso × (1 − grasa/100) / altura_m² (H1 ≈ 19.78)', () => {
    expect(computeFFMI(87.4, 183, 24.2)).toBeCloseTo(19.7824, 3);
    expect(computeFFMI(undefined, 183, 24.2)).toBeUndefined();
  });

  it('CE refleja los params presentes (atleta H2 score alto → edad 22)', () => {
    const r = computeAreaComposicion(inputFromFixture('H2'));
    expect(r.ce).toBeCloseTo(1, 5);
    expect(r.score).toBeGreaterThanOrEqual(95);
  });
});
