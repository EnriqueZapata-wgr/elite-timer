/**
 * mis-datos-core — guard de los formateadores del destino Mis Datos (B2).
 */
import { describe, it, expect } from 'vitest';
import { fmt, fmtBp, relativeDays, glucoseStatus, ketosisStatus } from '../mis-datos-core';

const NOW = new Date('2026-07-16T12:00:00Z');

describe('fmt', () => {
  it('formatea con unidad y decimales; null → —', () => {
    expect(fmt(72.5, 'kg', 1)).toBe('72.5 kg');
    expect(fmt(120, 'mg/dL')).toBe('120 mg/dL');
    expect(fmt(null)).toBe('—');
    expect(fmt(NaN)).toBe('—');
  });
});

describe('fmtBp', () => {
  it('presión "120/80" o — si falta', () => {
    expect(fmtBp(120, 80)).toBe('120/80');
    expect(fmtBp(null, 80)).toBe('—');
  });
});

describe('relativeDays', () => {
  it('hoy / ayer / hace N días / meses', () => {
    expect(relativeDays('2026-07-16T08:00:00Z', NOW)).toBe('hoy');
    expect(relativeDays('2026-07-15T08:00:00Z', NOW)).toBe('ayer');
    expect(relativeDays('2026-07-10T08:00:00Z', NOW)).toBe('hace 6 días');
    expect(relativeDays('2026-05-01T08:00:00Z', NOW)).toBe('hace 2 meses');
    expect(relativeDays(null, NOW)).toBe('');
  });
});

describe('glucoseStatus', () => {
  it('rangos funcionales', () => {
    expect(glucoseStatus(85)?.level).toBe('ok');
    expect(glucoseStatus(60)?.level).toBe('warn');
    expect(glucoseStatus(110)?.level).toBe('warn');
    expect(glucoseStatus(140)?.level).toBe('high');
    expect(glucoseStatus(null)).toBeNull();
  });
});

describe('ketosisStatus', () => {
  it('rangos de cetosis', () => {
    expect(ketosisStatus(0.2)?.level).toBe('warn');
    expect(ketosisStatus(1.5)?.level).toBe('ok');
    expect(ketosisStatus(4)?.level).toBe('high');
    expect(ketosisStatus(null)).toBeNull();
  });
});
