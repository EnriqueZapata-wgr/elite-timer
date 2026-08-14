/**
 * Pruebas de los promedios del ciclo (OLA1 R-3).
 *
 * Son cifras que la usuaria compara con su médico: el borde importa.
 */
import { describe, it, expect } from 'vitest';
import { cycleAverages, cicloRows, type CyclePeriodRow, type CycleDailyRow } from '../ciclo-report-core';

function cycle(over: Partial<CyclePeriodRow>): CyclePeriodRow {
  return {
    id: 'c1', start_date: '2026-07-01', end_date: '2026-07-28',
    cycle_length: 28, period_length: 5, ...over,
  };
}

function day(over: Partial<CycleDailyRow>): CycleDailyRow {
  return {
    date: '2026-08-01', is_period: false, energy: null, mood: null, appetite: null,
    libido: null, cramps: null, bloating: null, sleep_quality: null,
    temperature_c: null, hrv_ms: null, ...over,
  };
}

describe('cycleAverages', () => {
  it('sin ciclos no inventa promedios', () => {
    expect(cycleAverages([])).toEqual({ avgCycle: null, avgPeriod: null, variance: null });
  });

  it('con un solo ciclo NO hay variabilidad', () => {
    // Un 0 aquí se leería como "regularísima" cuando no hay con qué comparar.
    const r = cycleAverages([cycle({})]);
    expect(r.avgCycle).toBe(28);
    expect(r.avgPeriod).toBe(5);
    expect(r.variance).toBeNull();
  });

  it('promedia y redondea: ciclo entero, periodo con un decimal', () => {
    const r = cycleAverages([
      cycle({ id: 'a', cycle_length: 28, period_length: 5 }),
      cycle({ id: 'b', cycle_length: 31, period_length: 4 }),
    ]);
    expect(r.avgCycle).toBe(30); // 29.5 redondea a 30
    expect(r.avgPeriod).toBe(4.5);
    expect(r.variance).toBe(2);
  });

  it('los ciclos sin largo no cuentan en el promedio', () => {
    const r = cycleAverages([
      cycle({ id: 'a', cycle_length: 28, period_length: null }),
      cycle({ id: 'b', cycle_length: null, period_length: 6 }),
    ]);
    expect(r.avgCycle).toBe(28);
    expect(r.avgPeriod).toBe(6);
    expect(r.variance).toBeNull();
  });
});

describe('cicloRows', () => {
  it('mezcla ciclos y días, y la columna tipo los separa', () => {
    const rows = cicloRows([cycle({})], [day({ is_period: true, energy: 3 })]);
    expect(rows).toHaveLength(2);
    expect(rows[0].tipo).toBe('ciclo');
    expect(rows[0].dias_ciclo).toBe(28);
    expect(rows[1].tipo).toBe('dia');
    expect(rows[1].en_periodo).toBe('si');
    expect(rows[1].energia).toBe(3);
  });

  it('temperatura y HRV viajan en el export aunque no se pinten', () => {
    const rows = cicloRows([], [day({ temperature_c: 36.6, hrv_ms: 48 })]);
    expect(rows[0].temperatura_c).toBe(36.6);
    expect(rows[0].hrv_ms).toBe(48);
  });

  it('lo que falta va vacío, nunca null', () => {
    const rows = cicloRows([cycle({ end_date: null, cycle_length: null })], []);
    expect(rows[0].fin).toBe('');
    expect(rows[0].dias_ciclo).toBe('');
  });
});
