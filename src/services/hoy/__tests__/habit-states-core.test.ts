/**
 * Tests que amarran los tres estados del hábito (MB-26 Pieza 9).
 *
 * Mutación 8 · SIN FILA = ACTIVO: nadie pierde nada al actualizar. La
 *   mutación que cambie el default truena aquí.
 * Mutación 2 · Verificado graduado sigue dando electrón: ledgerKeys
 *   IGNORA estados. La mutación que filtre por estado truena aquí.
 * Mutación 1 (parte) · Nada se borra: filtrar renglones no muta nada.
 */
import { describe, it, expect } from 'vitest';
import {
  estadosPorKey, estadoDe, renglonesActivos, keysActivas,
  keysGraduadas, keysEnReposo, ledgerKeys,
  type HabitEstado,
} from '@/src/services/hoy/habit-states-core';
import { VERIFIED_ELECTRON_KEYS } from '@/src/services/hoy/day-booleans';

describe('sin fila = activo (mutación 8)', () => {
  it('lectura fallida o migración pendiente = todos activos', () => {
    expect(estadosPorKey(null)).toEqual({});
    expect(estadoDe('meditation', {})).toBe('activo');
  });

  it('un usuario existente sin filas conserva TODOS sus renglones', () => {
    const items = ['sunlight', 'meditation', 'journal', 'checkin', 'water']
      .map((source) => ({ source }));
    expect(renglonesActivos(items, estadosPorKey(null))).toEqual(items);
    expect(renglonesActivos(items, estadosPorKey([]))).toEqual(items);
  });

  it('filas ilegibles se ignoran (no rompen ni apagan nada)', () => {
    const estados = estadosPorKey([
      { habit_key: 'meditation', state: 'graduado' },
      { habit_key: '', state: 'reposo' } as never,
      { habit_key: 'journal', state: 'basura' } as never,
    ]);
    expect(estados).toEqual({ meditation: 'graduado' });
  });
});

describe('el filtro de renglones', () => {
  const estados: Record<string, HabitEstado> = {
    meditation: 'graduado',
    grounding: 'reposo',
    sunlight: 'activo',
  };

  it('graduado y reposo salen del renglón; activo y sin fila se quedan', () => {
    expect(keysActivas(['meditation', 'grounding', 'sunlight', 'journal'], estados))
      .toEqual(['sunlight', 'journal']);
  });

  it('el estante y el reposo se listan por separado', () => {
    expect(keysGraduadas(estados)).toEqual(['meditation']);
    expect(keysEnReposo(estados)).toEqual(['grounding']);
  });

  it('no muta sus entradas (nada se borra: mutación 1)', () => {
    const items = Object.freeze([
      Object.freeze({ source: 'meditation' }), Object.freeze({ source: 'sunlight' }),
    ]) as unknown as { source: string }[];
    const estadosFrozen = Object.freeze({ meditation: 'graduado' as const });
    expect(() => renglonesActivos(items, estadosFrozen)).not.toThrow();
    expect(items.length).toBe(2);
  });
});

describe('graduar quita el renglón, nunca el crédito (mutación 2)', () => {
  it('ledgerKeys ignora los estados: el verificado graduado sigue en el ledger', () => {
    // El compile decide qué reconciliar con ledgerKeys(evidencias); si una
    // mutación lo filtrara por estado, meditation (graduada) dejaría de
    // ganar su electrón con actividad real.
    const evidencias = { meditation: 'hecho', strength: 'no_hecho', checkin: 'no_se_sabe' };
    const estados: Record<string, HabitEstado> = { meditation: 'graduado', strength: 'reposo' };
    const keys = ledgerKeys(evidencias);
    expect(keys).toContain('meditation');
    expect(keys).toContain('strength');
    expect(keys.sort()).toEqual(Object.keys(evidencias).sort());
    // Y el renglón sí se filtra — ese es el premio, no el castigo.
    expect(keysActivas(keys, estados)).toEqual(['checkin']);
  });

  it('meditation es verificado de verdad (el escenario no es hipotético)', () => {
    expect(VERIFIED_ELECTRON_KEYS as readonly string[]).toContain('meditation');
  });
});
