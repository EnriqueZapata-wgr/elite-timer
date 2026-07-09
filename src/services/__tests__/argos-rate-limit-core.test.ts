import { describe, it, expect } from 'vitest';
import {
  parseRateLimitInfo,
  hoursUntilReset,
  formatResetWait,
  canOfferBoost,
} from '@/src/services/argos-rate-limit-core';

const ENRICHED = {
  content: [{ type: 'text', text: 'Llegaste al máximo de hoy (5/5)…' }],
  _rate_limited: true,
  _tier: 'free',
  _limit: 5,
  rate_limit: {
    tier: 'free',
    limit_daily: 5,
    used_today: 5,
    resets_at: '2026-07-10T00:00:00.000Z',
    boost_option: { cost_h_plus: 500, duration_hours: 24 },
  },
};

describe('parseRateLimitInfo — respuesta del proxy (T5)', () => {
  it('payload enriquecido → info completa con boost', () => {
    const info = parseRateLimitInfo(ENRICHED);
    expect(info).not.toBeNull();
    expect(info!.tier).toBe('free');
    expect(info!.limitDaily).toBe(5);
    expect(info!.usedToday).toBe(5);
    expect(info!.resetsAt).toBe('2026-07-10T00:00:00.000Z');
    expect(info!.boostOption).toEqual({ costHPlus: 500, durationHours: 24 });
  });

  it('respuesta normal (sin _rate_limited) → null', () => {
    expect(parseRateLimitInfo({ content: [{ type: 'text', text: 'hola' }] })).toBeNull();
    expect(parseRateLimitInfo({ _degraded: true })).toBeNull();
    expect(parseRateLimitInfo(null)).toBeNull();
    expect(parseRateLimitInfo(undefined)).toBeNull();
  });

  it('payload legacy (solo _tier/_limit, sin rate_limit) → info degradada útil', () => {
    const info = parseRateLimitInfo({ _rate_limited: true, _tier: 'base', _limit: 25 });
    expect(info).not.toBeNull();
    expect(info!.tier).toBe('base');
    expect(info!.limitDaily).toBe(25);
    expect(info!.usedToday).toBe(25); // asume tope alcanzado
    expect(info!.resetsAt).toBeNull();
    expect(info!.boostOption).toBeNull();
  });

  it('boost_option null (tier pro) → sin boost en la card', () => {
    const info = parseRateLimitInfo({
      _rate_limited: true,
      rate_limit: { tier: 'pro', limit_daily: 150, used_today: 150, resets_at: null, boost_option: null },
    });
    expect(info!.boostOption).toBeNull();
    expect(canOfferBoost(info!)).toBe(false);
  });

  it('boost_option malformado → se descarta sin crashear', () => {
    const info = parseRateLimitInfo({
      _rate_limited: true,
      rate_limit: { tier: 'free', limit_daily: 5, used_today: 5, boost_option: { cost_h_plus: 'x' } },
    });
    expect(info!.boostOption).toBeNull();
  });
});

describe('hoursUntilReset / formatResetWait', () => {
  const now = new Date('2026-07-09T21:00:00.000Z');

  it('3 horas hasta medianoche UTC', () => {
    expect(hoursUntilReset('2026-07-10T00:00:00.000Z', now)).toBe(3);
    expect(formatResetWait('2026-07-10T00:00:00.000Z', now)).toBe('~3 h');
  });

  it('menos de 1 hora', () => {
    const late = new Date('2026-07-09T23:30:00.000Z');
    expect(hoursUntilReset('2026-07-10T00:00:00.000Z', late)).toBe(1);
    expect(formatResetWait('2026-07-10T00:00:00.000Z', late)).toBe('menos de 1 h');
  });

  it('reset ya pasado → 0 (no negativos)', () => {
    expect(hoursUntilReset('2026-07-09T00:00:00.000Z', now)).toBe(0);
  });

  it('sin resetsAt o fecha inválida → null / string vacío', () => {
    expect(hoursUntilReset(null, now)).toBeNull();
    expect(hoursUntilReset('garbage', now)).toBeNull();
    expect(formatResetWait(null, now)).toBe('');
  });
});

describe('canOfferBoost', () => {
  it('true solo cuando hay boostOption', () => {
    const withBoost = parseRateLimitInfo(ENRICHED)!;
    expect(canOfferBoost(withBoost)).toBe(true);
    expect(canOfferBoost({ ...withBoost, boostOption: null })).toBe(false);
  });
});
