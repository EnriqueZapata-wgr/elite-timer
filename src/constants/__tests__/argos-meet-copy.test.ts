/**
 * Meet ARGOS copy — guion cinemático (Sprint ONBOARDING épico T1).
 * Valida estructura del guion, timing y la interpolación de nombre.
 */
import { describe, it, expect } from 'vitest';
import {
  MEET_SCREENS,
  MEET_TYPING_MS_PER_CHAR,
  MEET_TRANSITION_MS,
  MEET_CTA_DELAY_MS,
  MEET_CTA_LABEL,
  resolveMeetText,
  typingDurationMs,
  meetScreenDwellMs,
} from '../argos-meet-copy';

describe('argos-meet-copy · guion', () => {
  it('tiene exactamente 5 pantallas con keys únicos y texto no vacío', () => {
    expect(MEET_SCREENS).toHaveLength(5);
    const keys = MEET_SCREENS.map(sc => sc.key);
    expect(new Set(keys).size).toBe(5);
    for (const sc of MEET_SCREENS) {
      expect(sc.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('typing effect solo en las primeras 3 pantallas (spec del brief)', () => {
    expect(MEET_SCREENS.map(sc => sc.typing)).toEqual([true, true, true, false, false]);
  });

  it('la última pantalla espera al usuario (sin auto-avance) y el CTA tiene pausa dramática', () => {
    const last = MEET_SCREENS[MEET_SCREENS.length - 1];
    expect(last.holdMs).toBe(0);
    expect(meetScreenDwellMs(last)).toBe(0);
    expect(MEET_CTA_DELAY_MS).toBeGreaterThan(0);
    expect(MEET_CTA_LABEL.trim().length).toBeGreaterThan(0);
  });

  it('cada pantalla con auto-avance permanece entre 4 y 10 segundos', () => {
    for (const sc of MEET_SCREENS.slice(0, -1)) {
      const dwell = meetScreenDwellMs(sc, 'Enrique');
      expect(dwell).toBeGreaterThanOrEqual(4000);
      expect(dwell).toBeLessThanOrEqual(10000);
    }
  });

  it('la experiencia auto-avanzada total cae en el rango 20-45s del brief', () => {
    const total = MEET_SCREENS.reduce((acc, sc) => acc + meetScreenDwellMs(sc, 'Enrique'), 0)
      + MEET_CTA_DELAY_MS
      + MEET_SCREENS.length * MEET_TRANSITION_MS;
    expect(total).toBeGreaterThanOrEqual(20000);
    expect(total).toBeLessThanOrEqual(45000);
  });

  it('progresión de intensidad del avatar: arranca idle y sube a speaking', () => {
    expect(MEET_SCREENS[0].avatarState).toBe('idle');
    expect(MEET_SCREENS[1].avatarState).toBe('speaking');
    expect(MEET_SCREENS[2].avatarState).toBe('speaking');
    // La pantalla larga manda el avatar a fondo (opacidad reducida).
    expect(MEET_SCREENS[3].avatarOpacity).toBeLessThan(1);
  });
});

describe('argos-meet-copy · helpers', () => {
  it('resolveMeetText interpola el nombre', () => {
    expect(resolveMeetText('Hola, {nombre}.', 'Enrique')).toBe('Hola, Enrique.');
  });

  it('resolveMeetText degrada sin coma huérfana cuando no hay nombre', () => {
    expect(resolveMeetText('Hola, {nombre}.', '')).toBe('Hola.');
    expect(resolveMeetText('Hola, {nombre}.', '   ')).toBe('Hola.');
  });

  it('typingDurationMs usa ~40ms/char', () => {
    expect(typingDurationMs('abcd')).toBe(4 * MEET_TYPING_MS_PER_CHAR);
    expect(typingDurationMs('ab', 100)).toBe(200);
  });

  it('meetScreenDwellMs = typing + hold en pantallas typing', () => {
    const sc = MEET_SCREENS[0];
    const text = resolveMeetText(sc.text, 'Ana');
    expect(meetScreenDwellMs(sc, 'Ana')).toBe(text.length * MEET_TYPING_MS_PER_CHAR + sc.holdMs);
  });
});
