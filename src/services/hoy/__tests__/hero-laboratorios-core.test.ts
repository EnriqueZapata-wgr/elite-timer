/**
 * Hero de HOY (ATP 3.0, ruta 2.1): los tres estados se distinguen, el delta
 * nunca se invierte y los tres marcadores son los mismos que Free ve con ficha.
 */
import { describe, it, expect } from 'vitest';
import {
  decidirEstadoHero, textoDeltaEdad, tonoDeltaEdad, edadIntegralTexto,
  top3Marcadores, cuentaFueraDeVentana, type DatosHero, type MarcadorHero,
} from '@/src/services/hoy/hero-laboratorios-core';

const m = (key: string, estado: MarcadorHero['estado'], peso = 1): MarcadorHero =>
  ({ key, etiqueta: key.toUpperCase(), estado, peso });

describe('decidirEstadoHero', () => {
  it('cargando sin datos ni fallo', () => {
    expect(decidirEstadoHero(null, true, false)).toBe('cargando');
  });
  it('regla 7: el fallo sin datos es "no se pudo leer", no "sin estudio"', () => {
    expect(decidirEstadoHero(null, false, true)).toBe('no_se_pudo_leer');
    expect(decidirEstadoHero(null, true, true)).toBe('no_se_pudo_leer');
  });
  it('sin valores de laboratorio es "sin estudio" aunque haya Edad ATP vieja', () => {
    const d: DatosHero = { tieneEstudio: false, edad: { integral: 40, cronologica: 42 }, marcadores: [] };
    expect(decidirEstadoHero(d, false, false)).toBe('sin_estudio');
  });
  it('con estudio pinta el hero completo, y datos viejos ganan a un fallo de recarga', () => {
    const d: DatosHero = { tieneEstudio: true, edad: null, marcadores: [m('hba1c', 'optimo')] };
    expect(decidirEstadoHero(d, false, false)).toBe('con_estudio');
    expect(decidirEstadoHero(d, false, true)).toBe('con_estudio');
  });
});

describe('textoDeltaEdad (convención cron - integral, + = más joven)', () => {
  it('más joven', () => {
    expect(textoDeltaEdad({ integral: 35, cronologica: 42 })).toBe('7 años más joven');
    expect(tonoDeltaEdad({ integral: 35, cronologica: 42 })).toBe('exito');
  });
  it('por encima, sin juicio', () => {
    expect(textoDeltaEdad({ integral: 45, cronologica: 42 })).toBe('3 años por encima');
    expect(tonoDeltaEdad({ integral: 45, cronologica: 42 })).toBe('advertencia');
  });
  it('en línea', () => {
    expect(textoDeltaEdad({ integral: 42.02, cronologica: 42 })).toBe('En línea con tu edad real');
    expect(tonoDeltaEdad({ integral: 42.02, cronologica: 42 })).toBe('neutro');
  });
  it('decimal y singular', () => {
    expect(textoDeltaEdad({ integral: 40.5, cronologica: 42 })).toBe('1.5 años más joven');
    expect(textoDeltaEdad({ integral: 43, cronologica: 42 })).toBe('1 año por encima');
  });
  it('no lleva em dash ni palabras rojas', () => {
    for (const e of [{ integral: 35, cronologica: 42 }, { integral: 45, cronologica: 42 }, { integral: 42, cronologica: 42 }]) {
      const t = textoDeltaEdad(e);
      expect(t).not.toContain('—');
      expect(t.toLowerCase()).not.toMatch(/diagn|tratamiento|cura|previene/);
    }
  });
  it('el número grande va a un decimal', () => {
    expect(edadIntegralTexto({ integral: 41.26, cronologica: 42 })).toBe('41.3');
  });
});

describe('top3Marcadores', () => {
  it('prioriza lo que pide atención, luego peso, y devuelve los objetos completos', () => {
    const lista = [
      m('a_optimo', 'optimo', 5), m('b_atencion', 'atencion', 1), m('c_aceptable', 'aceptable', 3),
      m('d_atencion', 'atencion', 4), m('e_sin_banda', 'sin_banda', 9),
    ];
    const top = top3Marcadores(lista);
    expect(top.map((x) => x.key)).toEqual(['d_atencion', 'b_atencion', 'c_aceptable']);
    expect(top[0].etiqueta).toBe('D_ATENCION');
  });
  it('con tres o menos salen todos, y los duplicados no cuentan dos veces', () => {
    expect(top3Marcadores([m('x', 'optimo'), m('x', 'optimo'), m('y', 'atencion')]).map((x) => x.key))
      .toEqual(['y', 'x']);
  });
  it('sin marcadores, lista vacía', () => {
    expect(top3Marcadores([])).toEqual([]);
  });
});

describe('cuentaFueraDeVentana', () => {
  it('cuenta atención y aceptable; óptimo y sin banda no', () => {
    expect(cuentaFueraDeVentana([m('a', 'optimo'), m('b', 'atencion'), m('c', 'aceptable'), m('d', 'sin_banda')])).toBe(2);
  });
});
