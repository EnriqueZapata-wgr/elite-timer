import { describe, it, expect } from 'vitest';
import {
  formatMXN,
  requiresCedula,
  referralsByMonth,
  referralsInLastDays,
  conversionFunnel,
  earningsSummary,
} from '../affiliate-core';

const TODAY = '2026-07-06';

describe('formatMXN', () => {
  it('formatea con comas y 2 decimales', () => {
    expect(formatMXN(0)).toBe('$0.00 MXN');
    expect(formatMXN(1234.5)).toBe('$1,234.50 MXN');
    expect(formatMXN(1234567.891)).toBe('$1,234,567.89 MXN');
  });
});

describe('requiresCedula', () => {
  it('solo clínico Fx requiere cédula', () => {
    expect(requiresCedula('clinico_fx')).toBe(true);
    expect(requiresCedula('coach')).toBe(false);
    expect(requiresCedula(null)).toBe(false);
  });
});

describe('referralsByMonth (gráfica dashboard)', () => {
  it('genera 6 buckets terminando en el mes actual', () => {
    const serie = referralsByMonth([], TODAY, 6);
    expect(serie).toHaveLength(6);
    expect(serie[0].month).toBe('2026-02');
    expect(serie[5].month).toBe('2026-07');
  });

  it('bucketiza por mes de joined_at', () => {
    const serie = referralsByMonth([
      { joined_at: '2026-07-01T10:00:00Z', active: true },
      { joined_at: '2026-07-15T10:00:00Z', active: true },
      { joined_at: '2026-05-20T10:00:00Z', active: false },
      { joined_at: '2025-12-01T10:00:00Z', active: true }, // fuera de ventana
    ], TODAY, 6);
    expect(serie.find(b => b.month === '2026-07')?.count).toBe(2);
    expect(serie.find(b => b.month === '2026-05')?.count).toBe(1);
    expect(serie.reduce((a, b) => a + b.count, 0)).toBe(3);
  });

  it('cruza el año correctamente', () => {
    const serie = referralsByMonth([], '2026-02-15', 6);
    expect(serie[0].month).toBe('2025-09');
    expect(serie[5].month).toBe('2026-02');
  });
});

describe('referralsInLastDays', () => {
  it('cuenta solo dentro de la ventana', () => {
    const referred = [
      { joined_at: '2026-07-01T00:00:00Z', active: true },  // hace 5 días
      { joined_at: '2026-06-10T00:00:00Z', active: true },  // hace 26 días
      { joined_at: '2026-05-01T00:00:00Z', active: true },  // hace 66 días
    ];
    expect(referralsInLastDays(referred, TODAY, 30)).toBe(2);
  });
});

describe('conversionFunnel (mi-código)', () => {
  it('calcula tasas con 1 decimal', () => {
    const f = conversionFunnel(200, 30, 12);
    expect(f.signupRate).toBe(15);
    expect(f.payRate).toBe(40);
  });

  it('sin división por cero', () => {
    const f = conversionFunnel(0, 0, 0);
    expect(f.signupRate).toBe(0);
    expect(f.payRate).toBe(0);
  });
});

describe('earningsSummary', () => {
  it('mes en curso + acumulado del año, excluye held', () => {
    const s = earningsSummary([
      { month_start: '2026-07-01', commission_mxn: 500, status: 'pending' },
      { month_start: '2026-06-01', commission_mxn: 300, status: 'paid' },
      { month_start: '2026-05-01', commission_mxn: 200, status: 'held' },      // excluida
      { month_start: '2025-12-01', commission_mxn: 1000, status: 'paid' },     // año pasado
    ], TODAY);
    expect(s.thisMonth).toBe(500);
    expect(s.ytd).toBe(800);
  });
});
