/**
 * community-presence-core — regla HONESTA de social proof.
 * Bajo el umbral (PRESENCE_MIN_COUNT) → placeholder; a partir del umbral → conteo.
 */
import { describe, it, expect } from 'vitest';
import { presenceDisplay, PRESENCE_MIN_COUNT } from '../community-presence-core';

describe('presenceDisplay · umbral', () => {
  it('el umbral es 10', () => {
    expect(PRESENCE_MIN_COUNT).toBe(10);
  });

  it('count 0 → placeholder', () => {
    const d = presenceDisplay(0);
    expect(d.mode).toBe('placeholder');
    expect(d.text).toBe('En comunidad · verifica pronto');
  });

  it('count justo debajo del umbral (9) → placeholder', () => {
    expect(presenceDisplay(PRESENCE_MIN_COUNT - 1).mode).toBe('placeholder');
  });

  it('count exactamente en el umbral (10) → conteo real', () => {
    const d = presenceDisplay(PRESENCE_MIN_COUNT);
    expect(d.mode).toBe('count');
    if (d.mode === 'count') {
      expect(d.count).toBe(10);
      expect(d.text).toBe('10 personas activas hoy');
    }
  });

  it('count por encima del umbral (42) → conteo real con número', () => {
    const d = presenceDisplay(42);
    expect(d.mode).toBe('count');
    if (d.mode === 'count') {
      expect(d.count).toBe(42);
      expect(d.text).toContain('42');
    }
  });
});

describe('presenceDisplay · entradas inválidas (nunca inventa números)', () => {
  it('negativo → placeholder (tratado como 0)', () => {
    expect(presenceDisplay(-5).mode).toBe('placeholder');
  });

  it('NaN → placeholder', () => {
    expect(presenceDisplay(Number.NaN).mode).toBe('placeholder');
  });

  it('decimal se trunca hacia abajo (10.9 → 10, conteo)', () => {
    const d = presenceDisplay(10.9);
    expect(d.mode).toBe('count');
    if (d.mode === 'count') expect(d.count).toBe(10);
  });

  it('decimal bajo el umbral (9.9 → 9, placeholder)', () => {
    expect(presenceDisplay(9.9).mode).toBe('placeholder');
  });
});
