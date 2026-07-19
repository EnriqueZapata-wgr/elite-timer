/**
 * Regresión MB-7 — labs hormonales SIEMPRE con contexto de fase (o su ausencia).
 * Un estradiol/progesterona/LH/FSH sin fase es un dato incompleto: se dice.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveLabCycleContext, isCycleSensitiveMarker, CYCLE_SENSITIVE_MARKERS,
} from '../lab-cycle-context-core';

describe('isCycleSensitiveMarker', () => {
  it('reconoce los 4 marcadores hormonales cíclicos (case-insensitive)', () => {
    for (const m of ['estradiol', 'progesterone', 'lh', 'fsh', 'FSH', 'Estradiol']) {
      expect(isCycleSensitiveMarker(m), m).toBe(true);
    }
  });
  it('marcadores no cíclicos → false', () => {
    for (const m of ['glucose', 'testosterone', 'tsh', 'ldl']) {
      expect(isCycleSensitiveMarker(m), m).toBe(false);
    }
    expect(CYCLE_SENSITIVE_MARKERS.has('testosterone')).toBe(false);
  });
});

describe('deriveLabCycleContext', () => {
  it('mujer + hormonal + fase conocida → nota con la fase', () => {
    const c = deriveLabCycleContext('estradiol', true, 'follicular');
    expect(c.show).toBe(true);
    expect(c.phaseKnown).toBe(true);
    expect(c.note).toContain('folicular');
  });

  it('mujer + hormonal + fase DESCONOCIDA → dice explícito que falta (no se calla)', () => {
    const c = deriveLabCycleContext('progesterone', true, null);
    expect(c.show).toBe(true);
    expect(c.phaseKnown).toBe(false);
    expect(c.note.toLowerCase()).toContain('sin fase');
  });

  it('marcador no hormonal → sin anotación aunque sea mujer', () => {
    expect(deriveLabCycleContext('glucose', true, 'luteal').show).toBe(false);
  });

  it('no-female → nunca muestra contexto de ciclo (ni con hormonal)', () => {
    expect(deriveLabCycleContext('estradiol', false, 'follicular').show).toBe(false);
    expect(deriveLabCycleContext('lh', false, null).show).toBe(false);
  });

  it('fase inválida/vacía se trata como desconocida', () => {
    expect(deriveLabCycleContext('fsh', true, 'banana').phaseKnown).toBe(false);
    expect(deriveLabCycleContext('fsh', true, '').phaseKnown).toBe(false);
  });
});
