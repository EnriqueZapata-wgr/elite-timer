import { describe, it, expect } from 'vitest';
import {
  buildChartModel,
  forwardFillSeries,
  trendFromSeries,
  interpretValue,
  type SeriePoint,
} from '../parameter-chart-model';

const TODAY = '2026-07-06';

function pt(value: number | null, measured_at: string): SeriePoint {
  return { value, measured_at, source: 'manual' };
}

// bandLimits estilo matriz: 8 límites → banda funcional = [3],[4]; amplia = [1],[6]
const LIMITS = [10, 20, 30, 40, 60, 70, 80, 90];

describe('forwardFillSeries (F4.4)', () => {
  it('acarrea el último valor conocido en fechas sin medición', () => {
    const out = forwardFillSeries([pt(50, '2026-01-01'), pt(null, '2026-02-01'), pt(55, '2026-03-01')]);
    expect(out.map(p => p.value)).toEqual([50, 50, 55]);
    expect(out.map(p => p.carried)).toEqual([false, true, false]);
  });

  it('descarta nulls antes de la primera medición real', () => {
    const out = forwardFillSeries([pt(null, '2026-01-01'), pt(42, '2026-02-01')]);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(42);
  });

  it('nunca produce caída a 0 por dato faltante', () => {
    const out = forwardFillSeries([pt(100, '2026-01-01'), pt(null, '2026-02-01'), pt(null, '2026-03-01')]);
    expect(out.every(p => p.value === 100)).toBe(true);
  });
});

describe('buildChartModel', () => {
  it('modelo vacío sin mediciones reales', () => {
    expect(buildChartModel([pt(null, '2026-01-01')], LIMITS, TODAY).empty).toBe(true);
    expect(buildChartModel([], LIMITS, TODAY).empty).toBe(true);
  });

  it('banda funcional = bandLimits[3]/[4], amplia = [1]/[6]', () => {
    const m = buildChartModel([pt(50, '2026-06-01')], LIMITS, TODAY);
    expect(m.band).toMatchObject({ lo: 40, hi: 60 });
    expect(m.outerBand).toMatchObject({ lo: 20, hi: 80 });
  });

  it('includeOuter extiende el rango Y para que quepa la banda amplia', () => {
    const soloFuncional = buildChartModel([pt(50, '2026-06-01')], LIMITS, TODAY, false);
    const todos = buildChartModel([pt(50, '2026-06-01')], LIMITS, TODAY, true);
    // banda amplia (20-70) es más ancha que funcional (40-60) → rango Y crece
    expect(todos.yMin).toBeLessThan(soloFuncional.yMin);
    expect(todos.yMax).toBeGreaterThan(soloFuncional.yMax);
  });

  it('puntos carried quedan marcados y en la línea (no caen)', () => {
    const m = buildChartModel(
      [pt(50, '2026-01-01'), pt(null, '2026-02-01'), pt(50, '2026-03-01')],
      LIMITS, TODAY,
    );
    expect(m.points).toHaveLength(3);
    expect(m.points[1].carried).toBe(true);
    expect(m.points[1].y).toBe(m.points[0].y);
  });

  it('normaliza y dentro de 0-1 y marca stale > 365 días', () => {
    const m = buildChartModel([pt(45, '2024-01-01'), pt(55, '2026-07-01')], LIMITS, TODAY);
    for (const p of m.points) {
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
    expect(m.points[0].is_stale).toBe(true);
    expect(m.points[1].is_stale).toBe(false);
  });
});

describe('trendFromSeries (F4.1 tendencia)', () => {
  it('null con menos de 2 mediciones', () => {
    expect(trendFromSeries([pt(50, '2026-01-01')])).toBeNull();
    expect(trendFromSeries([])).toBeNull();
  });

  it('detecta subida y bajada sobre el promedio de las 2 anteriores', () => {
    expect(trendFromSeries([pt(50, '1'), pt(52, '2'), pt(60, '3')])).toBe('up');
    expect(trendFromSeries([pt(60, '1'), pt(58, '2'), pt(60, '3')])).toBe('flat'); // 60 vs 59 = +1.7% < 2%
    expect(trendFromSeries([pt(60, '1'), pt(60, '2'), pt(50, '3')])).toBe('down');
  });

  it('ignora nulls (no distorsionan la tendencia)', () => {
    expect(trendFromSeries([pt(50, '1'), pt(null, '2'), pt(60, '3')])).toBe('up');
  });
});

describe('interpretValue (F4.1 interpretación 1-línea)', () => {
  it('null sin banda', () => {
    expect(interpretValue(50, null)).toBeNull();
  });

  it('óptimo dentro de banda funcional', () => {
    expect(interpretValue(50, LIMITS)).toContain('óptimo');
  });

  it('fuera de rango indica dirección', () => {
    const bajo = interpretValue(12, LIMITS);
    expect(bajo).toContain('por debajo');
    const alto = interpretValue(88, LIMITS);
    expect(alto).toContain('por arriba');
  });
});
