/**
 * EL CANDADO DE UNIDADES.
 *
 * Un parámetro cuya unidad guardada no corresponde con la de su ventana no debe
 * poder entrar sin que algo truene. Esa es la única razón de ser de este archivo.
 *
 * Truena si:
 *   · alguien agrega un parámetro a LAB_COLUMN_TO_CANONICAL que ya existe en la
 *     matriz y no declara en qué unidad lo guarda `lab_values`,
 *   · alguien agrega un parámetro a la matriz que ya se mapea desde labs y no lo
 *     declara,
 *   · la unidad declarada no coincide con la de la ventana y nadie escribió ni la
 *     conversión (DESAJUSTES_UNIDAD) ni el pendiente (PENDIENTES_MATRIZ).
 *
 * Y además amarra la invariante que hace segura la conversión de doble dirección.
 */
import { describe, it, expect } from 'vitest';
import {
  UNIDAD_ALMACEN,
  DESAJUSTES_UNIDAD,
  PENDIENTES_MATRIZ,
  normalizaUnidad,
  espacioDelValor,
  aUnidadDeMatriz,
  bandLimitsEnEspacioDe,
  ventanaEnEspacioDe,
  unidadParaMostrar,
  parametrosQueCruzanLaFrontera,
  parametrosSinUnidadDeclarada,
} from '../lab-unidades-core';
import { MATRIZ_HOMBRES, MATRIZ_MUJERES, type MatrizSexo } from '../edad-atp-matriz-v7-v6';
import { score9Bands } from '@/src/services/edad-atp/sf-9band-service';

/** Todas las apariciones de una clave en una matriz (un parámetro vive en varios dominios). */
function aparicionesDe(matriz: MatrizSexo, key: string) {
  const out: { dominio: string; unit: string | null; bandLimits: (number | null)[] }[] = [];
  for (const dom of Object.values(matriz)) {
    for (const p of dom.params) {
      if (p.key === key) out.push({ dominio: dom.domain_key, unit: p.unit, bandLimits: p.bandLimits });
    }
  }
  return out;
}

describe('candado de unidades entre lab_values y la matriz V7/V6', () => {
  it('todo parámetro que cruza la frontera tiene unidad de almacén declarada', () => {
    expect(parametrosSinUnidadDeclarada()).toEqual([]);
  });

  it('la frontera no está vacía (si lo estuviera, el candado no estaría midiendo nada)', () => {
    expect(parametrosQueCruzanLaFrontera().length).toBeGreaterThan(40);
  });

  it('no se declaran unidades de parámetros que no cruzan la frontera', () => {
    const frontera = new Set(parametrosQueCruzanLaFrontera());
    const sobrantes = Object.keys(UNIDAD_ALMACEN).filter((k) => !frontera.has(k));
    expect(sobrantes).toEqual([]);
  });

  it('cada unidad declarada casa con la de su ventana, o hay conversión, o hay pendiente escrito', () => {
    const sinResolver: string[] = [];
    for (const key of parametrosQueCruzanLaFrontera()) {
      const ua = normalizaUnidad(UNIDAD_ALMACEN[key]);
      const apariciones = [
        ...aparicionesDe(MATRIZ_HOMBRES, key).map((a) => ({ ...a, sexo: 'H' })),
        ...aparicionesDe(MATRIZ_MUJERES, key).map((a) => ({ ...a, sexo: 'M' })),
      ];
      for (const ap of apariciones) {
        const um = normalizaUnidad(ap.unit);
        if (um === ua) continue;
        const desajuste = DESAJUSTES_UNIDAD[key];
        if (desajuste && normalizaUnidad(desajuste.unidadMatriz) === um) continue;
        if (PENDIENTES_MATRIZ[key]) continue;
        sinResolver.push(`${key} (${ap.sexo}/${ap.dominio}): almacén ${ua || '?'} vs matriz ${um || '?'}`);
      }
    }
    expect(sinResolver).toEqual([]);
  });

  it('todo desajuste declarado apunta a un parámetro real de la frontera', () => {
    const frontera = new Set(parametrosQueCruzanLaFrontera());
    for (const key of Object.keys(DESAJUSTES_UNIDAD)) expect(frontera.has(key)).toBe(true);
  });

  it('todo desajuste trae factor distinto de 1 y motivo escrito', () => {
    for (const d of Object.values(DESAJUSTES_UNIDAD)) {
      expect(d.factorAMatriz).not.toBe(1);
      expect(d.porQue.length).toBeGreaterThan(40);
    }
  });

  it('todo pendiente de matriz trae explicación, no solo el nombre', () => {
    for (const [key, texto] of Object.entries(PENDIENTES_MATRIZ)) {
      expect(texto.length, key).toBeGreaterThan(40);
    }
  });
});

