/**
 * Pruebas del recorte del dominio emociones (OLA1 R-2).
 *
 * Lo que se prueba es el borde: qué entra al rango, qué cae en la ventana
 * anterior (la que sostiene la flecha de tendencia) y qué pasa en 'Todo',
 * donde no hay periodo anterior que comparar.
 */
import { describe, it, expect } from 'vitest';
import {
  filterCheckinsByRange, previousWindow, consistencyWindowDays,
} from '../emociones-report-core';
import { resolveRange } from '../report-domain-core';

/** Mediodía local: la hora no puede empujar el día a otro. */
const at = (day: string) => ({ created_at: `${day}T12:00:00` });

const HOY = new Date('2026-08-13T12:00:00');

describe('filterCheckinsByRange', () => {
  const week = resolveRange('week', HOY); // 2026-08-07 a 2026-08-13

  it('deja pasar los bordes del rango', () => {
    const items = [at('2026-08-07'), at('2026-08-13')];
    expect(filterCheckinsByRange(items, week)).toHaveLength(2);
  });

  it('deja fuera el día anterior al rango', () => {
    expect(filterCheckinsByRange([at('2026-08-06')], week)).toHaveLength(0);
  });

  it("en 'Todo' no recorta nada", () => {
    const all = resolveRange('all', HOY);
    expect(filterCheckinsByRange([at('2019-01-01'), at('2026-08-13')], all)).toHaveLength(2);
  });

  it('una fecha basura no entra ni truena', () => {
    expect(filterCheckinsByRange([{ created_at: 'no es fecha' }], week)).toEqual([]);
  });
});

describe('previousWindow', () => {
  const week = resolveRange('week', HOY);

  it('son los siete días justo anteriores', () => {
    const items = [
      at('2026-07-31'), // fuera, un día antes
      at('2026-08-01'), // primer día de la ventana anterior
      at('2026-08-06'), // último día de la ventana anterior
      at('2026-08-07'), // ya es el rango visible
    ];
    const prev = previousWindow(items, week);
    expect(prev.map((p) => p.created_at.slice(0, 10))).toEqual(['2026-08-01', '2026-08-06']);
  });

  it("en 'Todo' no hay periodo anterior", () => {
    const all = resolveRange('all', HOY);
    expect(previousWindow([at('2019-01-01')], all)).toEqual([]);
  });
});

describe('consistencyWindowDays', () => {
  it('con rango fijo son los días del rango', () => {
    expect(consistencyWindowDays([], resolveRange('week', HOY))).toBe(7);
    expect(consistencyWindowDays([], resolveRange('month', HOY))).toBe(30);
  });

  it("en 'Todo' es el tramo que de verdad cubren los registros", () => {
    const all = resolveRange('all', HOY);
    expect(consistencyWindowDays([at('2026-08-01'), at('2026-08-10')], all)).toBe(10);
  });

  it("en 'Todo' sin registros no inventa ventana", () => {
    expect(consistencyWindowDays([], resolveRange('all', HOY))).toBe(0);
  });
});
