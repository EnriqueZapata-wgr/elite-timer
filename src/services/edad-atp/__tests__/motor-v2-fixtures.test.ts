import { describe, it, expect } from 'vitest';
import { computeMotorV2 } from '../motor-v2-service';
import { PATIENTS, inputFromFixture, expectedFor } from './motor-v2-fixture-helper';

/**
 * GATE de validación del motor v2: los 4 pacientes deben reproducir la Edad ATP
 * integral con tolerancia ±1.0 año, y cada edad parcial ciega con ±1.5 años.
 * Si esto falla → el motor diverge del Excel maestro (flag #1, parar sprint).
 */
describe('motor-v2 — GATE Edad ATP integral (4 pacientes, ±1.0 año)', () => {
  for (const pt of PATIENTS) {
    it(`${pt} reproduce edad_atp_integral`, () => {
      const r = computeMotorV2(inputFromFixture(pt));
      expect(r.edad_atp_integral).toBeCloseTo(expectedFor(pt).edad_atp_integral, 1);
    });
  }

  it('cada edad parcial CIEGA reproduce ±1.5 año', () => {
    for (const pt of PATIENTS) {
      const r = computeMotorV2(inputFromFixture(pt));
      const e = expectedFor(pt);
      expect(r.areas.labs.edad_ciega).toBeCloseTo(e.edad_labs_ciega, 1);
      expect(r.areas.composicion.edad_ciega).toBeCloseTo(e.edad_composicion_ciega, 1);
      expect(r.areas.fitness.edad_ciega).toBeCloseTo(e.edad_fitness_ciega, 1);
      expect(r.areas.cognicion.edad_ciega).toBeCloseTo(e.edad_cognicion_ciega, 1);
      expect(r.areas.riesgos.edad_ciega).toBeCloseTo(e.edad_riesgos_ciega, 1);
    }
  });

  it('cada edad AJUSTADA (anclada) reproduce ±1.0 año', () => {
    for (const pt of PATIENTS) {
      const r = computeMotorV2(inputFromFixture(pt));
      const e = expectedFor(pt);
      expect(r.areas.labs.edad_ajustada).toBeCloseTo(e.edad_labs_ajustada, 1);
      expect(r.areas.composicion.edad_ajustada).toBeCloseTo(e.edad_composicion_ajustada, 1);
      expect(r.areas.fitness.edad_ajustada).toBeCloseTo(e.edad_fitness_ajustada, 1);
      expect(r.areas.cognicion.edad_ajustada).toBeCloseTo(e.edad_cognicion_ajustada, 1);
      expect(r.areas.riesgos.edad_ajustada).toBeCloseTo(e.edad_riesgos_ajustada, 1);
    }
  });

  it('delta_anos = cron − integral y pesos de área suman 1.0', () => {
    const r = computeMotorV2(inputFromFixture('H2'));
    expect(r.delta_anos).toBeCloseTo(r.cronologica - r.edad_atp_integral, 6);
    const sumPesos = Object.values(r.areas).reduce((s, a) => s + a.peso, 0);
    expect(sumPesos).toBeCloseTo(1, 6);
  });

  it('cap [20,100] no se dispara para los 4 pacientes reales', () => {
    for (const pt of PATIENTS) expect(computeMotorV2(inputFromFixture(pt)).capped).toBe(false);
  });
});
