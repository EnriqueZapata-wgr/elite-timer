/**
 * Navegación del test de Braverman — lógica pura de posición.
 *
 * Extraída de app/braverman.tsx (F1 sprint UX blockers) para que el
 * avance/retroceso entre 313 preguntas y el cruce de partes sea testeable
 * sin montar el componente.
 */

export type BravermanPos = { part: 1 | 2; index: number };

export type BravermanAdvance =
  | { kind: 'question'; pos: BravermanPos }
  | { kind: 'transition'; pos: BravermanPos } // terminó Parte 1 → Parte 2, index 0
  | { kind: 'complete' };                     // terminó Parte 2 → calcular resultados

/** Avanza una pregunta. Cruza a Parte 2 vía transición; al final completa. */
export function advancePosition(pos: BravermanPos, part1Len: number, part2Len: number): BravermanAdvance {
  const len = pos.part === 1 ? part1Len : part2Len;
  if (pos.index + 1 < len) {
    return { kind: 'question', pos: { part: pos.part, index: pos.index + 1 } };
  }
  if (pos.part === 1) {
    return { kind: 'transition', pos: { part: 2, index: 0 } };
  }
  return { kind: 'complete' };
}

/**
 * Retrocede una pregunta (F1.2 botón atrás). Desde la primera de Parte 2
 * regresa a la última de Parte 1. Desde la primera de Parte 1 no hay atrás.
 */
export function retreatPosition(pos: BravermanPos, part1Len: number): BravermanPos | null {
  if (pos.index > 0) return { part: pos.part, index: pos.index - 1 };
  if (pos.part === 2) return { part: 1, index: part1Len - 1 };
  return null;
}

/** Hay pregunta anterior a la cual volver. */
export function canRetreat(pos: BravermanPos): boolean {
  return pos.index > 0 || pos.part === 2;
}
