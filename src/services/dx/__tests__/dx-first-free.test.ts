/**
 * DX F4 — regla del regalo del 1er DX (pura).
 * Quien nunca generó un functional_dx: quote a 0 H+ (isFirstFree para el copy
 * "Tu primer diagnóstico es un regalo") y requestType gratuito en el cobro.
 */
import { describe, it, expect } from 'vitest';
import {
  applyFirstFreeQuote,
  resolveDxGenerationAction,
  DX_GENERATION_FIRST_ACTION_KEY,
} from '../dx-engine-core';

const PAID_KEY = 'dx_generation';

describe('applyFirstFreeQuote', () => {
  it('sin DX previo → costo 0 + isFirstFree (regalo)', () => {
    expect(applyFirstFreeQuote(1000, false)).toEqual({ cost: 0, isFirstFree: true });
  });

  it('con DX previo → costo normal, sin regalo', () => {
    expect(applyFirstFreeQuote(1000, true)).toEqual({ cost: 1000, isFirstFree: false });
  });

  it('el regalo aplica aunque el costo base cambie (override en proton_action_costs)', () => {
    expect(applyFirstFreeQuote(750, false)).toEqual({ cost: 0, isFirstFree: true });
  });
});

describe('resolveDxGenerationAction', () => {
  it('primera generación → action_key gratuito (seed 0 H+, migración 186)', () => {
    expect(resolveDxGenerationAction(false, PAID_KEY)).toBe(DX_GENERATION_FIRST_ACTION_KEY);
    expect(DX_GENERATION_FIRST_ACTION_KEY).toBe('dx_generation_first');
  });

  it('generaciones siguientes → action_key de pago (cobro server-side normal)', () => {
    expect(resolveDxGenerationAction(true, PAID_KEY)).toBe(PAID_KEY);
  });
});
