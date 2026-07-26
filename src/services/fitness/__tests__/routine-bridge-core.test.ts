/**
 * Tests del puente builder → strength-session (MB-7 Track C).
 */
import { describe, it, expect } from 'vitest';
import { routineUsesClipRunner, bridgeRoutineToSession, type BridgeMatrixEntry } from '../routine-bridge-core';
import type { Routine, Block } from '@/src/engine/types';

let seq = 0;
function leaf(over: Partial<Block>): Block {
  return {
    id: `b${++seq}`,
    parent_block_id: null,
    sort_order: seq,
    type: 'work',
    label: 'Trabajo',
    duration_seconds: 30,
    rounds: 1,
    rest_between_seconds: 0,
    color: null,
    sound_start: 'default',
    sound_end: 'default',
    notes: '',
    ...over,
  };
}

function group(children: Block[], over: Partial<Block> = {}): Block {
  return { ...leaf({ type: 'group', label: 'Grupo', duration_seconds: null, ...over }), children };
}

function routine(blocks: Block[]): Routine {
  return { id: 'r1', name: 'Test', description: '', category: 'custom', mode: 'timer', blocks };
}

const MATRIX = new Map<string, BridgeMatrixEntry>([
  ['peso-muerto', {
    slug: 'peso-muerto', nombre: 'Peso muerto', mediaUrl: 'clip.mp4', posterUrl: 'p.jpg',
    dinamica: 'Normal', lateralidad: 'Bilateral', musculoPrincipal: 'Isquiotibiales',
    patron: 'Bisagra' as BridgeMatrixEntry['patron'], familia: 'peso-muerto',
  }],
  ['plancha', {
    slug: 'plancha', nombre: 'Plancha', mediaUrl: null, posterUrl: null,
    dinamica: 'Isométrico', lateralidad: 'Bilateral', musculoPrincipal: 'Core',
    patron: 'Anti-extensión' as BridgeMatrixEntry['patron'], familia: 'plancha',
  }],
]);

describe('routineUsesClipRunner — la interfaz la decide el CONTENIDO', () => {
  it('false para rutina de puro tiempo (va al timer)', () => {
    expect(routineUsesClipRunner(routine([leaf({}), leaf({ type: 'rest' })]))).toBe(false);
  });

  it('true si un work trae matrix_slug, aunque esté anidado', () => {
    const r = routine([group([group([leaf({ matrix_slug: 'peso-muerto' })])])]);
    expect(routineUsesClipRunner(r)).toBe(true);
  });

  it('un matrix_slug en un bloque NO-work no cuenta', () => {
    expect(routineUsesClipRunner(routine([leaf({ type: 'rest', matrix_slug: 'peso-muerto' })]))).toBe(false);
  });
});

describe('bridgeRoutineToSession — traducción árbol → bloques de sesión', () => {
  it('hoja con rounds y rest_between → UN bloque con series y descanso entre series', () => {
    const r = routine([leaf({ matrix_slug: 'peso-muerto', rounds: 3, rest_between_seconds: 120 })]);
    const { bloques, omitidos } = bridgeRoutineToSession(r, MATRIX);
    expect(omitidos).toEqual([]);
    expect(bloques).toHaveLength(1);
    expect(bloques[0]).toMatchObject({ slug: 'peso-muerto', series: 3, descansoSeg: 120, esIsometrico: false, reps: 10 });
    expect(bloques[0].esTiempo).toBeUndefined();
  });

  it('isométrico hereda segundos de hold como "reps"', () => {
    const r = routine([leaf({ matrix_slug: 'plancha' })]);
    const { bloques } = bridgeRoutineToSession(r, MATRIX);
    expect(bloques[0]).toMatchObject({ esIsometrico: true, reps: 40 });
  });

  it('mezcla: ejercicio de matriz + bloques de tiempo, en orden y SIN salir de la sesión', () => {
    const r = routine([
      leaf({ type: 'prep', label: 'Prepárate', duration_seconds: 10 }),
      leaf({ matrix_slug: 'peso-muerto', rounds: 2, rest_between_seconds: 90 }),
      leaf({ label: 'Burpees', duration_seconds: 45 }),
    ]);
    const { bloques } = bridgeRoutineToSession(r, MATRIX);
    expect(bloques.map((b) => b.nombre)).toEqual(['Prepárate', 'Peso muerto', 'Burpees']);
    expect(bloques[0]).toMatchObject({ esTiempo: true, tiempoSeg: 10 });
    expect(bloques[1]).toMatchObject({ series: 2, descansoSeg: 90 });
    expect(bloques[2]).toMatchObject({ esTiempo: true, tiempoSeg: 45 });
  });

  it('en secciones de tiempo el descanso prescrito se corre tal cual', () => {
    const r = routine([
      leaf({ label: 'Burpees', duration_seconds: 30 }),
      leaf({ type: 'rest', label: 'Descanso', duration_seconds: 20 }),
      leaf({ label: 'Jumping jacks', duration_seconds: 30 }),
    ]);
    const { bloques } = bridgeRoutineToSession(r, MATRIX);
    expect(bloques.map((b) => [b.nombre, b.tiempoSeg, !!b.esDescansoTiempo])).toEqual([
      ['Burpees', 30, false],
      ['Descanso', 20, true],
      ['Jumping jacks', 30, false],
    ]);
  });

  it('rest entre estaciones de FUERZA distintas se suelta (ritmo propio + RestTimer)', () => {
    const r = routine([
      leaf({ matrix_slug: 'peso-muerto' }),
      leaf({ type: 'rest', duration_seconds: 60 }),
      leaf({ matrix_slug: 'plancha' }),
    ]);
    const { bloques } = bridgeRoutineToSession(r, MATRIX);
    expect(bloques.map((b) => b.slug)).toEqual(['peso-muerto', 'plancha']);
  });

  it('circuito A,B×2 rondas conserva el ORDEN real (A,B,A,B), no lo aplana', () => {
    const r = routine([
      group(
        [leaf({ matrix_slug: 'peso-muerto' }), leaf({ matrix_slug: 'plancha' })],
        { rounds: 2 },
      ),
    ]);
    const { bloques } = bridgeRoutineToSession(r, MATRIX);
    expect(bloques.map((b) => b.slug)).toEqual(['peso-muerto', 'plancha', 'peso-muerto', 'plancha']);
    expect(bloques.every((b) => b.series === 1)).toBe(true);
  });

  it('matrix_slug fuera del catálogo → fail-soft: corre por tiempo y se reporta', () => {
    const r = routine([leaf({ matrix_slug: 'fantasma', exercise_name: 'Fantasma', duration_seconds: 40 })]);
    const { bloques, omitidos } = bridgeRoutineToSession(r, MATRIX);
    expect(omitidos).toEqual(['Fantasma']);
    expect(bloques[0]).toMatchObject({ esTiempo: true, tiempoSeg: 40 });
  });

  it('steps de duración 0 no generan bloques', () => {
    const r = routine([leaf({ duration_seconds: 0 }), leaf({ matrix_slug: 'peso-muerto' })]);
    const { bloques } = bridgeRoutineToSession(r, MATRIX);
    expect(bloques.map((b) => b.slug)).toEqual(['peso-muerto']);
  });
});
