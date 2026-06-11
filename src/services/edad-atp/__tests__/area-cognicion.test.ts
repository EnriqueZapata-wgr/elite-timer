import { describe, it, expect } from 'vitest';
import { computeAreaCognicion, rtSimpleToAge, rtChoiceToAge, goNoGoToAge, subjetivosToAge } from '../area-cognicion-service';
import { PATIENTS, inputFromFixture, expectedFor } from './motor-v2-fixture-helper';

describe('area-cognicion — RT Der&Deary + Go/No-Go + subjetivos (gate 4 pacientes)', () => {
  for (const pt of PATIENTS) {
    it(`${pt} reproduce edad_cognicion_ciega ±1.5`, () => {
      const r = computeAreaCognicion(inputFromFixture(pt));
      expect(r.edad_ciega).toBeCloseTo(expectedFor(pt).edad_cognicion_ciega, 1);
    });
  }

  it('curvas RT: anchors y tramos', () => {
    expect(rtSimpleToAge(250)).toBe(20);
    expect(rtSimpleToAge(290)).toBeCloseTo(40, 5);
    expect(rtChoiceToAge(440)).toBe(20);
    expect(rtChoiceToAge(560)).toBeCloseTo(53.333, 2);
  });

  it('Go/No-Go: RT + modificador por % errores', () => {
    expect(goNoGoToAge(320, 12)).toBeCloseTo(38.333, 2); // 33.33 + 5 (err 10-20)
    expect(goNoGoToAge(280, 4)).toBe(20); // err <5 → +0
  });

  it('subjetivos: 7/10 = cronológica, mejor = más joven', () => {
    expect(subjetivosToAge(7, 50)).toBe(50);
    expect(subjetivosToAge(9, 35.83)).toBeCloseTo(25.83, 2);
  });
});
