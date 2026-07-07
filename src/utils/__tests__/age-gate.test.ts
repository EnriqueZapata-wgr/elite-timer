import { describe, it, expect } from 'vitest';
import { ageFromDob, ageGateTier, isValidParentalEmail } from '../age-gate';

describe('ageFromDob', () => {
  it('edad exacta por calendario', () => {
    expect(ageFromDob('1990-07-06', '2026-07-06')).toBe(36); // cumple hoy
    expect(ageFromDob('1990-07-07', '2026-07-06')).toBe(35); // cumple mañana
    expect(ageFromDob('1990-07-05', '2026-07-06')).toBe(36); // cumplió ayer
  });

  it('límites del gate: 13 y 18 exactos', () => {
    expect(ageFromDob('2013-07-06', '2026-07-06')).toBe(13); // cumple 13 hoy
    expect(ageFromDob('2013-07-07', '2026-07-06')).toBe(12); // 13 mañana
    expect(ageFromDob('2008-07-06', '2026-07-06')).toBe(18); // cumple 18 hoy
    expect(ageFromDob('2008-07-07', '2026-07-06')).toBe(17); // 18 mañana
  });

  it('fecha inválida → NaN', () => {
    expect(ageFromDob('', '2026-07-06')).toBeNaN();
    expect(ageFromDob('bogus', '2026-07-06')).toBeNaN();
  });
});

describe('ageGateTier (#41)', () => {
  it('<13 → blocked', () => {
    expect(ageGateTier(12)).toBe('blocked');
    expect(ageGateTier(0)).toBe('blocked');
  });

  it('13-17 → parental', () => {
    expect(ageGateTier(13)).toBe('parental');
    expect(ageGateTier(17)).toBe('parental');
  });

  it('≥18 → passed', () => {
    expect(ageGateTier(18)).toBe('passed');
    expect(ageGateTier(99)).toBe('passed');
  });

  it('NaN → blocked (fail-safe)', () => {
    expect(ageGateTier(NaN)).toBe('blocked');
  });
});

describe('isValidParentalEmail', () => {
  it('acepta emails razonables', () => {
    expect(isValidParentalEmail('mama@familia.com')).toBe(true);
    expect(isValidParentalEmail('  papa@dominio.mx ')).toBe(true);
  });

  it('rechaza basura', () => {
    expect(isValidParentalEmail('')).toBe(false);
    expect(isValidParentalEmail('sin-arroba')).toBe(false);
    expect(isValidParentalEmail('a@b')).toBe(false);
    expect(isValidParentalEmail('a@b.c')).toBe(false); // TLD 1 char
  });
});
