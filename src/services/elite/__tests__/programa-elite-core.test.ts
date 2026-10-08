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
  datosDelProgramaVigente,
  inicioDelPrograma,
  situacionDelPrograma,
  lineaPorEmpezar,
  lineaAvanceConNombre,
  lineaDelPrograma,
  tituloDeBloque,
} from '../programa-elite-core';
import { SECCIONES_UI } from '../evaluacion-elite-core';
import { VOZ_ELITE, vozDe } from '../voz-programa-core';

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

// ---------------------------------------------------------------------------
// 8-oct-2026 (nivel 2): inicio declarado, nombre y "por empezar"
// ---------------------------------------------------------------------------
//
// Candados: el inicio que el coach declaro manda sobre la primera carga; un
// inicio declarado que todavia no llega NO es "dia 1" (se dice que esta por
// empezar); una fila anterior al nivel 2 se lee como Elite, sin nombre y sin
// inicio declarado; el asunto del correo de Elite no cambio.

describe('datosDelProgramaVigente', () => {
  it('una fila anterior al nivel 2 (rutas que no existen = null) es Elite, sin nombre ni inicio', () => {
    expect(datosDelProgramaVigente({ ps: 12, pn: null, pi: null, tipo: null })).toEqual({
      programaSemanas: 12, nombre: null, inicioDeclarado: null, tipo: 'elite',
    });
    expect(datosDelProgramaVigente({ ps: null })).toEqual({
      programaSemanas: null, nombre: null, inicioDeclarado: null, tipo: 'elite',
    });
    expect(datosDelProgramaVigente(null)).toEqual({
      programaSemanas: null, nombre: null, inicioDeclarado: null, tipo: 'elite',
    });
  });
  it('lee los cuatro campos de un programa', () => {
    expect(datosDelProgramaVigente({ ps: 12, pn: ' Fuerza  y sueño ', pi: '2026-10-12', tipo: 'programa' })).toEqual({
      programaSemanas: 12, nombre: 'Fuerza y sueño', inicioDeclarado: '2026-10-12', tipo: 'programa',
    });
  });
  it('lo que viene roto se descarta, no se adivina', () => {
    const d = datosDelProgramaVigente({ ps: '12', pn: 'x'.repeat(61), pi: '2026-09-31', tipo: 'Programa' });
    expect(d).toEqual({ programaSemanas: null, nombre: null, inicioDeclarado: null, tipo: 'elite' });
    expect(datosDelProgramaVigente({ pn: 7, pi: 20261012 }).nombre).toBeNull();
    expect(datosDelProgramaVigente({ pi: '2026-10-12T00:00:00Z' }).inicioDeclarado).toBeNull();
    expect(datosDelProgramaVigente({ ps: Number.NaN }).programaSemanas).toBeNull();
  });
});

describe('inicioDelPrograma', () => {
  it('el inicio declarado manda sobre la primera carga', () => {
    expect(inicioDelPrograma('2026-10-12', '2026-10-08')).toEqual({ inicio: '2026-10-12', origen: 'declarado' });
    expect(inicioDelPrograma('2026-10-01', '2026-10-08')).toEqual({ inicio: '2026-10-01', origen: 'declarado' });
  });
  it('sin declarado, o con uno que no es fecha real, la primera carga', () => {
    for (const d of [null, undefined, '', '2026-10', '2026-02-30', 'lunes']) {
      expect(inicioDelPrograma(d, '2026-10-08')).toEqual({ inicio: '2026-10-08', origen: 'primera_carga' });
    }
  });
  it('sin ninguna fecha legible, null', () => {
    expect(inicioDelPrograma(null, '')).toBeNull();
    expect(inicioDelPrograma(undefined, undefined)).toBeNull();
    expect(inicioDelPrograma('x', 'y')).toBeNull();
  });
});

