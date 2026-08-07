/**
 * Tests del CONTEO de renglones (MB-26 Pieza 9 · reconvertido en MB-27 V3).
 *
 * El techo como límite murió (doctrina Enrique: "solo orientar"). Lo que se
 * amarra aquí es el NÚMERO honesto: espeja las reglas del compile, cuenta
 * la misma lista que se enciende (B2), y jamás cambia estado. Los
 * candidatos a reposo viven para /ordenar-dia.
 */
import { describe, it, expect } from 'vitest';
import {
  renglonesDeHoy, contarEncendido, diasSinHacer, candidatosAReposo,
} from '@/src/services/hoy/techo-core';
import { habitosQueEnciende, togglesForApp } from '@/src/services/hoy/install-core';
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

describe('el conteo de renglones (información, no juicio)', () => {
  it('cuenta los activos con las reglas del compile', () => {
    const prefs = prefsConOcho();
    expect(renglonesDeHoy(prefs, {})).toHaveLength(8);
    expect(contarEncendido(prefs, {}, ['red_glasses'])).toBe(9);
  });

  it('reposo resta, graduado resta (graduar libera renglón: ese es el premio)', () => {
    const prefs = prefsConOcho();
    expect(contarEncendido(prefs, { no_alcohol: 'reposo' }, ['red_glasses'])).toBe(8);
    expect(contarEncendido(prefs, { journal: 'graduado' }, ['red_glasses'])).toBe(8);
  });

  it('re-encender algo ya activo no infla el conteo (dedup)', () => {
    expect(contarEncendido(prefsConOcho(), {}, ['sunlight'])).toBe(8);
  });

  // MB-27 0.2 (mutación 2): un quant sin fuente jamás pinta fila en HOY —
  // encenderlo no puede sumar al conteo.
  it('encender un quant sin fuente NO suma renglón', () => {
    expect(contarEncendido(prefsConOcho(), {}, ['sleep'])).toBe(8);
  });

  it('un quant sin fuente persistido tampoco cuenta, venga en la lista que venga', () => {
    const prefs = { booleans: ['sleep', ...MANDATORY_BOOLEANS], quants: ['water', 'steps'] };
    // sleep y steps fuera; 5 MANDATORY + water = 6.
    expect(renglonesDeHoy(prefs, {})).toHaveLength(6);
  });

  // Audit B2 (vive en el CONTEO): la lista que se cuenta es la MISMA que
  // instalar enciende — habitosQueEnciende incluye los MANDATORY.
  it('B2: el conteo de instalar Cardio con cardio en reposo incluye el renglón que revive', () => {
    const prefs = {
      booleans: ['sunlight', 'no_alcohol', 'red_glasses', 'grounding', ...MANDATORY_BOOLEANS],
      quants: [],
    };
    const estados = { cardio: 'reposo' as const };
    expect(renglonesDeHoy(prefs, estados)).toHaveLength(8);
    expect(contarEncendido(prefs, estados, habitosQueEnciende('cardio'))).toBe(9);
    // La lista vieja (sin MANDATORY) contaría 8: el número mentiría.
    const vieja = togglesForApp('cardio');
    expect(contarEncendido(prefs, estados, [...vieja.booleans, ...vieja.quants])).toBe(8);
  });

  it('contar JAMÁS cambia nada: es consulta pura', () => {
    const prefs = Object.freeze({
      booleans: Object.freeze(['sunlight']) as unknown as string[],
      quants: Object.freeze([]) as unknown as string[],
    });
    const estados = Object.freeze({}) as Record<string, HabitEstado>;
    expect(() => contarEncendido(prefs, estados, ['red_glasses'])).not.toThrow();
    expect(prefs.booleans).toEqual(['sunlight']);
  });
});

describe('candidatos a reposo: los que llevas más tiempo fallando (para /ordenar-dia)', () => {
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
