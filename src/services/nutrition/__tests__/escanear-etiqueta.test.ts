/**
 * El escáner de etiquetas: las piezas puras.
 *
 * 4EP MEDIO-12: este archivo no tenía una sola prueba, y es donde vivían dos
 * de los defectos más caros (el separador de miles y el reescalado sin cotas).
 * Las tres funciones de aquí son puras y triviales de probar; no tenerlas
 * cubiertas era una decisión, no una imposibilidad.
 */
import { describe, it, expect } from 'vitest';
import { num, extraerJson, compararConElEmpaque } from '@/src/services/nutrition/escaneo-core';

describe('num: cómo se imprimen los números en una etiqueta', () => {
  it('el separador de miles no parte el número', () => {
    // El defecto: "1,150" se volvía 1.15 y el producto perdía sus DOS
    // criterios de sodio a la vez, en silencio.
    expect(num('1,150')).toBe(1150);
    expect(num('1.150')).toBe(1150);
    expect(num('12,500')).toBe(12500);
  });

  it('la coma decimal sigue siendo decimal', () => {
    expect(num('1,15')).toBeCloseTo(1.15);
    expect(num('0,5')).toBeCloseTo(0.5);
    expect(num('2,25')).toBeCloseTo(2.25);
  });

  it('aguanta las unidades pegadas, que así vienen impresas', () => {
    expect(num('275 kcal')).toBe(275);
    expect(num('300mg')).toBe(300);
    expect(num(' 12 g ')).toBe(12);
  });

  it('lo que no es número es null, no cero', () => {
    expect(num('n/d')).toBeNull();
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num(Number.NaN)).toBeNull();
    expect(num({})).toBeNull();
  });

  it('un número de verdad pasa tal cual', () => {
    expect(num(0)).toBe(0);
    expect(num(275)).toBe(275);
  });
});

describe('extraerJson', () => {
  it('saca el objeto aunque venga con prosa alrededor', () => {
    expect(extraerJson('Aquí tienes: {"a":1} listo')).toBe('{"a":1}');
  });

  it('aguanta llaves dentro de cadenas', () => {
    const t = '{"nota":"lleva { y }","a":2}';
    expect(extraerJson(`bla ${t}`)).toBe(t);
  });

  it('una llave suelta en la prosa no gana sobre la respuesta buena', () => {
    // El defecto: tomaba el PRIMER '{' y el parseo fallaba, así que el usuario
    // recibía "no pudimos leer la etiqueta" con una respuesta perfectamente
    // buena en la mano.
    const r = extraerJson('el JSON {así} queda: {"kcal":275}');
    expect(r).toBe('{"kcal":275}');
  });

  it('sin objeto, null', () => {
    expect(extraerJson('no hay nada aquí')).toBeNull();
  });
});

describe('compararConElEmpaque: el testigo contra nuestro propio cálculo', () => {
  it('sin sellos impresos reportados, no se pronuncia', () => {
    // Una lista vacía puede ser "no hay" o "no se alcanzó a ver el frente", y
    // no se pueden distinguir. Callarse es lo honesto.
    expect(compararConElEmpaque(['EXCESO CALORÍAS'], [])).toBeNull();
  });

  it('si coinciden, no hay nada que decir', () => {
    expect(compararConElEmpaque(['EXCESO CALORÍAS'], ['EXCESO CALORIAS'])).toBeNull();
  });

  it('los acentos no inventan una discrepancia', () => {
    const r = compararConElEmpaque(['EXCESO AZÚCARES'], ['exceso azucares']);
    expect(r).toBeNull();
  });

  it('marca lo que trae el empaque y nosotros no calculamos', () => {
    const r = compararConElEmpaque(['EXCESO CALORÍAS'], ['EXCESO CALORÍAS', 'EXCESO SODIO']);
    expect(r?.soloImpresos).toEqual(['EXCESO SODIO']);
    expect(r?.soloCalculados).toEqual([]);
  });

  it('y lo que calculamos de más, que es la señal de que leímos mal', () => {
    const r = compararConElEmpaque(['EXCESO CALORÍAS', 'EXCESO SODIO'], ['EXCESO CALORÍAS']);
    expect(r?.soloCalculados).toEqual(['EXCESO SODIO']);
  });
});
