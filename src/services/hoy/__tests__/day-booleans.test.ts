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

/**
 * Espejo EXACTO del runtime (day-compiler): el universo de UNA usuaria es
 * (lista persistida ?? DEFAULT_BOOLEANS) ∪ MANDATORY_BOOLEANS. Nada más.
 *
 * El modelo viejo de este test era DEFAULT ∪ MANDATORY ∪ seleccionables, un
 * universo que ninguna usuaria tiene: los seleccionables solo entran si están
 * en SU lista persistida. Por eso el test pasaba y producción fallaba (bug
 * Mariana M1: checkin invisible para toda fila persistida vieja).
 */
function universeFor(persisted: string[] | null): Set<string> {
  return new Set([...(persisted ?? DEFAULT_BOOLEANS), ...MANDATORY_BOOLEANS]);
}

/** La fila que el DEFAULT de la columna (043) le creó a las usuarias rotas. */
const FILA_043 = ['sunlight', 'meditation', 'supplements', 'cold_shower', 'grounding', 'no_alcohol'];

/** Lo que un electrón necesita para ser alcanzable por decisión de la usuaria. */
const SELECCIONABLES = new Set(ALL_BOOLEAN_OPTIONS.map((o) => o.key));

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

  it('checkin sobrevive una fila persistida vieja (bug Mariana M1)', () => {
    // El caso real de las dos usuarias: fila creada con el DEFAULT de 043.
    // Antes del fix, checkin no estaba en esa fila, ni en MANDATORY, ni era
    // seleccionable: invisible para siempre. MANDATORY es la red.
    expect(universeFor(FILA_043).has('checkin')).toBe(true);
    // Y el caso extremo: hasta con una lista persistida vacía.
    expect(universeFor([]).has('checkin')).toBe(true);
    expect(MANDATORY_BOOLEANS).toContain('checkin');
  });

  it('los 4 booleanos de MENTE están definidos y son alcanzables en HOY', () => {
    for (const key of ['journal', 'checkin', 'meditation', 'breathwork'] as const) {
      expect(ELECTRON_WEIGHTS[key]?.weight, key).toBeGreaterThan(0);
      // Alcanzable de verdad: o le llega a TODA usuaria (mandatory / fila
      // 043), o puede activarlo desde /hoy-habitos (seleccionable).
      const alcanzable = universeFor(FILA_043).has(key) || SELECCIONABLES.has(key);
      expect(alcanzable, `${key} inalcanzable para una fila 043`).toBe(true);
    }
  });

  it('todo DEFAULT no-MANDATORY es seleccionable o vive en la fila 043 (el hueco de M1)', () => {
    // El patrón del bug: un key en DEFAULT_BOOLEANS que no esté en MANDATORY,
    // ni en el DEFAULT de la columna 043, ni en ALL_BOOLEAN_OPTIONS, es
    // invisible e irrecuperable para cualquier fila persistida vieja.
    for (const key of DEFAULT_BOOLEANS) {
      if ((MANDATORY_BOOLEANS as readonly string[]).includes(key)) continue;
      const rescatable = FILA_043.includes(key) || SELECCIONABLES.has(key);
      expect(rescatable, `${key} puede caerse por el hueco de M1`).toBe(true);
    }
  });

  it('nback es opt-in: seleccionable + verificado, NUNCA mandatory (decisión 2026-07-23)', () => {
    expect(ELECTRON_WEIGHTS.nback?.weight).toBe(2.5);
    // Opt-in: no suma al denominador de todos…
    expect(MANDATORY_BOOLEANS).not.toContain('nback');
    // …pero sigue en el universo seleccionable (lugar 3a vía prefs persistidas;
    // MB-11 E: sin UI que las escriba hoy — ver nota en day-booleans.ts)…
    expect(ALL_BOOLEAN_OPTIONS.map((o) => o.key)).toContain('nback');
    // …y conserva conteo real + ruta de tap (lugar 3b).
    expect(VERIFIED_ELECTRON_KEYS).toContain('nback');
    expect(VERIFIED_ELECTRON_ROUTES.nback).toBe('/mente/nback');
  });

  it('todo electrón verificado tiene definición, ruta y entrada al universo', () => {
    for (const key of VERIFIED_ELECTRON_KEYS) {
      expect(ELECTRON_WEIGHTS[key]?.weight, key).toBeGreaterThan(0);
      expect(VERIFIED_ELECTRON_ROUTES[key], `ruta de ${key}`).toBeTruthy();
      const alcanzable = universeFor(FILA_043).has(key) || SELECCIONABLES.has(key);
      expect(alcanzable, `${key} inalcanzable para una fila 043`).toBe(true);
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

  it('los pesos del universo seleccionable no divergen de ELECTRON_WEIGHTS', () => {
    for (const opt of [...ALL_BOOLEAN_OPTIONS, ...ALL_QUANT_OPTIONS]) {
      const canonical = (ELECTRON_WEIGHTS as Record<string, { weight: number }>)[opt.key];
      if (canonical) {
        expect(opt.weight, `peso de ${opt.key} divergió del canónico`).toBe(canonical.weight);
      }
    }
  });
});
