/**
 * Candados de Free (ATP 3.0, ruta 1.11 y 2.9). Lo que estos tests protegen:
 * a quien pagó no se le cierra nada; a Free se le cierra exactamente lo que
 * dice la matriz del pivote, ni más ni menos; y ante la duda se abre.
 */
import { describe, expect, it } from 'vitest';
import {
  candadoDeVentaCierra,
  diasEntre,
  esProductoAnual,
  estudiosQueCuentan,
  marcadoresAbiertosFree,
  puedeSubirEstudio,
  puedeVerFicha,
  tieneMapaFuncional,
} from '../limites-free-core';

/**
 * 7-sep-2026 (VENTA_AL_PUBLICO): estos tests se RE-APUNTAN, no se aflojan.
 *
 * El contrato de los límites de Free vale y hay que quererlo intacto el día que
 * vuelva la venta al público, así que cada llamada gateada pasa `VENDIENDO` de
 * forma EXPLÍCITA y sigue exigiendo lo mismo, número por número: nada de este
 * archivo depende ya de cómo esté la bandera del repo. Lo que se agrega al
 * final es el comportamiento de HOY, con la venta apagada: no se cierra nada.
 */
const VENDIENDO = true;
const NO_VENDIENDO = false;

describe('puedeSubirEstudio', () => {
  it('free sube el primero', () => {
    expect(puedeSubirEstudio('free', 0, VENDIENDO)).toBe(true);
  });
  it('free no sube el segundo', () => {
    expect(puedeSubirEstudio('free', 1, VENDIENDO)).toBe(false);
    expect(puedeSubirEstudio('free', 7, VENDIENDO)).toBe(false);
  });
  it('premium y elite suben siempre', () => {
    expect(puedeSubirEstudio('premium', 30, VENDIENDO)).toBe(true);
    expect(puedeSubirEstudio('elite', 30, VENDIENDO)).toBe(true);
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
    expect(puedeVerFicha('premium', 'x', [], VENDIENDO)).toBe(true);
    expect(puedeVerFicha('elite', 'x', [], VENDIENDO)).toBe(true);
  });
  it('free ve solo los abiertos', () => {
    expect(puedeVerFicha('free', 'sdldl', ['sdldl', 'vldl'], VENDIENDO)).toBe(true);
    expect(puedeVerFicha('free', 'colesterol_ldl', ['sdldl', 'vldl'], VENDIENDO)).toBe(false);
  });
  it('si no se pudo calcular, se abre (fail-open)', () => {
    expect(puedeVerFicha('free', 'colesterol_ldl', null, VENDIENDO)).toBe(true);
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
    expect(tieneMapaFuncional({ tier: 'elite', esElite: true, productId: null, codeSource: null }, VENDIENDO)).toBe(true);
  });
  it('plan explícito del grant manda: anual abre, mensual cierra aunque el nombre diga annual', () => {
    expect(tieneMapaFuncional({ ...premium, plan: 'anual' }, VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ ...premium, plan: 'mensual', productId: 'atp_pro_annual', diasEntitlement: 365 }, VENDIENDO)).toBe(false);
  });
  it('founders sí (grant con code_source founder), sin importar duración ni nombre', () => {
    expect(tieneMapaFuncional({ ...premium, codeSource: 'founder' }, VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'founder', productId: 'prod_x', diasGrant: 30 }, VENDIENDO)).toBe(true);
  });
  it('compra anual fuera de la tienda: product id opaco, pero el entitlement cubre un año', () => {
    expect(tieneMapaFuncional({ ...premium, productId: 'price_1Abc', diasEntitlement: 365 }, VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ ...premium, productId: 'prod_Xyz', diasEntitlement: 366 }, VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ ...premium, productId: 'price_1Abc', diasEntitlement: 31 }, VENDIENDO)).toBe(false);
  });
  it('código de pago fuera de la tienda: web_payment abre solo si el grant es anual', () => {
    expect(tieneMapaFuncional({ ...premium, codeSource: 'web_payment', diasGrant: 365 }, VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'web_payment', diasGrant: 300 }, VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'web_payment', diasGrant: 30 }, VENDIENDO)).toBe(false);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'web_payment', diasGrant: null }, VENDIENDO)).toBe(false);
    expect(tieneMapaFuncional({ ...premium, codeSource: 'cortesia', diasGrant: 365 }, VENDIENDO)).toBe(false);
  });
  it('nombre del producto como último recurso', () => {
    expect(tieneMapaFuncional({ ...premium, productId: 'atp_pro_annual' }, VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ ...premium, productId: 'atp_pro_monthly' }, VENDIENDO)).toBe(false);
    expect(tieneMapaFuncional({ ...premium }, VENDIENDO)).toBe(false);
  });
  it('free nunca, aunque traiga evidencia anual colgada', () => {
    expect(tieneMapaFuncional({ tier: 'free', esElite: false, productId: 'atp_pro_annual', codeSource: 'founder', plan: 'anual', diasEntitlement: 365 }, VENDIENDO)).toBe(false);
  });
});

