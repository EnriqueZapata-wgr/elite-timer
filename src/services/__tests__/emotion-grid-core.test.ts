/**
 * Pieza 2 (MB-14) — la regla del cuerpo.
 *
 * El mapa corporal SOLO se ofrece con emoción desagradable intensa. (Los
 * tests de orden y tono de la cuadrícula se retiraron con MoodGrid en MB-15:
 * el plano 12x12 se cubre en emotion-plane-core.test.)
 */
import { describe, it, expect } from 'vitest';
import {
  shouldOfferBodyMap, isUnpleasant, BODY_MAP_MIN_INTENSITY,
} from '../emotion-grid-core';
import { EMOTIONS } from '../../data/emotions-library';

describe('shouldOfferBodyMap — Pieza 2, la regla que no se rompe', () => {
  it('sí: desagradable con intensidad >= 7 (alta o baja energía)', () => {
    expect(shouldOfferBodyMap(['overwhelmed'])).toBe(true); // high_unpleasant · 8
    expect(shouldOfferBodyMap(['lonely'])).toBe(true);      // low_unpleasant · 7
    expect(shouldOfferBodyMap(['hopeless'])).toBe(true);    // crisis también es intensa
  });

  it('no: desagradable por debajo del umbral', () => {
    expect(shouldOfferBodyMap(['stressed'])).toBe(false); // high_unpleasant · 6
    expect(shouldOfferBodyMap(['sad'])).toBe(false);      // low_unpleasant · 6
  });

  it('no: NINGUNA emoción agradable lo dispara, ni la más intensa', () => {
    for (const e of EMOTIONS.filter((em) => !isUnpleasant(em.quadrant))) {
      expect(shouldOfferBodyMap([e.id])).toBe(false);
    }
  });

  it('con selección mixta manda la desagradable intensa', () => {
    expect(shouldOfferBodyMap(['happy', 'overwhelmed'])).toBe(true);
    expect(shouldOfferBodyMap(['happy', 'stressed'])).toBe(false);
  });

  it('vacío o id desconocido → nunca se muestra', () => {
    expect(shouldOfferBodyMap([])).toBe(false);
    expect(shouldOfferBodyMap(['no_existe'])).toBe(false);
  });

  it('el umbral del brief es 7', () => {
    expect(BODY_MAP_MIN_INTENSITY).toBe(7);
  });
});
