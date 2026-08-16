/**
 * Candado de los rangos de glucosa capilar.
 *
 * Estos números eran una función suelta dentro de app/glucose-log.tsx: nadie
 * los testeaba y cualquiera que editara la pantalla podía moverlos sin que
 * algo se quejara. Son criterio clínico, no detalle de UI.
 *
 * Se testean los BORDES (69/70, 99/100, 125/126, 139/140, 199/200) porque el
 * off-by-one es exactamente el error que se cuela al reescribir la cadena de
 * ifs, y es el que cambia lo que el usuario lee de su propia salud.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyGlucose, glucoseContextName, parseGlucoseInput, localTimeHHMMSS,
  GLUCOSE_CONTEXT_NAMES, GLUCOSE_MIN_MG_DL, GLUCOSE_MAX_MG_DL,
} from '../glucose-core';

describe('classifyGlucose — en ayuno', () => {
  it('por debajo de 70 es bajo (y 70 ya no lo es)', () => {
    expect(classifyGlucose(69, 'fasting').estado).toBe('bajo');
    expect(classifyGlucose(70, 'fasting').estado).toBe('normal');
  });

  it('70 a 99 es normal (99 todavía, 100 ya no)', () => {
    expect(classifyGlucose(85, 'fasting').estado).toBe('normal');
    expect(classifyGlucose(99, 'fasting').estado).toBe('normal');
    expect(classifyGlucose(100, 'fasting').estado).toBe('elevado');
  });

  it('100 a 125 es elevado (125 todavía, 126 ya es alto)', () => {
    expect(classifyGlucose(125, 'fasting').estado).toBe('elevado');
    expect(classifyGlucose(126, 'fasting').estado).toBe('alto');
  });
});

describe('classifyGlucose — fuera de ayuno', () => {
  const otros = ['pre_meal', 'post_meal_1h', 'post_meal_2h', 'random', 'bedtime'];

  it('por debajo de 140 es normal en todos los contextos no-ayuno', () => {
    for (const c of otros) {
      expect(classifyGlucose(139, c).estado, c).toBe('normal');
      expect(classifyGlucose(140, c).estado, c).toBe('elevado');
    }
  });

  it('140 a 199 es elevado; 200 ya es alto', () => {
    expect(classifyGlucose(199, 'post_meal_1h').estado).toBe('elevado');
    expect(classifyGlucose(200, 'post_meal_1h').estado).toBe('alto');
  });

  it('DOCTRINA: fuera de ayuno nunca se declara "bajo"', () => {
    // Un 65 post-comida necesita contexto que la app no tiene. Marcarlo aquí
    // sería diagnosticar, y la app no diagnostica.
    for (const c of otros) {
      expect(classifyGlucose(65, c).estado, c).toBe('normal');
      expect(classifyGlucose(20, c).estado, c).toBe('normal');
    }
  });

  it('un contexto desconocido se trata como no-ayuno (nunca como ayuno)', () => {
    // Importa: si un contexto nuevo cayera por default en la rama de ayuno,
    // una lectura post-comida de 110 se leería como "elevado" sin serlo.
    expect(classifyGlucose(110, 'contexto_que_no_existe').estado).toBe('normal');
  });
});

describe('classifyGlucose — etiqueta visible', () => {
  it('cada estado trae su label en español', () => {
    expect(classifyGlucose(60, 'fasting').label).toBe('Bajo');
    expect(classifyGlucose(90, 'fasting').label).toBe('Normal');
    expect(classifyGlucose(110, 'fasting').label).toBe('Elevado');
    expect(classifyGlucose(300, 'fasting').label).toBe('Alto');
  });
});

describe('parseGlucoseInput', () => {
  it('acepta enteros dentro del rango de captura', () => {
    expect(parseGlucoseInput('95')).toBe(95);
    expect(parseGlucoseInput(String(GLUCOSE_MIN_MG_DL))).toBe(20);
    expect(parseGlucoseInput(String(GLUCOSE_MAX_MG_DL))).toBe(600);
  });

  it('rechaza fuera de rango (dedazos, no lecturas)', () => {
    expect(parseGlucoseInput('19')).toBeNull();
    expect(parseGlucoseInput('601')).toBeNull();
    expect(parseGlucoseInput('6000')).toBeNull();
  });

  it('rechaza basura y vacío', () => {
    expect(parseGlucoseInput('')).toBeNull();
    expect(parseGlucoseInput('abc')).toBeNull();
    expect(parseGlucoseInput('   ')).toBeNull();
  });

  it('trunca decimales al entero (los glucómetros capilares no dan decimales)', () => {
    expect(parseGlucoseInput('95.7')).toBe(95);
  });
});

describe('glucoseContextName', () => {
  it('traduce los seis contextos', () => {
    expect(glucoseContextName('fasting')).toBe('Ayuno');
    expect(glucoseContextName('post_meal_2h')).toBe('2h post');
    expect(Object.keys(GLUCOSE_CONTEXT_NAMES)).toHaveLength(6);
  });

  it('un registro viejo sin contexto se lee como Random, no vacío', () => {
    expect(glucoseContextName(null)).toBe('Random');
    expect(glucoseContextName(undefined)).toBe('Random');
  });

  it('un contexto desconocido se muestra tal cual (nunca en blanco)', () => {
    expect(glucoseContextName('algo_nuevo')).toBe('algo_nuevo');
  });
});

describe('localTimeHHMMSS', () => {
  it('siempre 2 dígitos por campo', () => {
    expect(localTimeHHMMSS(new Date(2026, 7, 16, 9, 5, 3))).toBe('09:05:03');
    expect(localTimeHHMMSS(new Date(2026, 7, 16, 23, 59, 59))).toBe('23:59:59');
  });

  it('medianoche es 00, no 24', () => {
    // Es el motivo de sacar esto a mano: toLocaleTimeString('en-US', {hour12:false,
    // hour:'2-digit'}) devuelve "24:00:00" a medianoche en varios motores, y
    // Postgres rechaza eso en una columna `time`.
    expect(localTimeHHMMSS(new Date(2026, 7, 16, 0, 0, 0))).toBe('00:00:00');
  });
});
