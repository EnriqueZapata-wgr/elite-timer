/**
 * Tests de las métricas de ayuno (MB-9 · Track E): GKI + flexibilidad metabólica.
 * Foco: conversión de unidades, GKI como profundidad de cetosis (nunca autofagia),
 * y la curva de flexibilidad moviéndose a la izquierda.
 */
import { describe, it, expect } from 'vitest';
import {
  mgdlToMmol, computeGKI, gkiZone, measuredState,
  computeFlexibilityTrend, MIN_FASTS_FOR_TREND, MGDL_TO_MMOL,
  type FastSwitch,
} from '../fasting-metrics-core';

describe('E.3 · GKI', () => {
  it('convierte mg/dL a mmol/L con el factor 18.016', () => {
    expect(mgdlToMmol(90)).toBeCloseTo(90 / MGDL_TO_MMOL, 3);
  });

  it('GKI = glucosa mmol ÷ cetonas mmol; convierte si viene en mg/dL', () => {
    expect(computeGKI(4, 2)).toBeCloseTo(2);
    // 90 mg/dL ≈ 4.995 mmol → /1.5 ≈ 3.33
    expect(computeGKI(90, 1.5, 'mgdl')!).toBeCloseTo((90 / MGDL_TO_MMOL) / 1.5, 2);
  });

  it('sin cetonas positivas NO inventa índice (null)', () => {
    expect(computeGKI(5, 0)).toBeNull();
    expect(computeGKI(5, -1)).toBeNull();
    expect(computeGKI(0, 2)).toBeNull();
  });

  it('zonas de profundidad de cetosis (tabla Meidenbauer), nunca "autofagia"', () => {
    expect(gkiZone(0.5).key).toBe('max');
    expect(gkiZone(2).key).toBe('deep');
    expect(gkiZone(4).key).toBe('moderate');
    expect(gkiZone(9).key).toBe('glycolytic');
    for (const g of [0.5, 2, 4, 9]) {
      expect(gkiZone(g).label.toLowerCase()).not.toContain('autofagia');
    }
  });

  it('measuredState arma GKI + zona, o null si no se puede calcular', () => {
    const s = measuredState(3, 1.5)!;
    expect(s.gki).toBeCloseTo(2);
    expect(s.zone.key).toBe('deep');
    expect(measuredState(3, 0)).toBeNull();
  });
});

describe('E.2 · flexibilidad metabólica (la curva a la izquierda)', () => {
  it('con menos de la muestra mínima dice qué falta, no inventa tendencia', () => {
    const r = computeFlexibilityTrend([{ date: '2026-01-01', switchHours: 15 }]);
    expect(r.status).toBe('insufficient');
    expect(r.needMore).toBe(MIN_FASTS_FOR_TREND - 1);
    expect(r.direction).toBeNull();
  });

  it('cambiar de combustible ANTES con el tiempo → "faster" (mejor metabolismo)', () => {
    const fasts: FastSwitch[] = [
      { date: '2026-01-01', switchHours: 15.5 },
      { date: '2026-02-01', switchHours: 14.5 },
      { date: '2026-06-01', switchHours: 11 },
      { date: '2026-07-01', switchHours: 10.5 },
    ];
    const r = computeFlexibilityTrend(fasts);
    expect(r.status).toBe('ok');
    expect(r.direction).toBe('faster');
    // La reciente cambia antes que la anterior → delta positivo.
    expect(r.deltaHours!).toBeGreaterThan(0);
    expect(r.recentAvg!).toBeLessThan(r.olderAvg!);
  });

  it('cambio chico = "flat" (no se infla el ruido)', () => {
    const fasts: FastSwitch[] = [
      { date: '2026-01-01', switchHours: 14 },
      { date: '2026-02-01', switchHours: 14.1 },
      { date: '2026-03-01', switchHours: 13.9 },
      { date: '2026-04-01', switchHours: 14 },
    ];
    expect(computeFlexibilityTrend(fasts).direction).toBe('flat');
  });

  it('ignora ayunos sin hora de cambio medida', () => {
    const fasts: FastSwitch[] = [
      { date: '2026-01-01', switchHours: 15 },
      { date: '2026-02-01', switchHours: 0 }, // sin medición → fuera
      { date: '2026-03-01', switchHours: 12 },
    ];
    // Solo 2 medidos → insuficiente.
    expect(computeFlexibilityTrend(fasts).status).toBe('insufficient');
  });
});
