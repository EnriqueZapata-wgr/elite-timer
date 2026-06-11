/**
 * Fase D (sprint captura unificada) — flujo de trials Go/No-Go con PRNG seeded.
 * Regresión del bug B5: un NO-GO retenido correctamente congelaba el test (4/20
 * para siempre) y obligaba a tocar = error forzado. Ahora retener = correct
 * withhold y el trial avanza solo.
 */
import { describe, it, expect } from 'vitest';
import { mulberry32, avgNoOutliers, buildGngSchedule, gngErrorRatePct, runGngFlow } from '../gng-trial-flow';

describe('gng-trial-flow — trials Go/No-Go (PRNG seeded)', () => {
  it('schedule determinista con el mismo seed; mezcla go/no-go', () => {
    const a = buildGngSchedule(mulberry32(42), 20);
    const b = buildGngSchedule(mulberry32(42), 20);
    expect(a).toEqual(b);
    expect(a).toHaveLength(20);
    const nogos = a.filter((s) => s === 'nogo').length;
    expect(nogos).toBeGreaterThan(0);
    expect(nogos).toBeLessThan(20);
  });

  it('usuario CORRECTO (retiene todos los no-go): los 20 trials completan, 0 errores', () => {
    const schedule = buildGngSchedule(mulberry32(7), 20);
    const nogos = schedule.filter((s) => s === 'nogo').length;
    const r = runGngFlow(schedule, (s) => (s === 'go' ? { tap: true, rtMs: 250 } : { tap: false }));
    // Antes del fix: el primer no-go retenido congelaba el flujo (B5).
    expect(r.completedTrials).toBe(20);
    expect(r.commissions).toBe(0);
    expect(r.errorRatePct).toBe(0);
    expect(r.withholds).toBe(nogos);
    expect(r.hits).toHaveLength(20 - nogos);
  });

  it('usuario impulsivo (toca todo): comisiones = no-gos presentados, denominador = trials', () => {
    const schedule = buildGngSchedule(mulberry32(99), 20);
    const nogos = schedule.filter((s) => s === 'nogo').length;
    const r = runGngFlow(schedule, () => ({ tap: true, rtMs: 300 }));
    expect(r.commissions).toBe(nogos);
    expect(r.withholds).toBe(0);
    expect(r.completedTrials).toBe(20);
    expect(r.errorRatePct).toBe(Math.round((nogos / 20) * 100));
  });

  it('gngErrorRatePct: comisiones sobre el total de trials, bordes seguros', () => {
    expect(gngErrorRatePct(0, 20)).toBe(0);
    expect(gngErrorRatePct(1, 20)).toBe(5);
    expect(gngErrorRatePct(5, 20)).toBe(25);
    expect(gngErrorRatePct(3, 0)).toBe(0);
  });

  it('avgNoOutliers descarta el 10% más lento', () => {
    const times = [200, 210, 220, 230, 240, 250, 260, 270, 280, 900];
    const expected = Math.round((200 + 210 + 220 + 230 + 240 + 250 + 260 + 270 + 280) / 9);
    expect(avgNoOutliers(times)).toBe(expected);
    expect(avgNoOutliers([])).toBe(0);
  });
});