describe('situacionDelPrograma', () => {
  it('sin inicio declarado se comporta como siempre: cuenta desde la primera carga', () => {
    const s = situacionDelPrograma({ declarado: null, primeraCarga: '2026-09-01', hoy: '2026-09-17', programaSemanas: 12 })!;
    expect(s.origen).toBe('primera_carga');
    expect(s.inicio).toBe('2026-09-01');
    expect(s.porEmpezar).toBeNull();
    expect(s.avance).toEqual(avanceDelPrograma('2026-09-01', '2026-09-17', 12));
    expect(s.avance?.dia).toBe(17);
  });
  it('el inicio declarado manda: cargado el jueves, arranca el lunes', () => {
    const lunes = situacionDelPrograma({ declarado: '2026-10-12', primeraCarga: '2026-10-08', hoy: '2026-10-12', programaSemanas: 12 })!;
    expect(lunes.origen).toBe('declarado');
    expect(lunes.porEmpezar).toBeNull();
    expect(lunes.avance?.dia).toBe(1);
    expect(lunes.avance?.semana).toBe(1);
    const martes = situacionDelPrograma({ declarado: '2026-10-12', primeraCarga: '2026-10-08', hoy: '2026-10-20', programaSemanas: 12 })!;
    expect(martes.avance?.dia).toBe(9);
    expect(martes.avance?.semana).toBe(2);
  });
  it('inicio declarado en el futuro: por empezar, sin dia 1 inventado', () => {
    const s = situacionDelPrograma({ declarado: '2026-10-12', primeraCarga: '2026-10-08', hoy: '2026-10-08', programaSemanas: 12 })!;
    expect(s.avance).toBeNull();
    expect(s.porEmpezar).toEqual({ inicio: '2026-10-12', faltanDias: 4 });
    expect(s.inicio).toBe('2026-10-12');
    const vispera = situacionDelPrograma({ declarado: '2026-10-12', primeraCarga: '2026-10-08', hoy: '2026-10-11', programaSemanas: 12 })!;
    expect(vispera.porEmpezar).toEqual({ inicio: '2026-10-12', faltanDias: 1 });
  });
  it('un inicio declarado ya pasado cuenta desde ese dia, aunque la carga sea posterior', () => {
    const s = situacionDelPrograma({ declarado: '2026-09-28', primeraCarga: '2026-10-08', hoy: '2026-10-08', programaSemanas: 12 })!;
    expect(s.porEmpezar).toBeNull();
    expect(s.avance?.dia).toBe(11);
    expect(s.avance?.semana).toBe(2);
  });
  it('la primera carga en el futuro (reloj atrasado) sigue contando como dia 1, no como por empezar', () => {
    const s = situacionDelPrograma({ declarado: null, primeraCarga: '2026-09-10', hoy: '2026-09-01', programaSemanas: null })!;
    expect(s.porEmpezar).toBeNull();
    expect(s.avance?.dia).toBe(1);
  });
  it('sin fecha legible no hay situacion; con hoy roto no se inventa avance', () => {
    expect(situacionDelPrograma({ declarado: null, primeraCarga: '', hoy: '2026-09-01', programaSemanas: 12 })).toBeNull();
    const s = situacionDelPrograma({ declarado: '2026-10-12', primeraCarga: '2026-10-08', hoy: '', programaSemanas: 12 })!;
    expect(s.avance).toBeNull();
    expect(s.porEmpezar).toBeNull();
  });
  it('un programa ya terminado se dice completado', () => {
    const s = situacionDelPrograma({ declarado: '2026-01-05', primeraCarga: '2026-01-02', hoy: '2026-10-08', programaSemanas: 12 })!;
    expect(s.avance?.completado).toBe(true);
  });
});

