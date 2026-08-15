/**
 * NOCHE-3 — tests del núcleo premium de labs.
 *
 * Lo que se protege:
 *   1. El conteo no se infla. Un parámetro sin banda funcional NO cuenta ni
 *      para bien ni para mal: es la crítica más repetida a la competencia.
 *   2. No se inventa una comparación. Con una sola medición se dice que es la
 *      primera, no se dibuja una flecha plana.
 *   3. El delta habla de TU VENTANA, no de la dirección del número. Bajar no
 *      siempre es mejorar: depende de dónde está tu rango.
 */
import { describe, it, expect } from 'vitest';
import {
  deltaVsAnterior,
  distanciaAVentana,
  estadoDeParametro,
  fraseResumen,
  resumirPanel,
  type EstadoLab,
} from '../labs-premium-core';

const p = (value: number | null, measured_at: string) => ({ value, measured_at });

// Ventana [3, 5] en la posición que usa la matriz (bandLimits[3] y [4]).
const BANDA: (number | null)[] = [0, 1, 2, 3, 5, 6, 7, 8];

describe('el conteo no se infla', () => {
  it('los que no tienen banda quedan fuera de los evaluados', () => {
    const r = resumirPanel(['optimo', 'aceptable', 'atencion', 'sin_banda', 'sin_banda']);
    expect(r.total).toBe(5);
    expect(r.evaluados).toBe(3);
    expect(r.sinBanda).toBe(2);
  });

  it('un panel vacío se declara vacío, no perfecto', () => {
    expect(fraseResumen(resumirPanel([]))).toContain('Todavía no hay estudios');
  });

  it('un panel sin ninguna banda lo dice en vez de calificar', () => {
    const f = fraseResumen(resumirPanel(['sin_banda', 'sin_banda']));
    expect(f).toContain('ninguno con rango funcional');
  });

  it('cuando nada pide atención se dice explícitamente', () => {
    expect(fraseResumen(resumirPanel(['optimo', 'aceptable']))).toContain('Nada pide atención');
    expect(fraseResumen(resumirPanel(['optimo', 'optimo']))).toContain('están en tu ventana');
  });

  it('cuando algo pide atención, manda el número y adónde empezar', () => {
    expect(fraseResumen(resumirPanel(['atencion', 'optimo']))).toContain('1 parámetro pide atención');
    expect(fraseResumen(resumirPanel(['atencion', 'atencion']))).toContain('2 parámetros piden atención');
  });

  it('un parámetro que la matriz no conoce nunca se califica', () => {
    const e: EstadoLab = estadoDeParametro('male', 'no_existe_en_la_matriz', 10);
    expect(e).toBe('sin_banda');
  });
});

describe('la distancia a la ventana', () => {
  it('es cero dentro y crece hacia afuera por los dos lados', () => {
    const b = { lo: 3, hi: 5 };
    expect(distanciaAVentana(4, b)).toBe(0);
    expect(distanciaAVentana(3, b)).toBe(0);
    expect(distanciaAVentana(1, b)).toBe(2);
    expect(distanciaAVentana(8, b)).toBe(3);
  });

  it('sin banda no se calcula nada', () => {
    expect(distanciaAVentana(4, null)).toBeNull();
  });
});

describe('el delta contra la medición anterior', () => {
  it('con una sola medición no se inventa comparación', () => {
    expect(deltaVsAnterior([p(4, '2026-01-01')], BANDA)).toBeNull();
    expect(deltaVsAnterior([], BANDA)).toBeNull();
  });

  it('ignora los huecos de la serie', () => {
    expect(deltaVsAnterior([p(4, '2026-01-01'), p(null, '2026-02-01')], BANDA)).toBeNull();
  });

  it('subir puede ser mejorar cuando venías por debajo', () => {
    const d = deltaVsAnterior([p(1, '2026-01-01'), p(4, '2026-06-01')], BANDA);
    expect(d?.rumbo).toBe('acerca');
    expect(d?.texto).toContain('Entró a tu ventana');
  });

  it('bajar puede ser empeorar cuando salías de la ventana', () => {
    const d = deltaVsAnterior([p(4, '2026-01-01'), p(1, '2026-06-01')], BANDA);
    expect(d?.rumbo).toBe('aleja');
    expect(d?.texto).toContain('Salió de tu ventana');
  });

  it('acercarse sin entrar también cuenta como acercarse', () => {
    const d = deltaVsAnterior([p(0.5, '2026-01-01'), p(2, '2026-06-01')], BANDA);
    expect(d?.rumbo).toBe('acerca');
    expect(d?.texto).toContain('se acercó a tu ventana');
  });

  it('moverse dentro de la ventana es sostener, no mejorar ni empeorar', () => {
    const d = deltaVsAnterior([p(3.2, '2026-01-01'), p(4.8, '2026-06-01')], BANDA);
    expect(d?.rumbo).toBe('sostiene');
    expect(d?.texto).toContain('Sigue dentro de tu ventana');
  });

  it('sin banda solo se reporta el movimiento, sin juzgarlo', () => {
    const d = deltaVsAnterior([p(10, '2026-01-01'), p(14, '2026-06-01')], null);
    expect(d?.rumbo).toBe('sostiene');
    expect(d?.texto).toContain('Sin rango funcional para decir si es mejor');
  });

  it('usa siempre la penúltima medición real, no la primera de la serie', () => {
    const d = deltaVsAnterior(
      [p(0, '2026-01-01'), p(1, '2026-03-01'), p(4, '2026-06-01')],
      BANDA,
    );
    expect(d?.anterior).toBe(1);
    expect(d?.anteriorFecha).toBe('2026-03-01');
    expect(d?.delta).toBe(3);
  });

  it('ordena por fecha aunque la serie venga desordenada', () => {
    const d = deltaVsAnterior([p(4, '2026-06-01'), p(1, '2026-01-01')], BANDA);
    expect(d?.actual).toBe(4);
    expect(d?.anterior).toBe(1);
  });

  it('no divide entre cero al calcular el porcentaje', () => {
    const d = deltaVsAnterior([p(0, '2026-01-01'), p(4, '2026-06-01')], BANDA);
    expect(d?.pct).toBeNull();
  });

  it('cero em dash en el copy', () => {
    const d = deltaVsAnterior([p(1, '2026-01-01'), p(4, '2026-06-01')], BANDA);
    expect(d?.texto.includes('—')).toBe(false);
  });
});
