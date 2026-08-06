/**
 * Tests que amarran la graduación (MB-26 Pieza 9).
 *
 * Mutación 3 · 30/35 propone, 29/35 no; recaída 5/7 devuelve a activo.
 * Mutación 1 (parte) · Nada se borra: el historial pasa intacto por todo
 *   el flujo y la racha se conserva al volver de reposo.
 */
import { describe, it, expect } from 'vitest';
import {
  ultimasFechas, cumplidosEnVentana, esCandidatoAGraduar, hayRecaida,
  propuestasDeGraduacion, recaidasDeGraduados, GRADUACION, RECAIDA,
} from '@/src/services/hoy/graduacion-core';
import type { HabitEstado } from '@/src/services/hoy/habit-states-core';

const HOY = '2026-08-06';

/** Historial con los últimos `hechos` días cumplidos (terminando en hoy). */
function hechosRecientes(n: number): Set<string> {
  return new Set(ultimasFechas(HOY, n));
}

/** Historial con exactamente n cumplidos dentro de la ventana de 35. */
function hechosEnVentana(n: number): Set<string> {
  return new Set(ultimasFechas(HOY, GRADUACION.dias).slice(0, n));
}

describe('la ventana de fechas', () => {
  it('genera n fechas terminando en hoy, sin sorpresas de DST', () => {
    const f = ultimasFechas(HOY, 7);
    expect(f).toHaveLength(7);
    expect(f[6]).toBe(HOY);
    expect(f[0]).toBe('2026-07-31');
  });

  it('cruza meses y años sin romperse', () => {
    expect(ultimasFechas('2026-01-01', 2)).toEqual(['2025-12-31', '2026-01-01']);
  });
});

describe('graduación 30/35 (mutación 3)', () => {
  it('30 de 35 propone', () => {
    expect(esCandidatoAGraduar(hechosEnVentana(30), HOY)).toBe(true);
  });

  it('29 de 35 NO propone', () => {
    expect(esCandidatoAGraduar(hechosEnVentana(29), HOY)).toBe(false);
  });

  it('sin historial no propone', () => {
    expect(esCandidatoAGraduar(undefined, HOY)).toBe(false);
    expect(esCandidatoAGraduar(new Set(), HOY)).toBe(false);
  });

  it('solo los ACTIVOS entran a propuestas (la app propone, nunca gradúa sola)', () => {
    const historial = { sunlight: hechosEnVentana(32), journal: hechosEnVentana(31) };
    // propuestasDeGraduacion recibe SOLO activos: un graduado o reposado
    // jamás llega aquí (el caller filtra por estado).
    expect(propuestasDeGraduacion(['sunlight'], historial, HOY)).toEqual(['sunlight']);
    expect(propuestasDeGraduacion([], historial, HOY)).toEqual([]);
  });
});

describe('recaída 5/7 (mutación 3)', () => {
  it('5 de 7 fallados = recaída; 4 de 7 no', () => {
    // 2 hechos en los últimos 7 → 5 fallos → recae.
    expect(hayRecaida(hechosRecientes(2), HOY)).toBe(true);
    // 3 hechos → 4 fallos → aguanta.
    expect(hayRecaida(hechosRecientes(3), HOY)).toBe(false);
  });

  it('vuelve solo a activo SOLO el graduado verificado', () => {
    const estados: Record<string, HabitEstado> = {
      meditation: 'graduado', // verificado → puede recaer
      no_alcohol: 'graduado', // declarativo → su silencio no es evidencia
      journal: 'reposo', // reposo no recae: ya está fuera por decisión
    };
    const historial = {}; // nadie tiene hechos en 7 días
    expect(recaidasDeGraduados(estados, historial, HOY)).toEqual(['meditation']);
  });

  it('el graduado verificado que sí se sostiene no recae', () => {
    const estados: Record<string, HabitEstado> = { meditation: 'graduado' };
    expect(recaidasDeGraduados(estados, { meditation: hechosRecientes(5) }, HOY)).toEqual([]);
  });
});

describe('nada se borra (mutación 1)', () => {
  it('el flujo completo deja el historial intacto y la racha se conserva', () => {
    const hechas = hechosRecientes(20);
    const historial = Object.freeze({ sunlight: hechas });
    const antes = cumplidosEnVentana(hechas, HOY, RECAIDA.dias);

    // Graduar → recaer → volver a activo: puro cambio de ESTADO. Ninguna
    // función del flujo toca el historial (la mutación que lo borre
    // truena aquí: o lanza sobre el frozen o cambia el conteo).
    propuestasDeGraduacion(['sunlight'], historial, HOY);
    recaidasDeGraduados({ sunlight: 'graduado' }, historial, HOY);

    expect(hechas.size).toBe(20);
    expect(cumplidosEnVentana(hechas, HOY, RECAIDA.dias)).toBe(antes);
  });
});
