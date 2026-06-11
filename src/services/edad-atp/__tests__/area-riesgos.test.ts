import { describe, it, expect } from 'vitest';
import { computeAreaRiesgos } from '../area-riesgos-service';
import { PATIENTS, inputFromFixture, expectedFor } from './motor-v2-fixture-helper';

describe('area-riesgos — 5 sub-bloques (gate 4 pacientes)', () => {
  for (const pt of PATIENTS) {
    it(`${pt} reproduce edad_riesgos_ciega ±1.5`, () => {
      const r = computeAreaRiesgos(inputFromFixture(pt));
      expect(r.edad_ciega).toBeCloseTo(expectedFor(pt).edad_riesgos_ciega, 1);
    });
  }

  it('expone scores por sub-bloque (cardio/metab/inflam/horm/hepatorenal)', () => {
    const r = computeAreaRiesgos(inputFromFixture('H1'));
    expect(Object.keys(r.subbloques)).toEqual(['cardio', 'metabolico', 'inflamatorio', 'hormonal', 'hepatorenal']);
    for (const v of Object.values(r.subbloques)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it('hormonal usa rangos sexo-específicos (testo H vs estradiol M)', () => {
    // M1 estradiol 60 (rango 30-200) → score hormonal alto; M2 estradiol 28 (<30) → penalizado.
    const m1 = computeAreaRiesgos(inputFromFixture('M1'));
    const m2 = computeAreaRiesgos(inputFromFixture('M2'));
    // subbloques ahora es number | null (null = sub-bloque sin datos); con fixtures
    // completos siempre hay valor — el ! es seguro aquí.
    expect(m1.subbloques.hormonal!).toBeGreaterThan(m2.subbloques.hormonal!);
  });
});
