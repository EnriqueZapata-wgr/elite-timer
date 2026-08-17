/**
 * Candado de la membresía única (PREMIUM, 16-ago-2026).
 *
 * Este archivo probaba el reparto de tiers: que 'pro' ganara a 'base', que el
 * boost subiera a quien no pagó, que 'clinician' estuviera arriba de todos.
 * Ese modelo se acabó, así que las pruebas no se borran: se REAPUNTAN a la
 * regla nueva, que es más estricta de vigilar, no menos.
 *
 * La regla que estos tests protegen es una sola y es la razón del cambio:
 * NADIE QUE PAGÓ SE QUEDA FUERA. Ni por tener una etiqueta vieja en la base,
 * ni por un entitlement con nombre que no reconocemos.
 */
import { describe, expect, it } from 'vitest';
import {
  esMiembro,
  etiquetaMembresia,
  highestTier,
  tierFromEntitlements,
  tierFromProfile,
} from '../tier-logic';

describe('tierFromEntitlements', () => {
  it('sin entitlements no hay membresía', () => {
    expect(tierFromEntitlements([])).toBe('free');
  });

  it('los entitlements históricos siguen dando acceso', () => {
    // Regla antiencierro: quien compró Base o Clínico ANTES del cambio no
    // puede perder nada. Ahora todos valen exactamente lo mismo: todo.
    expect(tierFromEntitlements(['atp_base'])).toBe('premium');
    expect(tierFromEntitlements(['atp_pro'])).toBe('premium');
    expect(tierFromEntitlements(['atp_clinician'])).toBe('premium');
  });

  it('un entitlement nuevo o desconocido también da acceso', () => {
    // El incidente que originó el cambio: una lista blanca de ids dejó fuera
    // a alguien que sí había pagado. Ya no hay lista blanca. Si RevenueCat
    // reporta algo activo, esa persona entra.
    expect(tierFromEntitlements(['atp_premium'])).toBe('premium');
    expect(tierFromEntitlements(['id_que_nadie_ha_visto'])).toBe('premium');
  });

  it('varios entitlements activos siguen siendo una sola membresía', () => {
    expect(tierFromEntitlements(['atp_base', 'atp_pro'])).toBe('premium');
  });
});

describe('tierFromProfile', () => {
  const now = new Date('2026-08-16T12:00:00Z');

  it('cualquier valor pagado histórico se lee como membresía', () => {
    expect(tierFromProfile('base', null, now)).toBe('premium');
    expect(tierFromProfile('pro', null, now)).toBe('premium');
    expect(tierFromProfile('clinician', null, now)).toBe('premium');
    expect(tierFromProfile('premium', null, now)).toBe('premium');
    expect(tierFromProfile('founder', null, now)).toBe('premium');
  });

  it('respeta la vigencia: caducada es caducada', () => {
    expect(tierFromProfile('pro', '2026-07-01T00:00:00Z', now)).toBe('free');
    expect(tierFromProfile('base', '2026-09-01T00:00:00Z', now)).toBe('premium');
  });

  it('sin valor o con basura, no hay membresía', () => {
    expect(tierFromProfile(null, null, now)).toBe('free');
    expect(tierFromProfile('free', null, now)).toBe('free');
    expect(tierFromProfile('lo_que_sea', null, now)).toBe('free');
  });
});

describe('highestTier', () => {
  it('gana la lectura más generosa (cubre el lag del webhook)', () => {
    expect(highestTier('free', 'premium')).toBe('premium');
    expect(highestTier('premium', 'free')).toBe('premium');
    expect(highestTier('free', 'free')).toBe('free');
  });
});

describe('esMiembro y etiquetaMembresia', () => {
  it('solo hay dos estados y se nombran en español', () => {
    expect(esMiembro('premium')).toBe(true);
    expect(esMiembro('free')).toBe(false);
    expect(etiquetaMembresia('premium')).toBe('ATP Premium');
    expect(etiquetaMembresia('free')).toBe('Sin membresía');
  });
});
