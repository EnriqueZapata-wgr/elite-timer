/**
 * Tests de programa-elite-core (25-sep-2026). Lo que importa: la semana no
 * se inventa con una fecha rota, la duracion respeta lo que Enrique escribio
 * en el documento, y ninguna seccion de la evaluacion se queda sin bloque.
 */
import { describe, it, expect } from 'vitest';
import {
  diasEntreFechas,
  semanasDelPrograma,
  avanceDelPrograma,
  lineaAvance,
  destinoContacto,
  mensajeParaCoach,
  BLOQUES_PROGRAMA,
  SEMANAS_PROGRAMA_POR_DEFECTO,
  etiquetaSeccion,
} from '../programa-elite-core';
import { SECCIONES_UI } from '../evaluacion-elite-core';

describe('diasEntreFechas', () => {
  it('cuenta dias de calendario, cruzando meses y anos', () => {
    expect(diasEntreFechas('2026-09-01', '2026-09-01')).toBe(0);
    expect(diasEntreFechas('2026-09-30', '2026-10-01')).toBe(1);
    expect(diasEntreFechas('2026-12-31', '2027-01-01')).toBe(1);
    expect(diasEntreFechas('2026-09-10', '2026-09-01')).toBe(-9);
  });
  it('devuelve null con una fecha que no es fecha', () => {
    expect(diasEntreFechas('2026-09', '2026-09-01')).toBeNull();
    expect(diasEntreFechas('', '2026-09-01')).toBeNull();
    expect(diasEntreFechas('2026-09-01T10:00:00Z', '2026-09-01')).toBeNull();
  });
});

describe('semanasDelPrograma', () => {
  it('usa lo que trae la evaluacion', () => {
    expect(semanasDelPrograma(12)).toBe(12);
  });
  it('sin dato o con dato roto, 12 meses', () => {
    expect(semanasDelPrograma(null)).toBe(SEMANAS_PROGRAMA_POR_DEFECTO);
    expect(semanasDelPrograma(undefined)).toBe(SEMANAS_PROGRAMA_POR_DEFECTO);
    expect(semanasDelPrograma(0)).toBe(SEMANAS_PROGRAMA_POR_DEFECTO);
    expect(semanasDelPrograma(Number.NaN)).toBe(SEMANAS_PROGRAMA_POR_DEFECTO);
    expect(SEMANAS_PROGRAMA_POR_DEFECTO).toBe(52);
  });
});

describe('avanceDelPrograma', () => {
  it('el dia de la carga es el dia 1 de la semana 1', () => {
    const a = avanceDelPrograma('2026-09-01', '2026-09-01', 12)!;
    expect(a.dia).toBe(1);
    expect(a.semana).toBe(1);
    expect(a.semanasTotales).toBe(12);
    expect(a.completado).toBe(false);
  });
  it('dia 17 es semana 3', () => {
    const a = avanceDelPrograma('2026-09-01', '2026-09-17', 12)!;
    expect(a.dia).toBe(17);
    expect(a.semana).toBe(3);
    expect(lineaAvance(a)).toBe('Semana 3 de 12 · Día 17');
  });
  it('el ultimo dia no esta completado; el siguiente si', () => {
    const ultimo = avanceDelPrograma('2026-09-01', '2026-11-23', 12)!; // dia 84
    expect(ultimo.dia).toBe(84);
    expect(ultimo.completado).toBe(false);
    expect(ultimo.pct).toBe(100);
    const despues = avanceDelPrograma('2026-09-01', '2026-11-24', 12)!;
    expect(despues.completado).toBe(true);
    expect(despues.semana).toBe(13);
    expect(lineaAvance(despues)).toBe('Programa de 12 semanas completado · semana 13');
  });
  it('un inicio en el futuro cuenta como dia 1', () => {
    const a = avanceDelPrograma('2026-09-10', '2026-09-01', null)!;
    expect(a.dia).toBe(1);
    expect(a.semanasTotales).toBe(52);
  });
  it('con fecha rota no inventa semana', () => {
    expect(avanceDelPrograma('', '2026-09-01', 12)).toBeNull();
  });
  it('sin em dashes en la linea', () => {
    const a = avanceDelPrograma('2026-09-01', '2026-09-17', 12)!;
    expect(lineaAvance(a)).not.toMatch(/—/);
  });
});

describe('destinoContacto', () => {
  it('con numero va a WhatsApp, solo digitos', () => {
    const d = destinoContacto('+52 (55) 1234-5678', 'x@y.com', 'Hola');
    expect(d.tipo).toBe('whatsapp');
    expect(d.url).toBe('https://wa.me/525512345678?text=Hola');
  });
  it('sin numero, o con uno que no alcanza, va al correo', () => {
    expect(destinoContacto(null, 'hola@somosatp.com', 'Hola').tipo).toBe('correo');
    expect(destinoContacto('12345', 'hola@somosatp.com', 'Hola').tipo).toBe('correo');
    expect(destinoContacto('', 'hola@somosatp.com', 'Hola').url.startsWith('mailto:hola@somosatp.com?')).toBe(true);
  });
  it('el mensaje se codifica', () => {
    expect(destinoContacto('5215512345678', 'x@y.com', 'Hola Enrique, soy Ana').url).toContain('Hola%20Enrique%2C%20soy%20Ana');
  });
});

describe('mensajeParaCoach', () => {
  it('con y sin nombre', () => {
    expect(mensajeParaCoach('Ana', 'Enrique')).toBe('Hola Enrique, soy Ana. Te escribo desde la app de ATP.');
    expect(mensajeParaCoach('  ', 'Enrique')).toBe('Hola Enrique, te escribo desde la app de ATP.');
  });
});

describe('BLOQUES_PROGRAMA', () => {
  it('cada seccion de la evaluacion cae en exactamente un bloque', () => {
    const todas = BLOQUES_PROGRAMA.flatMap((b) => [...b.secciones]);
    expect(new Set(todas).size).toBe(todas.length);
    expect([...todas].sort()).toEqual(SECCIONES_UI.map((s) => s.key).sort());
  });
  it('el plan va primero', () => {
    expect(BLOQUES_PROGRAMA[0].key).toBe('plan');
  });
  it('las etiquetas salen de la pantalla de la evaluacion', () => {
    expect(etiquetaSeccion('medico')).toBe('Pendientes');
  });
});
