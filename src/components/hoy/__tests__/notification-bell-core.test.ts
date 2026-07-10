/**
 * Badge de la campana del HOY — lógica pura (Sprint HARDENING T3).
 */
import { describe, it, expect } from 'vitest';
import { bellBadgeLabel, BELL_BADGE_MAX } from '../notification-bell-core';

describe('bellBadgeLabel', () => {
  it('0 o negativos → sin badge', () => {
    expect(bellBadgeLabel(0)).toBeNull();
    expect(bellBadgeLabel(-3)).toBeNull();
  });

  it('valores inválidos → sin badge (defensivo)', () => {
    expect(bellBadgeLabel(NaN)).toBeNull();
    expect(bellBadgeLabel(Infinity)).toBeNull();
  });

  it('1..9 → número literal', () => {
    expect(bellBadgeLabel(1)).toBe('1');
    expect(bellBadgeLabel(BELL_BADGE_MAX)).toBe('9');
  });

  it('>9 → "9+" (no rompe el layout del badge)', () => {
    expect(bellBadgeLabel(10)).toBe('9+');
    expect(bellBadgeLabel(6295)).toBe('9+');
  });

  it('decimales → floor (conteos siempre enteros, pero defensivo)', () => {
    expect(bellBadgeLabel(2.7)).toBe('2');
  });
});
