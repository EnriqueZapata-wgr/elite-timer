/**
 * MB-14 · Pieza 1 y Pieza 2 — la cuadrícula y la regla del cuerpo.
 *
 * Cubre lo que el device test no puede automatizar:
 *  - el color de la celda SALE DEL CUADRANTE (ningún amarillo dentro del
 *    rojo: el hex base de todas las celdas de un cuadrante es idéntico),
 *  - el tono crece con la intensidad y es monótono,
 *  - el orden de celdas es determinista y completo (las 36 del cuadrante),
 *  - el mapa corporal SOLO se ofrece con emoción desagradable intensa.
 */
import { describe, it, expect } from 'vitest';
import {
  emotionsForQuadrant, cellTone, cellToneOpacity,
  shouldOfferBodyMap, isUnpleasant,
  CELL_TONE_MIN, CELL_TONE_MAX, BODY_MAP_MIN_INTENSITY,
} from '../emotion-grid-core';
import { EMOTIONS, QUADRANTS, type QuadrantKey } from '../../data/emotions-library';

const ALL_QUADRANTS = Object.keys(QUADRANTS) as QuadrantKey[];

describe('emotionsForQuadrant — las celdas del cuadrante', () => {
  it('devuelve las 36 emociones de cada cuadrante, sin fugas ni duplicados', () => {
    for (const q of ALL_QUADRANTS) {
      const cells = emotionsForQuadrant(q);
      expect(cells).toHaveLength(36);
      expect(new Set(cells.map((e) => e.id)).size).toBe(36);
      expect(cells.every((e) => e.quadrant === q)).toBe(true);
    }
    // Las 4 cuadrículas juntas son exactamente la biblioteca completa.
    const total = ALL_QUADRANTS.flatMap((q) => emotionsForQuadrant(q));
    expect(total).toHaveLength(EMOTIONS.length);
  });

  it('ordena de suave a intensa, con orden estable entre llamadas', () => {
    for (const q of ALL_QUADRANTS) {
      const cells = emotionsForQuadrant(q);
      for (let i = 1; i < cells.length; i++) {
        expect(cells[i].intensity).toBeGreaterThanOrEqual(cells[i - 1].intensity);
      }
      expect(emotionsForQuadrant(q).map((e) => e.id)).toEqual(cells.map((e) => e.id));
    }
  });
});

describe('cellTone — un cuadrante, una familia cromática, sin excepciones', () => {
  it('el hex base de TODAS las celdas de un cuadrante es el color del cuadrante', () => {
    // El fix de la incoherencia: ningún amarillo dentro del rojo. withOpacity
    // devuelve #RRGGBBAA → los primeros 7 chars deben ser el hex del cuadrante.
    for (const q of ALL_QUADRANTS) {
      for (const e of emotionsForQuadrant(q)) {
        expect(cellTone(q, e.intensity).startsWith(QUADRANTS[q].color)).toBe(true);
      }
    }
  });

  it('el tono crece con la intensidad (monótono) y respeta el rango', () => {
    for (let i = 2; i <= 10; i++) {
      expect(cellToneOpacity(i)).toBeGreaterThan(cellToneOpacity(i - 1));
    }
    expect(cellToneOpacity(1)).toBe(CELL_TONE_MIN);
    expect(cellToneOpacity(10)).toBe(CELL_TONE_MAX);
    // Clamp: fuera de rango no revienta ni se sale del techo de legibilidad.
    expect(cellToneOpacity(0)).toBe(CELL_TONE_MIN);
    expect(cellToneOpacity(99)).toBe(CELL_TONE_MAX);
  });
});

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
