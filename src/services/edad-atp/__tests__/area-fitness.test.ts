import { describe, it, expect } from 'vitest';
import { computeAreaFitness } from '../area-fitness-service';
import { PATIENTS, inputFromFixture, expectedFor } from './motor-v2-fixture-helper';

describe('area-fitness — 9 tests con bandas por sexo (gate 4 pacientes)', () => {
  for (const pt of PATIENTS) {
    it(`${pt} reproduce edad_fitness_ciega ±1.5`, () => {
      const r = computeAreaFitness(inputFromFixture(pt));
      expect(r.edad_ciega).toBeCloseTo(expectedFor(pt).edad_fitness_ciega, 1);
    });
  }

  it('sedentaria M2 → edad fitness alta (>90)', () => {
    expect(computeAreaFitness(inputFromFixture('M2')).edad_ciega).toBeGreaterThan(90);
  });

  it('pesos intra-área suman 1.0 (CE=1 con 9 tests presentes)', () => {
    expect(computeAreaFitness(inputFromFixture('H1')).ce).toBeCloseTo(1, 5);
  });
});
