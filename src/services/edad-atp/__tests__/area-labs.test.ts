import { describe, it, expect } from 'vitest';
import { computeAreaLabs } from '../area-labs-service';
import { PATIENTS, inputFromFixture, expectedFor } from './motor-v2-fixture-helper';

describe('area-labs — PhenoAge + modificadores funcionales (gate 4 pacientes)', () => {
  for (const pt of PATIENTS) {
    it(`${pt} reproduce edad_labs_ciega ±1.5`, () => {
      const r = computeAreaLabs(inputFromFixture(pt));
      expect(r.edad_ciega).toBeCloseTo(expectedFor(pt).edad_labs_ciega, 1);
    });
  }

  it('CE = 1 cuando los 16 inputs están presentes', () => {
    const r = computeAreaLabs(inputFromFixture('H1'));
    expect(r.ce).toBeCloseTo(1, 5);
  });

  it('suma de modificadores con el mismo PhenoAge: peor − mejor = 12.5', () => {
    // Los 7 modificadores suman como máx +8.5 y mín −4.0 (el clamp [-5,+10] es
    // salvaguarda que no engancha con estos rangos). Verifico el span exacto.
    const base = inputFromFixture('H1');
    const worst = { ...base, vit_d: 10, vit_b12: 100, homocysteine: 20, ferritin: 5, tsh: 10, cortisol: 30, bilirubin: 5 };
    const best = { ...base, vit_d: 60, vit_b12: 500, homocysteine: 7, ferritin: 100, tsh: 1.5, cortisol: 10, bilirubin: 0.5 };
    // PhenoAge idéntico (9 biomarkers iguales) → la diferencia es solo el span de deltas.
    expect(computeAreaLabs(worst).edad_ciega - computeAreaLabs(best).edad_ciega).toBeCloseTo(12.5, 5);
  });
});
