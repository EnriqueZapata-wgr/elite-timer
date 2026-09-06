/**
 * Candados de Free (ATP 3.0, ruta 1.11 y 2.9). Lo que estos tests protegen:
 * a quien pagó no se le cierra nada; a Free se le cierra exactamente lo que
 * dice la matriz del pivote, ni más ni menos; y ante la duda se abre.
 */
import { describe, expect, it } from 'vitest';
import {
  diasEntre,
  esProductoAnual,
  estudiosQueCuentan,
  marcadoresAbiertosFree,
  puedeSubirEstudio,
  puedeVerFicha,
  tieneMapaFuncional,
} from '../limites-free-core';

describe('puedeSubirEstudio', () => {
  it('free sube el primero', () => {
    expect(puedeSubirEstudio('free', 0)).toBe(true);
  });
  it('free no sube el segundo', () => {
    expect(puedeSubirEstudio('free', 1)).toBe(false);
    expect(puedeSubirEstudio('free', 7)).toBe(false);
  });
  it('premium y elite suben siempre', () => {
    expect(puedeSubirEstudio('premium', 30)).toBe(true);
    expect(puedeSubirEstudio('elite', 30)).toBe(true);
  });
});

describe('estudiosQueCuentan', () => {
  it('una subida fallida no gasta el estudio de Free', () => {
    expect(estudiosQueCuentan([{ status: 'failed' }])).toBe(0);
    expect(estudiosQueCuentan([{ status: 'failed' }, { status: 'extracted' }, { status: 'pending' }])).toBe(2);
    expect(estudiosQueCuentan([])).toBe(0);
  });
});

describe('marcadoresAbiertosFree', () => {
  const panel = [
    { key: 'colesterol_ldl', peso: 0.01, estado: 'optimo' as const },
    { key: 'apolipoproteinas_b', peso: 0.15, estado: 'optimo' as const },
    { key: 'trigliceridos', peso: 0.03, estado: 'atencion' as const },
    { key: 'vldl', peso: 0.03, estado: 'aceptable' as const },
    { key: 'bilirrubina', peso: 0.02, estado: 'sin_banda' as const },
    { key: 'sdldl', peso: 0.06, estado: 'atencion' as const },
  ];
  it('abre los tres de mayor impacto: primero lo que pide atención, luego por peso', () => {
    expect(marcadoresAbiertosFree(panel)).toEqual(['sdldl', 'trigliceridos', 'vldl']);
  });
  it('con tres o menos medidos, todos abiertos', () => {
    expect(marcadoresAbiertosFree(panel.slice(0, 2))).toEqual(['apolipoproteinas_b', 'colesterol_ldl']);
    expect(marcadoresAbiertosFree([])).toEqual([]);
  });
  it('es estable: mismo panel en otro orden, mismas llaves', () => {
    const alReves = [...panel].reverse();
    expect(marcadoresAbiertosFree(alReves)).toEqual(marcadoresAbiertosFree(panel));
  });
  it('empate total se resuelve por llave, sin repetir', () => {
    const iguales = [
      { key: 'b', peso: 0.1, estado: 'optimo' as const },
      { key: 'a', peso: 0.1, estado: 'optimo' as const },
      { key: 'a', peso: 0.1, estado: 'optimo' as const },
      { key: 'd', peso: 0.1, estado: 'optimo' as const },
      { key: 'c', peso: 0.1, estado: 'optimo' as const },
    ];
    expect(marcadoresAbiertosFree(iguales)).toEqual(['a', 'b', 'c']);
  });
});

describe('puedeVerFicha', () => {
  it('premium y elite ven todo', () => {
    expect(puedeVerFicha('premium', 'x', [])).toBe(true);
    expect(puedeVerFicha('elite', 'x', [])).toBe(true);
  });
  it('free ve solo los abiertos', () => {
    expect(puedeVerFicha('free', 'sdldl', ['sdldl', 'vldl'])).toBe(true);
    expect(puedeVerFicha('free', 'colesterol_ldl', ['sdldl', 'vldl'])).toBe(false);
  });
  it('si no se pudo calcular, se abre (fail-open)', () => {
    expect(puedeVerFicha('free', 'colesterol_ldl', null)).toBe(true);
  });
});

