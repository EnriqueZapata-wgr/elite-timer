/**
 * DX — el mapa funcional no cobra, ni la primera vez ni las siguientes.
 *
 * PREMIUM (16-ago-2026): este archivo probaba la regla del "regalo del 1er DX":
 * quien nunca había generado un functional_dx pagaba 0 H+ y la Card A le pintaba
 * el copy del regalo (applyFirstFreeQuote), y el motor mandaba un requestType
 * distinto para que el proxy no cobrara esa primera (resolveDxGenerationAction).
 *
 * Las tres piezas se borraron: sin cobro no hay regalo posible, y un "gratis la
 * primera" sobre algo que siempre es gratis solo confunde a quien lo lee.
 *
 * El test se reapunta a la garantía nueva, que es la que hay que cuidar para que
 * nadie reintroduzca el reparto por descuido: el motor tiene UN SOLO camino y el
 * núcleo puro ya no sabe nada de precios.
 */
import { describe, it, expect } from 'vitest';
import * as dxCore from '../dx-engine-core';

describe('PREMIUM — el núcleo del DX no sabe de precios', () => {
  it('no vuelven a existir las piezas del cobro diferenciado', () => {
    const core = dxCore as Record<string, unknown>;
    expect(core.applyFirstFreeQuote).toBeUndefined();
    expect(core.resolveDxGenerationAction).toBeUndefined();
    expect(core.DX_GENERATION_FIRST_ACTION_KEY).toBeUndefined();
  });

  it('ningún export del núcleo habla de costo, saldo ni protones', () => {
    const sospechosas = /(cost|price|precio|proton|hplus|h_plus|quote|balance|free)/i;
    const ofensores = Object.keys(dxCore).filter((k) => sospechosas.test(k));
    expect(ofensores).toEqual([]);
  });
});
