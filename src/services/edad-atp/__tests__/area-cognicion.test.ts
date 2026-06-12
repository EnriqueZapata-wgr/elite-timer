import { describe, it, expect } from 'vitest';
import { computeAreaCognicion, rtSimpleToAge, rtChoiceToAge, goNoGoToAge, subjetivosToAge } from '../area-cognicion-service';
import { RT_TOUCH_LATENCY_MS } from '@/src/constants/edad-atp-motor-v2-config';
import { PATIENTS, inputFromFixture, expectedFor } from './motor-v2-fixture-helper';
import type { MotorV2Input } from '@/src/types/motor-edad-atp-v2';

describe('area-cognicion v2.1 — RT con offset táctil + Go/No-Go + subjetivos (gate 4 pacientes)', () => {
  for (const pt of PATIENTS) {
    it(`${pt} reproduce edad_cognicion_ciega ±1.5`, () => {
      const r = computeAreaCognicion(inputFromFixture(pt));
      expect(r.edad_ciega).toBeCloseTo(expectedFor(pt).edad_cognicion_ciega, 1);
    });
  }

  it('curvas RT crudas (botón físico): anchors y tramos sin tocar', () => {
    expect(rtSimpleToAge(250)).toBe(20);
    expect(rtSimpleToAge(290)).toBeCloseTo(40, 5);
    expect(rtChoiceToAge(440)).toBe(20);
    expect(rtChoiceToAge(560)).toBeCloseTo(53.333, 2);
  });

  it('Go/No-Go v2.1: castigo sensible (~0.7 año/punto%) y monótono', () => {
    // goNoGoToAge recibe el RT YA de-touched (el offset se aplica en el call site).
    // rt 240 ≤ 280 → rtAge 20. errMod = min(15, err*0.7).
    expect(goNoGoToAge(240, 0)).toBe(20); // 0% no suma
    expect(goNoGoToAge(240, 5)).toBeCloseTo(23.5, 5); // 1 error en 20 → +3.5
    expect(goNoGoToAge(240, 20)).toBeCloseTo(34, 5); // 4 errores → +14
    expect(goNoGoToAge(240, 50)).toBeCloseTo(35, 5); // techo +15
    // Monotonía creciente en el error.
    let prev = -1;
    for (let e = 0; e <= 40; e += 5) { const v = goNoGoToAge(240, e); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });

  it('subjetivos v2.1: escala 0-10, neutro en 5, simétrico ±3.5', () => {
    expect(subjetivosToAge(5, 50)).toBe(50); // neutro
    expect(subjetivosToAge(10, 50)).toBeCloseTo(46.5, 5); // óptimo → rejuvenece 3.5
    expect(subjetivosToAge(0, 50)).toBeCloseTo(53.5, 5); // pésimo → envejece 3.5
    // Simetría exacta alrededor del neutro.
    expect(subjetivosToAge(8, 40) - 40).toBeCloseTo(-(subjetivosToAge(2, 40) - 40), 6);
  });

  it('offset táctil: el mismo RT crudo da edad MÁS JOVEN con offset que sin él', () => {
    const base: MotorV2Input = { chronological_age: 40, sex: 'male', rt_simple_ms: 300, rt_choice_ms: 520, go_no_go_rt_hits_ms: 330, go_no_go_error_pct: 0 };
    const conOffset = computeAreaCognicion(base).edad_ciega;
    // Curvas directas sobre el RT crudo (sin restar latencia) = referencia "lab".
    const sinOffset = rtSimpleToAge(300) * 0.3 + rtChoiceToAge(520) * 0.3 + goNoGoToAge(330 + RT_TOUCH_LATENCY_MS, 0) * 0.25;
    // conOffset normaliza sobre el peso presente (0.85, sin subjetivos) → comparamos
    // que el offset SIEMPRE rejuvenece: edad con offset < edad sin offset.
    const sinOffsetNorm = sinOffset / 0.85;
    expect(conOffset).toBeLessThan(sinOffsetNorm);
  });

  it('cordura clínica: H2 atleta (RTs rápidos, subj 9/9/9) → cognición ciega < 28', () => {
    expect(computeAreaCognicion(inputFromFixture('H2')).edad_ciega).toBeLessThan(28);
  });

  it('cordura clínica: M2 (65 enferma, RTs lentos, errores altos, subj ~5) → cognición ciega > 55', () => {
    expect(computeAreaCognicion(inputFromFixture('M2')).edad_ciega).toBeGreaterThan(55);
  });
});
