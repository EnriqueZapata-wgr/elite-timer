/**
 * 4EP M3 (31-ago-2026): candado entre argos-habitos-hoy-core y day-compiler.
 *
 * `keysDelRenglon` es una COPIA de la derivación del renglón de HOY
 * (day-compiler.ts, compileDay, "Boolean electrons"). La derivación de
 * day-compiler no es una función: vive inline dentro de compileDay con sus
 * variables locales, y esta noche no se refactoriza (otro agente lo tocó).
 * Deuda escrita en el core: la derivación debería vivir en un solo sitio.
 *
 * Mientras tanto, dos candados:
 *  1. TEXTO: las cinco líneas exactas de day-compiler que el core replica
 *     siguen ahí tal cual. Si alguien cambia la derivación de HOY, este test
 *     truena y obliga a mover el core (o a unificar de una vez).
 *  2. CONDUCTA: una referencia armada con LOS MISMOS bloques que usa
 *     day-compiler (DEFAULT_BOOLEANS, MANDATORY_BOOLEANS, keysActivas,
 *     ELECTRON_WEIGHTS, FEMALE_ONLY_ELECTRONS), paso por paso como en
 *     compileDay, tiene que dar el mismo conjunto de llaves que el core en
 *     cuatro fixtures reales.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ELECTRON_WEIGHTS } from '@/src/constants/electrons';
import { DEFAULT_BOOLEANS, MANDATORY_BOOLEANS, FEMALE_ONLY_ELECTRONS } from '@/src/services/hoy/day-booleans';
import { estadosPorKey, keysActivas, type HabitEstadoRow } from '@/src/services/hoy/habit-states-core';
import { keysDelRenglon, type EntradaHabitosHoy } from '@/src/services/argos-habitos-hoy-core';

const DAY_COMPILER = readFileSync('src/services/day-compiler.ts', 'utf8');

describe('candado de texto: la derivación de HOY sigue siendo la que el core copia', () => {
  it.each([
    "const persistedBoolKeys: string[] = prefs?.active_boolean_electrons ?? DEFAULT_BOOLEANS;",
    "Array.from(new Set([...persistedBoolKeys, ...MANDATORY_BOOLEANS])), habitEstados,",
    ".filter(k => (ELECTRON_WEIGHTS as any)[k])",
    ".filter(k => !FEMALE_ONLY_ELECTRONS.has(k) || biologicalSex === 'female')",
    ".filter(k => k !== 'period_log' || cycleMode !== 'acompanante')",
  ])('day-compiler.ts contiene: %s', (linea) => {
    expect(DAY_COMPILER).toContain(linea);
  });
});

/** Los pasos de compileDay (líneas 442-548), con sus mismos bloques. */
function referenciaDayCompiler(e: EntradaHabitosHoy): string[] {
  const prefs = e.persistedBoolKeys == null ? null : { active_boolean_electrons: e.persistedBoolKeys };
  const habitEstados = estadosPorKey(e.habitStates);
  const persistedBoolKeys: string[] = prefs?.active_boolean_electrons ?? DEFAULT_BOOLEANS;
  const activeBoolKeys: string[] = keysActivas(
    Array.from(new Set([...persistedBoolKeys, ...MANDATORY_BOOLEANS])), habitEstados,
  );
  const biologicalSex = e.biologicalSex;
  const cycleMode = e.cycleMode;
  // El `as any` es copia LITERAL de day-compiler:545, a propósito (candado 1).
  return activeBoolKeys
    .filter(k => (ELECTRON_WEIGHTS as any)[k])
    .filter(k => !FEMALE_ONLY_ELECTRONS.has(k) || biologicalSex === 'female')
    .filter(k => k !== 'period_log' || cycleMode !== 'acompanante');
}

const estados = (rows: HabitEstadoRow[] | null) => rows;

const FIXTURES: [string, EntradaHabitosHoy][] = [
  ['prefs vacías (sin fila)', {
    persistedBoolKeys: null, habitStates: null, biologicalSex: null, cycleMode: null, blob: null, ledgerHoy: [],
  }],
  ['con graduado y reposo', {
    persistedBoolKeys: ['sunlight', 'meditation', 'nback', 'grounding'],
    habitStates: estados([
      { habit_key: 'sunlight', state: 'graduado' },
      { habit_key: 'journal', state: 'reposo' },
      { habit_key: 'nback', state: 'activo' },
    ]),
    biologicalSex: 'male', cycleMode: null, blob: null, ledgerHoy: [],
  }],
  ['mujer con Ciclo', {
    persistedBoolKeys: ['sunlight', 'period_log', 'supplements', 'fantasma'],
    habitStates: null, biologicalSex: 'female', cycleMode: null, blob: null, ledgerHoy: [],
  }],
  ['acompañante (calendario ajeno)', {
    persistedBoolKeys: ['sunlight', 'period_log', 'supplements'],
    habitStates: null, biologicalSex: 'female', cycleMode: 'acompanante', blob: null, ledgerHoy: [],
  }],
];

describe('candado de conducta: mismo conjunto de llaves que compileDay', () => {
  it.each(FIXTURES)('%s', (_nombre, entrada) => {
    expect(keysDelRenglon(entrada)).toEqual(referenciaDayCompiler(entrada));
  });
  it('los fixtures no son triviales: cubren las cuatro rejas', () => {
    expect(keysDelRenglon(FIXTURES[1][1])).not.toContain('sunlight');
    expect(keysDelRenglon(FIXTURES[1][1])).not.toContain('journal');
    expect(keysDelRenglon(FIXTURES[2][1])).toContain('period_log');
    expect(keysDelRenglon(FIXTURES[2][1])).not.toContain('fantasma');
    expect(keysDelRenglon(FIXTURES[3][1])).not.toContain('period_log');
  });
});
