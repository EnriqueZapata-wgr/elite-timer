/**
 * Regresión MB-7 — el bug más vergonzoso de la app.
 *
 * A un usuario HOMBRE se le mostró contenido de ciclo/embarazo porque las
 * superficies renderizaban sin verificar biological_sex. canAccessCycle es la
 * regla única: SOLO 'female' entra. Ningún otro valor — incluido null, casos de
 * capitalización, o basura residual — puede abrir el pilar.
 */
import { describe, it, expect } from 'vitest';
import { canAccessCycle, canOpenCycleApp, parseCycleMode } from '../cycle-access-core';

describe('canAccessCycle (ciclo PROPIO — la puerta a salud)', () => {
  it("SOLO 'female' entra", () => {
    expect(canAccessCycle('female')).toBe(true);
  });

  it('HOMBRE nunca entra (el bug)', () => {
    expect(canAccessCycle('male')).toBe(false);
  });

  it('null/undefined/vacío → fuera (fail-safe)', () => {
    expect(canAccessCycle(null)).toBe(false);
    expect(canAccessCycle(undefined)).toBe(false);
    expect(canAccessCycle('')).toBe(false);
  });

  it('valores inesperados → fuera (no hay match laxo)', () => {
    expect(canAccessCycle('Female')).toBe(false);
    expect(canAccessCycle('FEMALE')).toBe(false);
    expect(canAccessCycle('f')).toBe(false);
    expect(canAccessCycle('other')).toBe(false);
    expect(canAccessCycle('intersex')).toBe(false);
  });

  // MB-22 P4 — LO MÁS DELICADO DEL RUN: un ciclo de acompañante NUNCA es
  // propio. Ni para una usuaria female. Si esto se rompe, datos de otra
  // persona entran a la Edad ATP y al contexto de ARGOS del usuario.
  it('acompañante JAMÁS es propio, ni siendo female', () => {
    expect(canAccessCycle('female', 'acompanante')).toBe(false);
    expect(canAccessCycle('male', 'acompanante')).toBe(false);
    expect(canAccessCycle(null, 'acompanante')).toBe(false);
  });

  it('modo propio no abre la puerta a un hombre (female sigue siendo requisito)', () => {
    expect(canAccessCycle('male', 'propio')).toBe(false);
  });

  it('female sin fila de modo = propio (comportamiento de siempre + backfill 249)', () => {
    expect(canAccessCycle('female', null)).toBe(true);
    expect(canAccessCycle('female', undefined)).toBe(true);
    expect(canAccessCycle('female', 'propio')).toBe(true);
  });
});

describe('canOpenCycleApp (abrir las pantallas, sin acceso a salud)', () => {
  it('propio y acompañante entran; nadie más', () => {
    expect(canOpenCycleApp('female', null)).toBe(true);
    expect(canOpenCycleApp('female', 'propio')).toBe(true);
    expect(canOpenCycleApp('female', 'acompanante')).toBe(true);
    expect(canOpenCycleApp('male', 'acompanante')).toBe(true);
    expect(canOpenCycleApp('male', null)).toBe(false);
    expect(canOpenCycleApp('male', 'propio')).toBe(false);
    expect(canOpenCycleApp(null, null)).toBe(false);
  });
});

describe('parseCycleMode', () => {
  it('solo acepta los dos modos reales', () => {
    expect(parseCycleMode('propio')).toBe('propio');
    expect(parseCycleMode('acompanante')).toBe('acompanante');
    expect(parseCycleMode('companion')).toBe(null);
    expect(parseCycleMode('')).toBe(null);
    expect(parseCycleMode(null)).toBe(null);
    expect(parseCycleMode(undefined)).toBe(null);
    expect(parseCycleMode(42)).toBe(null);
  });
});
