import { describe, it, expect } from 'vitest';
import { advancePosition, retreatPosition, canRetreat } from '../braverman-nav';

// Longitudes reales del test: Parte 1 = 199 (dominancias), Parte 2 = 114 (deficiencias)
const P1 = 199;
const P2 = 114;

describe('advancePosition', () => {
  it('avanza dentro de la Parte 1', () => {
    expect(advancePosition({ part: 1, index: 0 }, P1, P2)).toEqual({
      kind: 'question',
      pos: { part: 1, index: 1 },
    });
  });

  it('última pregunta de Parte 1 → transición a Parte 2 index 0', () => {
    expect(advancePosition({ part: 1, index: P1 - 1 }, P1, P2)).toEqual({
      kind: 'transition',
      pos: { part: 2, index: 0 },
    });
  });

  it('avanza dentro de la Parte 2', () => {
    expect(advancePosition({ part: 2, index: 5 }, P1, P2)).toEqual({
      kind: 'question',
      pos: { part: 2, index: 6 },
    });
  });

  it('última pregunta de Parte 2 → completa el test', () => {
    expect(advancePosition({ part: 2, index: P2 - 1 }, P1, P2)).toEqual({ kind: 'complete' });
  });
});

describe('retreatPosition (F1.2 botón atrás)', () => {
  it('retrocede dentro de una parte', () => {
    expect(retreatPosition({ part: 1, index: 10 }, P1)).toEqual({ part: 1, index: 9 });
    expect(retreatPosition({ part: 2, index: 3 }, P1)).toEqual({ part: 2, index: 2 });
  });

  it('primera pregunta de Parte 2 → regresa a la última de Parte 1', () => {
    expect(retreatPosition({ part: 2, index: 0 }, P1)).toEqual({ part: 1, index: P1 - 1 });
  });

  it('primera pregunta de Parte 1 → no hay atrás', () => {
    expect(retreatPosition({ part: 1, index: 0 }, P1)).toBeNull();
  });

  it('ida y vuelta es simétrica dentro de una parte', () => {
    const fwd = advancePosition({ part: 1, index: 42 }, P1, P2);
    expect(fwd.kind).toBe('question');
    if (fwd.kind === 'question') {
      expect(retreatPosition(fwd.pos, P1)).toEqual({ part: 1, index: 42 });
    }
  });

  it('ida y vuelta es simétrica cruzando el límite de partes', () => {
    const fwd = advancePosition({ part: 1, index: P1 - 1 }, P1, P2);
    expect(fwd.kind).toBe('transition');
    if (fwd.kind === 'transition') {
      expect(retreatPosition(fwd.pos, P1)).toEqual({ part: 1, index: P1 - 1 });
    }
  });
});

describe('canRetreat', () => {
  it('false solo en la primera pregunta de Parte 1', () => {
    expect(canRetreat({ part: 1, index: 0 })).toBe(false);
    expect(canRetreat({ part: 1, index: 1 })).toBe(true);
    expect(canRetreat({ part: 2, index: 0 })).toBe(true);
    expect(canRetreat({ part: 2, index: 50 })).toBe(true);
  });
});
