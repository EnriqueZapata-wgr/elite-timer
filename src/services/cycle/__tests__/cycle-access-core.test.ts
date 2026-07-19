/**
 * Regresión MB-7 — el bug más vergonzoso de la app.
 *
 * A un usuario HOMBRE se le mostró contenido de ciclo/embarazo porque las
 * superficies renderizaban sin verificar biological_sex. canAccessCycle es la
 * regla única: SOLO 'female' entra. Ningún otro valor — incluido null, casos de
 * capitalización, o basura residual — puede abrir el pilar.
 */
import { describe, it, expect } from 'vitest';
import { canAccessCycle } from '../cycle-access-core';

describe('canAccessCycle', () => {
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
});
