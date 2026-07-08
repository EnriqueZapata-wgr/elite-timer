import { describe, expect, it } from 'vitest';

import {
  boostStatusFromRow,
  formatBoostRemaining,
  highestTier,
  isTierAtLeast,
  resolveEffectiveTier,
  tierFromEntitlements,
  tierFromProfile,
} from '../tier-logic';

describe('tierFromEntitlements', () => {
  it('devuelve free sin entitlements', () => {
    expect(tierFromEntitlements([])).toBe('free');
  });

  it('mapea cada entitlement a su tier', () => {
    expect(tierFromEntitlements(['atp_base'])).toBe('base');
    expect(tierFromEntitlements(['atp_pro'])).toBe('pro');
    expect(tierFromEntitlements(['atp_clinician'])).toBe('clinician');
  });

  it('con múltiples entitlements gana el más alto', () => {
    expect(tierFromEntitlements(['atp_base', 'atp_pro'])).toBe('pro');
    expect(tierFromEntitlements(['atp_pro', 'atp_clinician'])).toBe('clinician');
  });

  it('ignora entitlements desconocidos', () => {
    expect(tierFromEntitlements(['otra_cosa'])).toBe('free');
    expect(tierFromEntitlements(['otra_cosa', 'atp_base'])).toBe('base');
  });
});

describe('tierFromProfile', () => {
  const now = new Date('2026-07-07T12:00:00Z');

  it('devuelve el tier del profile si es válido', () => {
    expect(tierFromProfile('pro', null, now)).toBe('pro');
    expect(tierFromProfile('base', '2026-08-01T00:00:00Z', now)).toBe('base');
  });

  it('degrada a free si tier_expires_at ya pasó', () => {
    expect(tierFromProfile('pro', '2026-07-01T00:00:00Z', now)).toBe('free');
  });

  it('devuelve free ante valores nulos o corruptos', () => {
    expect(tierFromProfile(null, null, now)).toBe('free');
    expect(tierFromProfile('premium_legacy', null, now)).toBe('free');
  });
});

describe('highestTier + resolveEffectiveTier', () => {
  it('combina DB y SDK tomando el mayor (lag del webhook)', () => {
    expect(highestTier('free', 'pro')).toBe('pro');
    expect(highestTier('clinician', 'base')).toBe('clinician');
    expect(highestTier('base', 'base')).toBe('base');
  });

  it('el boost eleva free/base a pro', () => {
    expect(resolveEffectiveTier('free', true)).toBe('pro');
    expect(resolveEffectiveTier('base', true)).toBe('pro');
  });

  it('el boost NO degrada pro/clinician', () => {
    expect(resolveEffectiveTier('pro', true)).toBe('pro');
    expect(resolveEffectiveTier('clinician', true)).toBe('clinician');
  });

  it('sin boost el tier queda igual', () => {
    expect(resolveEffectiveTier('base', false)).toBe('base');
  });
});

describe('isTierAtLeast', () => {
  it('semántica "al menos"', () => {
    expect(isTierAtLeast('clinician', 'pro')).toBe(true);
    expect(isTierAtLeast('pro', 'pro')).toBe(true);
    expect(isTierAtLeast('base', 'pro')).toBe(false);
    expect(isTierAtLeast('free', 'base')).toBe(false);
  });
});

describe('boostStatusFromRow', () => {
  const now = new Date('2026-07-07T12:00:00Z');

  it('boost vigente → active con expiresAt', () => {
    const status = boostStatusFromRow({ expires_at: '2026-07-08T11:00:00Z' }, now);
    expect(status.active).toBe(true);
    expect(status.expiresAt?.toISOString()).toBe('2026-07-08T11:00:00.000Z');
  });

  it('boost expirado o inexistente → inactive', () => {
    expect(boostStatusFromRow({ expires_at: '2026-07-07T11:59:00Z' }, now).active).toBe(false);
    expect(boostStatusFromRow(null, now).active).toBe(false);
  });
});

describe('formatBoostRemaining', () => {
  const now = new Date('2026-07-07T12:00:00Z');

  it('horas y minutos', () => {
    expect(formatBoostRemaining(new Date('2026-07-08T11:15:30Z'), now)).toBe('23h 15m');
  });

  it('solo minutos bajo la hora', () => {
    expect(formatBoostRemaining(new Date('2026-07-07T12:45:00Z'), now)).toBe('45m');
  });

  it('bordes: <1m y expirado', () => {
    expect(formatBoostRemaining(new Date('2026-07-07T12:00:30Z'), now)).toBe('<1m');
    expect(formatBoostRemaining(new Date('2026-07-07T11:00:00Z'), now)).toBe('0m');
  });
});