describe('esProductoAnual', () => {
  it('reconoce annual, anual y year', () => {
    expect(esProductoAnual('atp_pro_annual')).toBe(true);
    expect(esProductoAnual('atp_premium_anual_3990')).toBe(true);
    expect(esProductoAnual('atp:yearly')).toBe(true);
    expect(esProductoAnual('atp_pro_monthly')).toBe(false);
    expect(esProductoAnual(null)).toBe(false);
    expect(esProductoAnual('')).toBe(false);
  });
});

describe('diasEntre', () => {
  it('días entre dos fechas ISO', () => {
    expect(diasEntre('2026-09-05T00:00:00Z', '2027-09-05T00:00:00Z')).toBe(365);
    expect(diasEntre('2026-09-05T10:00:00Z', '2026-10-05T10:00:00Z')).toBe(30);
  });
  it('null si falta o no parsea', () => {
    expect(diasEntre(null, '2027-09-05T00:00:00Z')).toBe(null);
    expect(diasEntre('2026-09-05T00:00:00Z', undefined)).toBe(null);
    expect(diasEntre('no es fecha', '2027-09-05T00:00:00Z')).toBe(null);
  });
});

describe('tieneMapaFuncional', () => {
  const premium = { tier: 'premium' as const, esElite: false, productId: null, codeSource: null };
  it('elite siempre', () => {
    expect(tieneMapaFuncional({ tier: 'elite', esElite: true, productId: null, codeSource: null })).toBe(true);
  });
  it('plan explícito del grant manda: anual abre, mensual cierra aunque el nombre diga annual', () => {
    expect(tieneMapaFuncional({ ...premium, plan: 'anual' })).toBe(true);
    expect(tieneMapaFuncional({ ...premium, plan: 'mensual', productId: 'atp_pro_annual', diasEntitlement: 365 })).toBe(false);
  });
  it('founders sí (grant con code_source founder), sin importar duración ni nombre', () => {
    expect(tieneMapaFuncional({ ...premium, codeSource: 'founder' })).toBe(true);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'founder', productId: 'prod_x', diasGrant: 30 })).toBe(true);
  });
  it('compra anual fuera de la tienda: product id opaco, pero el entitlement cubre un año', () => {
    expect(tieneMapaFuncional({ ...premium, productId: 'price_1Abc', diasEntitlement: 365 })).toBe(true);
    expect(tieneMapaFuncional({ ...premium, productId: 'prod_Xyz', diasEntitlement: 366 })).toBe(true);
    expect(tieneMapaFuncional({ ...premium, productId: 'price_1Abc', diasEntitlement: 31 })).toBe(false);
  });
  it('código de pago fuera de la tienda: web_payment abre solo si el grant es anual', () => {
    expect(tieneMapaFuncional({ ...premium, codeSource: 'web_payment', diasGrant: 365 })).toBe(true);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'web_payment', diasGrant: 300 })).toBe(true);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'web_payment', diasGrant: 30 })).toBe(false);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'web_payment', diasGrant: null })).toBe(false);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'cortesia', diasGrant: 365 })).toBe(false);
  });
  it('nombre del producto como último recurso', () => {
    expect(tieneMapaFuncional({ ...premium, productId: 'atp_pro_annual' })).toBe(true);
    expect(tieneMapaFuncional({ ...premium, productId: 'atp_pro_monthly' })).toBe(false);
    expect(tieneMapaFuncional({ ...premium })).toBe(false);
  });
  it('free nunca, aunque traiga evidencia anual colgada', () => {
    expect(tieneMapaFuncional({ tier: 'free', esElite: false, productId: 'atp_pro_annual', codeSource: 'founder', plan: 'anual', diasEntitlement: 365 })).toBe(false);
  });
});