/**
 * 7-sep-2026: el comportamiento de HOY. La bandera apagada solo puede ABRIR,
 * nunca cerrar, y por eso cada caso de aquí es un `true` donde arriba había un
 * `false`. Ningún caso de este bloque le quita nada a nadie.
 */
describe('con la venta al público apagada', () => {
  const premium = { tier: 'premium' as const, esElite: false, productId: null, codeSource: null };

  it('el estudio de Free deja de ser uno solo', () => {
    expect(puedeSubirEstudio('free', 1, NO_VENDIENDO)).toBe(true);
    expect(puedeSubirEstudio('free', 99, NO_VENDIENDO)).toBe(true);
  });

  it('los tres marcadores con ficha se vuelven todos', () => {
    expect(puedeVerFicha('free', 'colesterol_ldl', ['sdldl', 'vldl'], NO_VENDIENDO)).toBe(true);
    expect(puedeVerFicha('free', 'lo_que_sea', [], NO_VENDIENDO)).toBe(true);
  });

  it('el mapa funcional abre sin importar el plan, incluso para free', () => {
    expect(tieneMapaFuncional({ ...premium, plan: 'mensual' }, NO_VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ tier: 'free', esElite: false, productId: null, codeSource: null }, NO_VENDIENDO)).toBe(true);
  });

  it('a quien paga no le cambia nada: seguía abierto y sigue abierto', () => {
    expect(puedeSubirEstudio('elite', 30, NO_VENDIENDO)).toBe(true);
    expect(puedeVerFicha('premium', 'x', [], NO_VENDIENDO)).toBe(true);
    expect(tieneMapaFuncional({ tier: 'elite', esElite: true, productId: null, codeSource: null }, NO_VENDIENDO)).toBe(true);
  });
});

describe('candadoDeVentaCierra', () => {
  it('vendiendo: solo cierra a free confirmado', () => {
    expect(candadoDeVentaCierra('free', false, VENDIENDO)).toBe(true);
    expect(candadoDeVentaCierra('premium', false, VENDIENDO)).toBe(false);
    expect(candadoDeVentaCierra('elite', false, VENDIENDO)).toBe(false);
  });
  it('vendiendo: si el nivel no se pudo leer, no cierra (regla 1)', () => {
    expect(candadoDeVentaCierra('free', true, VENDIENDO)).toBe(false);
  });
  it('sin vender: no cierra nunca', () => {
    expect(candadoDeVentaCierra('free', false, NO_VENDIENDO)).toBe(false);
    expect(candadoDeVentaCierra('free', true, NO_VENDIENDO)).toBe(false);
  });
  it('fail-open: un valor que no es exactamente true abre', () => {
    // `null` no dispara el default del parámetro, así que esto prueba de
    // verdad la compuerta `=== true` y no depende de cómo esté la bandera.
    expect(candadoDeVentaCierra('free', false, null as unknown as boolean)).toBe(false);
  });
});
