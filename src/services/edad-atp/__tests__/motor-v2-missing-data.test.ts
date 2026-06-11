import { describe, it, expect } from 'vitest';
import { computeMotorV2 } from '../motor-v2-service';
import { inputFromFixture, expectedFor } from './motor-v2-fixture-helper';

/**
 * DOCTRINA CE (Enrique, 2026-06-11): un param sin captura BAJA el CE del área,
 * NUNCA empeora la edad. Las áreas renormalizan score por peso presente; un área
 * sin un solo dato es neutra (edad_ciega = cronológica, CE 0).
 *
 * Regresión del bug del smoke test 2026-06-11: fitness/composición/riesgos NO
 * renormalizaban → plank/bolt/old_man/recovery sin captura contaban como score 0
 * → Enrique (fixture H2) salía con fitness ciega 47.6 en vez de 24.8 e integral
 * 35.2 en vez de ~27.3. Los valores esperados de este archivo fueron derivados
 * con una réplica Python independiente de los scorers contra los fixtures.
 */
describe('motor-v2 — doctrina CE con datos faltantes', () => {
  it('H2 sin plank/bolt/old_man/recovery (estado real de captura de la app): fitness renormaliza', () => {
    const input = inputFromFixture('H2');
    input.plank_s = undefined;
    input.bolt_s = undefined;
    input.old_man_test = undefined;
    input.recovery_hr = undefined;

    const r = computeMotorV2(input);
    // Renormalizado: score 92.65 → 24.82. Con el bug (score 63.0) daba 47.6.
    expect(r.areas.fitness.edad_ciega).toBeCloseTo(24.82, 1);
    expect(r.areas.fitness.ce).toBeCloseTo(0.68, 2);
    // La integral apenas se mueve respecto al fixture completo (27.27): +0.4 por
    // el peso redistribuido hacia vo2 (score 80). Jamás cerca de 35.
    expect(r.edad_atp_integral).toBeGreaterThan(26.5);
    expect(r.edad_atp_integral).toBeLessThan(28.5);
  });

  it('H2 sin NINGÚN param de fitness: área neutra (edad_ciega = cron, CE 0)', () => {
    const input = inputFromFixture('H2');
    input.vo2max = undefined;
    input.grip_strength_kg = undefined;
    input.old_man_test = undefined;
    input.push_ups = undefined;
    input.squat_60s = undefined;
    input.balance_1leg_s = undefined;
    input.plank_s = undefined;
    input.bolt_s = undefined;
    input.recovery_hr = undefined;

    const r = computeMotorV2(input);
    expect(r.areas.fitness.edad_ciega).toBeCloseTo(35.83, 2);
    // Nota: composición también pierde "agarre" (grip es input compartido) pero
    // renormaliza sobre sus 5 params restantes — NO se vuelve neutra.
    expect(r.areas.fitness.edad_ajustada).toBeCloseTo(35.83, 2); // anclada = cron
    expect(r.areas.fitness.ce).toBe(0);
  });

  it('M2 sin sub-bloque hormonal completo: riesgos renormaliza entre sub-bloques', () => {
    const input = inputFromFixture('M2');
    input.testo_or_estradiol = undefined;
    input.tsh = undefined;
    input.cortisol = undefined;
    input.vit_d = undefined;

    const r = computeMotorV2(input);
    const riesgos = r.areas.riesgos as typeof r.areas.riesgos & { subbloques: Record<string, number | null> };
    expect(riesgos.subbloques.hormonal).toBeNull();
    // Réplica Python: cardio 30.0, metab 33.75, inflam 62.5, hepatorenal 82.0
    // renormalizados sobre pesos .3/.25/.2/.1 → score 44.87 → edad 65.13
    // (vs 64.74 del fixture completo: el sub-bloque faltante NO pesa como 0).
    expect(riesgos.edad_ciega).toBeCloseTo(65.13, 1);
  });

  it('ratio TG/HDL sin HDL: score null (baja CE), NO score 0', () => {
    const input = inputFromFixture('H2');
    input.hdl = undefined;

    const r = computeMotorV2(input);
    expect(r.areas.riesgos.components.ratio_tg_hdl.score_0_100).toBeNull();
    expect(r.areas.riesgos.components.hdl.score_0_100).toBeNull();
    expect(r.areas.riesgos.ce).toBeLessThan(1);
  });

  it('CANARIO del gate: con datos completos la renormalización es neutra (H2 = 27.27)', () => {
    const r = computeMotorV2(inputFromFixture('H2'));
    expect(r.edad_atp_integral).toBeCloseTo(expectedFor('H2').edad_atp_integral, 3);
    expect(r.areas.fitness.ce).toBe(1);
    expect(r.areas.riesgos.ce).toBe(1);
  });
});
