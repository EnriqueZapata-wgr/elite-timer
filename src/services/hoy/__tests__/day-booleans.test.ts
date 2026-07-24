/**
 * Regresión MB-5 — patrón "3 lugares" de electrones booleanos.
 *
 * Doctrina: un electrón booleano necesita (1) definición en ELECTRON_WEIGHTS,
 * (2) award en pantalla + emit('electrons_changed'), (3) entrada al universo
 * del HOY (DEFAULT ∪ MANDATORY ∪ seleccionables) — y si es verificado, su
 * key en VERIFIED_ELECTRON_KEYS con ruta de tap. Si falta el lugar 3, el
 * electrón "se otorga" pero la card jamás palomea (falla en silencio).
 *
 * El bug reportado de journal era exactamente este patrón — este test lo
 * deja blindado para journal Y para todos los verificados.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BOOLEANS,
  MANDATORY_BOOLEANS,
  VERIFIED_ELECTRON_KEYS,
  VERIFIED_ELECTRON_ROUTES,
  ALL_BOOLEAN_OPTIONS,
  ALL_QUANT_OPTIONS,
} from '../day-booleans';
import { ELECTRON_WEIGHTS } from '@/src/constants/electrons';

/** Universo de keys que pueden llegar a booleanElectrons del HOY. */
const HOY_UNIVERSE = new Set<string>([
  ...DEFAULT_BOOLEANS,
  ...MANDATORY_BOOLEANS,
  ...ALL_BOOLEAN_OPTIONS.map((o) => o.key),
]);

describe('patrón 3 lugares — electrones booleanos', () => {
  it('journal está en los 3 lugares (bug original del brief)', () => {
    // Lugar 1: definición con peso
    expect(ELECTRON_WEIGHTS.journal?.weight).toBeGreaterThan(0);
    // Lugar 3a: SIEMPRE activo (mandatory → no depende de prefs persistidas)
    expect(MANDATORY_BOOLEANS).toContain('journal');
    // Lugar 3b: verificado con conteo real + ruta de tap
    expect(VERIFIED_ELECTRON_KEYS).toContain('journal');
    expect(VERIFIED_ELECTRON_ROUTES.journal).toBe('/journal');
  });

  it('los 4 booleanos de MENTE están definidos y son alcanzables en HOY', () => {
    for (const key of ['journal', 'checkin', 'meditation', 'breathwork'] as const) {
      expect(ELECTRON_WEIGHTS[key]?.weight, key).toBeGreaterThan(0);
      expect(HOY_UNIVERSE.has(key), `${key} fuera del universo del HOY`).toBe(true);
    }
  });

  it('nback está en los 3 lugares (spec N-Back 2026-07-23 §5)', () => {
    expect(ELECTRON_WEIGHTS.nback?.weight).toBe(2.5);
    expect(MANDATORY_BOOLEANS).toContain('nback');
    expect(VERIFIED_ELECTRON_KEYS).toContain('nback');
    expect(VERIFIED_ELECTRON_ROUTES.nback).toBe('/mente/nback');
  });

  it('todo electrón verificado tiene definición, ruta y entrada al universo', () => {
    for (const key of VERIFIED_ELECTRON_KEYS) {
      expect(ELECTRON_WEIGHTS[key]?.weight, key).toBeGreaterThan(0);
      expect(VERIFIED_ELECTRON_ROUTES[key], `ruta de ${key}`).toBeTruthy();
      expect(HOY_UNIVERSE.has(key), `${key} fuera del universo del HOY`).toBe(true);
    }
  });

  it('todo default/mandatory tiene definición en ELECTRON_WEIGHTS', () => {
    for (const key of [...DEFAULT_BOOLEANS, ...MANDATORY_BOOLEANS]) {
      expect(
        (ELECTRON_WEIGHTS as Record<string, { weight: number }>)[key]?.weight,
        key,
      ).toBeGreaterThan(0);
    }
  });

  it('los pesos del EditDayModal no divergen de ELECTRON_WEIGHTS', () => {
    for (const opt of [...ALL_BOOLEAN_OPTIONS, ...ALL_QUANT_OPTIONS]) {
      const canonical = (ELECTRON_WEIGHTS as Record<string, { weight: number }>)[opt.key];
      if (canonical) {
        expect(opt.weight, `peso de ${opt.key} divergió del canónico`).toBe(canonical.weight);
      }
    }
  });
});
