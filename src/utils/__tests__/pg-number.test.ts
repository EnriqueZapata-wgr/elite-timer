/**
 * Candados de la conversión numérica.
 *
 * El primer bloque no prueba código nuestro: fija por escrito lo que de verdad
 * manda PostgREST, porque la creencia contraria casi provoca 70 ediciones
 * innecesarias en servicios que funcionaban bien. Si alguien vuelve a dudar,
 * la consulta para re-verificarlo contra la base está en pg-number.ts.
 */
import { describe, it, expect } from 'vitest';
import { numeroDePg, numeroDePgO, esNumeroUtil } from '@/src/utils/pg-number';
import { construirHistorias, resumirLabs, type MedicionLab } from '@/src/services/reports/labs-report-core';
import { construirBloqueLabs } from '@/src/services/argos-labs-core';

describe('lo que PostgREST manda de verdad', () => {
  it('una columna numeric viaja como número JSON, sin comillas', () => {
    // Cuerpo textual devuelto por Postgres para la fila real del expediente.
    const cable = '{"lab_date":"2026-06-12","vitamin_d":51.6,"hba1c":5.4,"ferritin":166.13}';
    const fila = JSON.parse(cable);
    expect(typeof fila.vitamin_d).toBe('number');
    expect(typeof fila.hba1c).toBe('number');
    expect(typeof fila.ferritin).toBe('number');
    // O sea: el filtro `typeof v === 'number'` sobre columnas numeric SÍ pasa.
    expect(fila.vitamin_d).toBe(51.6);
  });

  it('el numeric con escala conserva los ceros y sigue siendo número', () => {
    expect(typeof JSON.parse('{"a":51.60}').a).toBe('number');
  });
});

describe('numeroDePg acepta lo que sí llega como texto', () => {
  it('number finito pasa tal cual', () => {
    expect(numeroDePg(51.6)).toBe(51.6);
    expect(numeroDePg(0)).toBe(0);
    expect(numeroDePg(-3.5)).toBe(-3.5);
  });

  it('string numérica de jsonb o del parser de IA se convierte', () => {
    expect(numeroDePg('51.6')).toBe(51.6);
    expect(numeroDePg('  1.97  ')).toBe(1.97);
    expect(numeroDePg('-0.5')).toBe(-0.5);
  });
});

describe('numeroDePg rechaza lo que no es un número honesto', () => {
  it('vacíos y ausentes dan null, no cero', () => {
    for (const v of [null, undefined, '', '   ']) expect(numeroDePg(v)).toBeNull();
  });

  it('no finitos dan null', () => {
    for (const v of [NaN, Infinity, -Infinity]) expect(numeroDePg(v)).toBeNull();
  });

  it('texto que no es número da null', () => {
    for (const v of ['abc', '1.2.3', '12px', 'NaN']) expect(numeroDePg(v)).toBeNull();
  });

  it('booleanos NO se coercionan: true valdría 1 y eso disfraza un bug de dato', () => {
    expect(numeroDePg(true)).toBeNull();
    expect(numeroDePg(false)).toBeNull();
  });

  it('objetos y arreglos dan null', () => {
    expect(numeroDePg({})).toBeNull();
    expect(numeroDePg([])).toBeNull();
    expect(numeroDePg([5])).toBeNull();
  });
});

describe('variantes', () => {
  it('numeroDePgO cae al default solo cuando no hay número', () => {
    expect(numeroDePgO('51.6', 0)).toBe(51.6);
    expect(numeroDePgO(0, 99)).toBe(0);
    expect(numeroDePgO(null, 99)).toBe(99);
    expect(numeroDePgO('abc', 99)).toBe(99);
  });

  it('esNumeroUtil responde lo mismo en booleano', () => {
    expect(esNumeroUtil('51.6')).toBe(true);
    expect(esNumeroUtil(51.6)).toBe(true);
    expect(esNumeroUtil(null)).toBe(false);
    expect(esNumeroUtil(true)).toBe(false);
  });
});

/**
 * El punto de todo el ejercicio. Si algún día un valor de laboratorio llegara
 * como texto (jsonb, parser de IA, captura manual, o un cambio de driver), el
 * expediente completo del usuario tiene que seguir de pie. Antes moría entero
 * y en silencio, que es la forma más cara de fallar.
 */
describe('la defensa: el expediente sobrevive aunque lleguen strings', () => {
  const comoTexto = [
    { parameter_key: 'magnesio', value: '1.85', measured_at: '2023-09-22', source: 'lab_pdf' },
    { parameter_key: 'magnesio', value: '1.81', measured_at: '2025-04-09', source: 'lab_pdf' },
    { parameter_key: 'magnesio', value: '1.97', measured_at: '2026-06-12', source: 'lab_pdf' },
  ] as unknown as MedicionLab[];

  it('la serie se arma completa y llega al bloque de ARGOS', () => {
    const historias = construirHistorias(comoTexto, 'male', null);
    expect(historias).toHaveLength(1);
    expect(historias[0].puntos).toHaveLength(3);
    const texto = construirBloqueLabs(historias, resumirLabs(historias))!.lineas.join('\n');
    expect(texto).toContain('1.85');
    expect(texto).toContain('1.97');
  });

  it('pero la basura de verdad sigue descartándose', () => {
    const basura = [
      { parameter_key: 'magnesio', value: 'abc', measured_at: '2026-01-01', source: 'manual' },
    ] as unknown as MedicionLab[];
    expect(construirHistorias(basura, 'male', null)).toHaveLength(0);
  });
});
