import { describe, it, expect } from 'vitest';
import { ageFromDob, ageGateTier, MIN_AGE } from '../age-gate';

describe('ageFromDob', () => {
  it('edad exacta por calendario', () => {
    expect(ageFromDob('1990-07-06', '2026-07-06')).toBe(36); // cumple hoy
    expect(ageFromDob('1990-07-07', '2026-07-06')).toBe(35); // cumple mañana
    expect(ageFromDob('1990-07-05', '2026-07-06')).toBe(36); // cumplió ayer
  });

  it('límite del gate: 18 exacto', () => {
    expect(ageFromDob('2008-07-06', '2026-07-06')).toBe(18); // cumple 18 hoy
    expect(ageFromDob('2008-07-07', '2026-07-06')).toBe(17); // 18 mañana
  });

  it('fecha inválida → NaN', () => {
    expect(ageFromDob('', '2026-07-06')).toBeNaN();
    expect(ageFromDob('bogus', '2026-07-06')).toBeNaN();
  });
});

describe('ageGateTier (Sprint Compliance 2 — 18 duro)', () => {
  it('MIN_AGE es 18', () => {
    expect(MIN_AGE).toBe(18);
  });

  it('<18 → blocked (el tier parental ya no existe)', () => {
    expect(ageGateTier(0)).toBe('blocked');
    expect(ageGateTier(12)).toBe('blocked');
    expect(ageGateTier(13)).toBe('blocked');
    expect(ageGateTier(17)).toBe('blocked');
  });

  it('≥18 → passed', () => {
    expect(ageGateTier(18)).toBe('passed');
    expect(ageGateTier(99)).toBe('passed');
  });

  it('NaN → blocked (fail-safe)', () => {
    expect(ageGateTier(NaN)).toBe('blocked');
  });
});