describe('las lineas del encabezado', () => {
  it('por empezar: mañana o con fecha y dias', () => {
    expect(lineaPorEmpezar({ inicio: '2026-10-12', faltanDias: 1 })).toBe('Empieza mañana');
    expect(lineaPorEmpezar({ inicio: '2026-10-12', faltanDias: 4 })).toBe('Empieza el 12 de octubre de 2026 · faltan 4 días');
  });
  it('el nombre va delante solo cuando existe', () => {
    const a = avanceDelPrograma('2026-09-01', '2026-09-17', 12)!;
    expect(lineaAvanceConNombre(a, 'Fuerza y sueño')).toBe('Fuerza y sueño · Semana 3 de 12 · Día 17');
    expect(lineaAvanceConNombre(a, null)).toBe(lineaAvance(a));
    expect(lineaAvanceConNombre(a, undefined)).toBe('Semana 3 de 12 · Día 17');
    expect(lineaAvanceConNombre(a, '   ')).toBe('Semana 3 de 12 · Día 17');
  });
  it('lineaDelPrograma cubre en curso, por empezar y sin datos', () => {
    const a = avanceDelPrograma('2026-09-01', '2026-09-17', 12)!;
    expect(lineaDelPrograma({ avance: a, porEmpezar: null }, 'Fuerza y sueño')).toBe('Fuerza y sueño · Semana 3 de 12 · Día 17');
    expect(lineaDelPrograma({ avance: a, porEmpezar: null }, null)).toBe('Semana 3 de 12 · Día 17');
    const p = { inicio: '2026-10-12', faltanDias: 4 };
    expect(lineaDelPrograma({ avance: null, porEmpezar: p }, 'Fuerza y sueño')).toBe('Fuerza y sueño · Empieza el 12 de octubre de 2026 · faltan 4 días');
    expect(lineaDelPrograma({ avance: null, porEmpezar: p }, null)).toBe('Empieza el 12 de octubre de 2026 · faltan 4 días');
    expect(lineaDelPrograma({ avance: null, porEmpezar: null }, 'Fuerza y sueño')).toBeNull();
  });
  it('ninguna linea lleva em dash ni dice Elite', () => {
    const a = avanceDelPrograma('2026-09-01', '2026-09-17', 12)!;
    const lineas = [
      lineaPorEmpezar({ inicio: '2026-10-12', faltanDias: 1 }),
      lineaPorEmpezar({ inicio: '2026-10-12', faltanDias: 30 }),
      lineaAvanceConNombre(a, 'Fuerza y sueño'),
    ];
    for (const l of lineas) {
      expect(l.includes('\u2014')).toBe(false);
      expect(l).not.toMatch(/elite/i);
    }
  });
});

describe('destinoContacto con voz', () => {
  it('sin voz, el asunto es el de Elite de siempre', () => {
    const d = destinoContacto(null, 'hola@somosatp.com', 'Hola');
    expect(d.url).toBe('mailto:hola@somosatp.com?subject=Mi%20programa%20ATP%20Elite&body=Hola');
    expect(destinoContacto(null, 'hola@somosatp.com', 'Hola', VOZ_ELITE).url).toBe(d.url);
  });
  it('a un cliente de programa el asunto no le dice Elite', () => {
    const d = destinoContacto(null, 'hola@somosatp.com', 'Hola', vozDe({ tipo: 'programa', nombre: 'Fuerza y sueño' }));
    expect(d.url).toBe('mailto:hola@somosatp.com?subject=Mi%20programa%20ATP&body=Hola');
    expect(decodeURIComponent(d.url)).not.toMatch(/elite/i);
  });
  it('WhatsApp no cambia con la voz', () => {
    const con = destinoContacto('5215512345678', 'x@y.com', 'Hola', vozDe({ tipo: 'programa' }));
    expect(con).toEqual(destinoContacto('5215512345678', 'x@y.com', 'Hola'));
  });
});

describe('tituloDeBloque', () => {
  const evaluacion = BLOQUES_PROGRAMA.find((b) => b.key === 'evaluacion')!;
  it('en Elite y sin voz, los titulos de siempre', () => {
    for (const b of BLOQUES_PROGRAMA) {
      expect(tituloDeBloque(b)).toBe(b.titulo);
      expect(tituloDeBloque(b, VOZ_ELITE)).toBe(b.titulo);
    }
  });
  it('un programa sin evaluacion no lee "TU EVALUACIÓN" sobre sus palancas', () => {
    expect(tituloDeBloque(evaluacion, vozDe({ tipo: 'programa', conDiagnostico: false }))).toBe('TU PROGRAMA');
    expect(tituloDeBloque(evaluacion, vozDe({ tipo: 'programa', conDiagnostico: true }))).toBe('TU EVALUACIÓN');
  });
  it('los otros bloques no cambian para un programa', () => {
    const voz = vozDe({ tipo: 'programa', conDiagnostico: false });
    for (const b of BLOQUES_PROGRAMA) {
      if (b.key !== 'evaluacion') expect(tituloDeBloque(b, voz)).toBe(b.titulo);
    }
  });
});
