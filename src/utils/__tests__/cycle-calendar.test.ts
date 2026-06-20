import { describe, it, expect } from 'vitest';
import { getWeekdayMondayFirst, getMonthDays, buildCalendarGrid } from '@/src/utils/cycle-calendar';

describe('cycle-calendar — getWeekdayMondayFirst', () => {
  it('19 jun 2026 es viernes → índice 4 (Lun=0)', () => {
    expect(getWeekdayMondayFirst('2026-06-19')).toBe(4);
  });
  it('domingo → 6, lunes → 0', () => {
    expect(getWeekdayMondayFirst('2026-06-21')).toBe(6); // domingo
    expect(getWeekdayMondayFirst('2026-06-22')).toBe(0); // lunes
  });
});

describe('cycle-calendar — getMonthDays', () => {
  it('junio 2026 tiene 30 días', () => {
    expect(getMonthDays(2026, 5)).toHaveLength(30);
  });
  it('febrero 2024 (bisiesto) tiene 29 días', () => {
    expect(getMonthDays(2024, 1)).toHaveLength(29);
  });
  it('julio 2026 tiene 31 días', () => {
    expect(getMonthDays(2026, 6)).toHaveLength(31);
  });
});

describe('cycle-calendar — buildCalendarGrid (7 columnas, alineación)', () => {
  it('el grid siempre es múltiplo de 7 (7 columnas)', () => {
    for (const [y, m] of [[2026, 5], [2026, 6], [2024, 1], [2026, 1]] as const) {
      expect(buildCalendarGrid(y, m).length % 7).toBe(0);
    }
  });

  it('cada día cae bajo su encabezado correcto (col === weekday Lun-first)', () => {
    const grid = buildCalendarGrid(2026, 5); // junio 2026
    grid.forEach((cell, i) => {
      if (cell) expect(i % 7).toBe(getWeekdayMondayFirst(cell));
    });
  });

  it('hoy (19 jun 2026, viernes) cae en la columna 4 del grid', () => {
    const grid = buildCalendarGrid(2026, 5);
    const idx = grid.indexOf('2026-06-19');
    expect(idx % 7).toBe(4); // viernes, NO lunes
  });

  it('julio 2026 arranca en miércoles → 2 huecos iniciales', () => {
    const grid = buildCalendarGrid(2026, 6);
    expect(grid[0]).toBeNull();
    expect(grid[1]).toBeNull();
    expect(grid[2]).toBe('2026-07-01');
  });
});
