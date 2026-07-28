import { describe, it, expect } from 'vitest';
import {
  buildMonthMatrix, dateKey, daysInMonth, shiftMonth,
  fastingMet, proteinMet, waterMet,
} from '../adherence-calendar-core';

describe('adherence-calendar-core · grid mensual', () => {
  it('julio 2026 arranca en miércoles (lunes-primero) y tiene 31 días', () => {
    // 1-jul-2026 es miércoles → índice 2 con lunes-primero.
    const weeks = buildMonthMatrix(2026, 6);
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toBeNull();
    expect(weeks[0][2]).toBe(1);
    const days = weeks.flat().filter((d): d is number => d != null);
    expect(days.length).toBe(31);
    expect(days[days.length - 1]).toBe(31);
  });

  it('toda fila tiene exactamente 7 celdas', () => {
    for (const [y, m] of [[2026, 0], [2026, 1], [2024, 1], [2025, 11]] as const) {
      for (const week of buildMonthMatrix(y, m)) expect(week.length).toBe(7);
    }
  });

  it('febrero bisiesto tiene 29', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
  });

  it('dateKey no depende de zona horaria (string puro)', () => {
    expect(dateKey(2026, 6, 5)).toBe('2026-07-05');
    expect(dateKey(2026, 11, 31)).toBe('2026-12-31');
  });

  it('shiftMonth cruza el año en ambas direcciones', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual([2025, 11]);
    expect(shiftMonth(2026, 11, 1)).toEqual([2027, 0]);
    expect(shiftMonth(2026, 5, 1)).toEqual([2026, 6]);
  });
});

describe('adherence-calendar-core · reglas de meta', () => {
  it('ayuno: completed y sin meta cuenta; con meta pide 95%', () => {
    expect(fastingMet('completed', 14, null)).toBe(true);
    expect(fastingMet('completed', 16, 16)).toBe(true);
    expect(fastingMet('completed', 15.3, 16)).toBe(true);  // 95.6% — tolerancia
    expect(fastingMet('completed', 14, 16)).toBe(false);   // 87.5% — no llega
    expect(fastingMet('cancelled', 16, 16)).toBe(false);
    expect(fastingMet('completed', 0, null)).toBe(false);
    expect(fastingMet('completed', null, 16)).toBe(false);
  });

  it('proteína y agua: meta inválida nunca cumple (sin datos ≠ cero)', () => {
    expect(proteinMet(150, 150)).toBe(true);
    expect(proteinMet(149, 150)).toBe(false);
    expect(proteinMet(100, 0)).toBe(false);
    expect(waterMet(2500, 2500)).toBe(true);
    expect(waterMet(2499, 2500)).toBe(false);
    expect(waterMet(1000, 0)).toBe(false);
  });
});
