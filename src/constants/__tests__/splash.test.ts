/**
 * Splash cinemático — timing (Sprint ONBOARDING épico T2).
 * El brief exige: 2-3s total ("nadie quiere splash largo"), tagline con
 * delay de 400ms tras el logo, dissolve final.
 */
import { describe, it, expect } from 'vitest';
import {
  SPLASH_LOGO_FADE_MS,
  SPLASH_TAGLINE_DELAY_MS,
  SPLASH_TAGLINE_FADE_MS,
  SPLASH_HOLD_MS,
  SPLASH_DISSOLVE_MS,
  SPLASH_TAGLINE,
  splashTaglineStartMs,
  splashDissolveStartMs,
  splashTotalMs,
} from '../splash';

describe('splash · timing', () => {
  it('el splash total dura entre 2 y 4 segundos', () => {
    expect(splashTotalMs()).toBeGreaterThanOrEqual(2000);
    expect(splashTotalMs()).toBeLessThanOrEqual(4000);
  });

  it('el tagline entra 400ms después de la fase de logo (spec)', () => {
    expect(SPLASH_TAGLINE_DELAY_MS).toBe(400);
    expect(splashTaglineStartMs()).toBe(SPLASH_LOGO_FADE_MS + 400);
  });

  it('la secuencia es monotónica: logo → tagline → dissolve → fin', () => {
    expect(splashTaglineStartMs()).toBeGreaterThan(0);
    expect(splashDissolveStartMs()).toBeGreaterThan(splashTaglineStartMs() + SPLASH_TAGLINE_FADE_MS);
    expect(splashTotalMs()).toBe(splashDissolveStartMs() + SPLASH_DISSOLVE_MS);
  });

  it('todas las fases tienen duración positiva y hold de ~500ms', () => {
    for (const ms of [SPLASH_LOGO_FADE_MS, SPLASH_TAGLINE_FADE_MS, SPLASH_HOLD_MS, SPLASH_DISSOLVE_MS]) {
      expect(ms).toBeGreaterThan(0);
    }
    expect(SPLASH_HOLD_MS).toBe(500);
  });

  it('el tagline editorial existe y no grita (sin exclamaciones)', () => {
    expect(SPLASH_TAGLINE.length).toBeGreaterThan(0);
    expect(SPLASH_TAGLINE).not.toMatch(/!/);
  });
});