describe('testosterona total: el caso que disparó todo esto', () => {
  const KEY = 'testosterona_total';
  const ventanaH = aparicionesDe(MATRIZ_HOMBRES, KEY).find((a) => a.dominio === 'sistema_hormonal')!;

  it('la ventana de hombres sigue siendo la del Excel, sin tocar', () => {
    expect(ventanaH.bandLimits.slice(3, 5)).toEqual([7, 12]);
    expect(ventanaH.unit).toBe('ng/ml');
  });

  it('993 ng/dL se reconoce como unidad de almacén y se lleva a 9.93 ng/mL', () => {
    expect(espacioDelValor(KEY, 993)).toBe('almacen');
    expect(aUnidadDeMatriz(KEY, 993)).toBeCloseTo(9.93, 6);
  });

  it('993 ng/dL puntúa 100, no "pide atención"', () => {
    expect(score9Bands(993, ventanaH.bandLimits)).toBe(0); // el bug: fuera de rango
    expect(score9Bands(aUnidadDeMatriz(KEY, 993), ventanaH.bandLimits)).toBe(100);
  });

  it('un valor viejo ya en ng/mL no se toca (histórico mezclado)', () => {
    expect(espacioDelValor(KEY, 9.93)).toBe('matriz');
    expect(aUnidadDeMatriz(KEY, 9.93)).toBe(9.93);
    expect(score9Bands(aUnidadDeMatriz(KEY, 9.93), ventanaH.bandLimits)).toBe(100);
  });

  it('la conversión es idempotente', () => {
    const una = aUnidadDeMatriz(KEY, 993);
    expect(aUnidadDeMatriz(KEY, una)).toBe(una);
  });

  it('una testosterona de verdad baja sigue pidiendo atención', () => {
    // 250 ng/dL = 2.5 ng/mL, por debajo del primer corte (3) → score 0.
    expect(score9Bands(aUnidadDeMatriz(KEY, 250), ventanaH.bandLimits)).toBe(0);
  });

  it('en mujeres la ventana de sistema hormonal también funciona con ng/dL', () => {
    const ventanaM = aparicionesDe(MATRIZ_MUJERES, KEY).find((a) => a.dominio === 'sistema_hormonal')!;
    expect(ventanaM.bandLimits.slice(3, 5)).toEqual([0.2, 0.55]);
    // 40 ng/dL = 0.4 ng/mL → dentro de la ventana.
    expect(score9Bands(aUnidadDeMatriz(KEY, 40), ventanaM.bandLimits)).toBe(100);
  });

  it('la ventana traída al espacio del valor da 700 a 1200 ng/dL', () => {
    const v = ventanaEnEspacioDe(KEY, { lo: 7, hi: 12 }, 993);
    expect(v).toEqual({ lo: 700, hi: 1200 });
  });

  it('la etiqueta que se pinta sigue al número, no a la matriz', () => {
    expect(unidadParaMostrar(KEY, 'ng/ml', 993)).toBe('ng/dL');
    expect(unidadParaMostrar(KEY, 'ng/ml', 9.93)).toBe('ng/mL');
  });
});

describe('invariante: puntuar en cualquiera de los dos espacios da lo mismo', () => {
  it('convertir el valor y convertir la ventana son equivalentes', () => {
    const bandLimits = aparicionesDe(MATRIZ_HOMBRES, 'testosterona_total')
      .find((a) => a.dominio === 'sistema_hormonal')!.bandLimits;
    for (const v of [15, 45, 120, 250, 300, 450, 700, 993, 1200, 1500, 2400]) {
      const porValor = score9Bands(aUnidadDeMatriz('testosterona_total', v), bandLimits);
      const porVentana = score9Bands(v, bandLimitsEnEspacioDe('testosterona_total', bandLimits, v));
      expect(porVentana, `valor ${v}`).toBe(porValor);
    }
  });

  it('un parámetro sin desajuste no se mueve en ninguna dirección', () => {
    const bandLimits = [null, null, null, 50, 80, 90, 100, 110] as (number | null)[];
    expect(aUnidadDeMatriz('vitamina_d', 33.4)).toBe(33.4);
    expect(bandLimitsEnEspacioDe('vitamina_d', bandLimits, 33.4)).toEqual(bandLimits);
    expect(ventanaEnEspacioDe('vitamina_d', { lo: 50, hi: 80 }, 33.4)).toEqual({ lo: 50, hi: 80 });
    expect(unidadParaMostrar('vitamina_d', 'ng/ml', 33.4)).toBe('ng/ml');
  });

  it('una clave desconocida pasa de largo sin inventar nada', () => {
    expect(aUnidadDeMatriz('parametro_que_no_existe', 42)).toBe(42);
    expect(espacioDelValor('parametro_que_no_existe', 42)).toBe('matriz');
  });
});

describe('el fixture de regresión no cruza este borde', () => {
  it('el testosterona_total del Excel (3.32 ng/mL) sale intacto', () => {
    // Si algún día el valor del fixture pasara por la conversión, no se movería:
    // 3.32 está por debajo del umbral, así que se lee como unidad de matriz.
    expect(aUnidadDeMatriz('testosterona_total', 3.32)).toBe(3.32);
  });
});
