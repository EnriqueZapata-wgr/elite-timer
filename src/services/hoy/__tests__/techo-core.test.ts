/**
 * Tests que amarran el techo del día (MB-26 Pieza 9, mutación 4).
 *
 * El noveno avisa; forzar se respeta (evaluar jamás cambia nada: solo la
 * UI ejecuta la decisión del usuario); los graduados NO cuentan.
 */
import { describe, it, expect } from 'vitest';
import {
  TECHO_RENGLONES, renglonesDeHoy, evaluarEncendido, diasSinHacer, candidatosAReposo,
} from '@/src/services/hoy/techo-core';
import { MANDATORY_BOOLEANS } from '@/src/services/hoy/day-booleans';
import { ultimasFechas } from '@/src/services/hoy/graduacion-core';
import type { HabitEstado } from '@/src/services/hoy/habit-states-core';

const HOY = '2026-08-06';

// Ocho renglones exactos: 5 MANDATORY (siempre en el día) + 3 más.
function prefsConOcho() {
  return {
    booleans: ['sunlight', 'no_alcohol', ...MANDATORY_BOOLEANS],
    quants: ['water'],
  };
}

describe('el techo de 8 renglones (mutación 4)', () => {
  it('el default es 8: no es configuración', () => {
    expect(TECHO_RENGLONES).toBe(8);
  });

  it('con 8 activos, encender el noveno avisa', () => {
    const prefs = prefsConOcho();
    expect(renglonesDeHoy(prefs, {})).toHaveLength(8);
    const ev = evaluarEncendido(prefs, {}, ['red_glasses']);
    expect(ev.excede).toBe(true);
    expect(ev.total).toBe(9);
  });

  it('con 7 activos, el octavo entra sin aviso', () => {
    const prefs = prefsConOcho();
    const estados: Record<string, HabitEstado> = { no_alcohol: 'reposo' };
    const ev = evaluarEncendido(prefs, estados, ['red_glasses']);
    expect(ev.excede).toBe(false);
    expect(ev.total).toBe(8);
  });

  it('los graduados NO cuentan: graduar libera renglón (ese es el premio)', () => {
    const prefs = prefsConOcho();
    const estados: Record<string, HabitEstado> = { journal: 'graduado' };
    const ev = evaluarEncendido(prefs, estados, ['red_glasses']);
    expect(ev.excede).toBe(false);
    expect(ev.total).toBe(8);
  });

  it('re-encender algo ya activo no infla el conteo (dedup)', () => {
    const prefs = prefsConOcho();
    const ev = evaluarEncendido(prefs, {}, ['sunlight']);
    expect(ev.total).toBe(8);
    expect(ev.excede).toBe(false);
  });

  // MB-27 0.2 (mutación 2): un quant sin fuente (sleep, steps) jamás pinta
  // fila en HOY — encenderlo NO puede sumar renglón. Antes el candidato
  // nuevo entraba por booleans sin el filtro y el aviso "tu día ya está
  // lleno" se disparaba con 8 renglones reales, no 9.
  it('encender un quant sin fuente NO suma renglón: el aviso sale en el noveno real', () => {
    const prefs = prefsConOcho(); // 8 reales
    const ev = evaluarEncendido(prefs, {}, ['sleep']);
    expect(ev.total).toBe(8);
    expect(ev.excede).toBe(false);
    // El noveno real sí avisa (la regla de siempre sigue viva).
    const ev9 = evaluarEncendido(prefs, {}, ['red_glasses']);
    expect(ev9.excede).toBe(true);
  });

  it('un quant sin fuente persistido tampoco cuenta, venga en la lista que venga', () => {
    const prefs = { booleans: ['sleep', ...MANDATORY_BOOLEANS], quants: ['water', 'steps'] };
    // sleep y steps fuera; 5 MANDATORY + water = 6.
    expect(renglonesDeHoy(prefs, {})).toHaveLength(6);
  });

  it('evaluar JAMÁS cambia nada: forzar es decisión del usuario', () => {
    // La función es consulta pura — si una mutación escribiera estados o
    // listas desde aquí, el "aviso" se volvería candado y esto truena.
    const prefs = Object.freeze({
      booleans: Object.freeze(['sunlight']) as unknown as string[],
      quants: Object.freeze([]) as unknown as string[],
    });
    const estados = Object.freeze({}) as Record<string, HabitEstado>;
    expect(() => evaluarEncendido(prefs, estados, ['red_glasses'])).not.toThrow();
    expect(prefs.booleans).toEqual(['sunlight']);
  });
});

describe('candidatos a reposo: los que llevas más tiempo fallando', () => {
  const historial = {
    sunlight: new Set(ultimasFechas(HOY, 3)), // hecho hoy
    journal: new Set([ultimasFechas(HOY, 10)[0]]), // hace 9 días
    grounding: new Set<string>(), // jamás
  };

  it('diasSinHacer cuenta desde el último hecho; nunca = ventana + 1', () => {
    expect(diasSinHacer(historial.sunlight, HOY)).toBe(0);
    expect(diasSinHacer(historial.journal, HOY)).toBe(9);
    expect(diasSinHacer(historial.grounding, HOY)).toBe(36);
    expect(diasSinHacer(undefined, HOY)).toBe(36);
  });

  it('ordena del más abandonado al menos y excluye lo que se va a encender', () => {
    expect(candidatosAReposo(['sunlight', 'journal', 'grounding'], historial, HOY))
      .toEqual(['grounding', 'journal', 'sunlight']);
    expect(candidatosAReposo(['sunlight', 'journal', 'grounding'], historial, HOY, ['grounding']))
      .toEqual(['journal', 'sunlight']);
  });
});
