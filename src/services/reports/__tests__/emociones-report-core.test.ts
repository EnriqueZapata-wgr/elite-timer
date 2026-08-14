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
import { toLocalDateString } from '@/src/utils/date-helpers';

/** Mediodía local: la hora no puede empujar el día a otro. */
const at = (day: string) => ({ created_at: `${day}T12:00:00` });

/** El día de un check-in, para comparar listas sin arrastrar la hora. */
const dia = (c: { created_at: string }) => c.created_at.slice(0, 10);

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
  const week = resolveRange('week', HOY); // visible: 2026-08-07 a 2026-08-13

  it('son los siete días justo anteriores', () => {
    // El rango visible son siete días CONTANDO hoy (08-07 a 08-13), así que
    // la ventana anterior son los siete que le pegan por atrás: 07-31 a
    // 08-06. Arrancarla en 08-01 la dejaría en seis días.
    const items = [
      at('2026-07-30'), // fuera, un día antes de la ventana anterior
      at('2026-07-31'), // primer día de la ventana anterior
      at('2026-08-06'), // último día de la ventana anterior
      at('2026-08-07'), // ya es el rango visible
    ];
    expect(previousWindow(items, week).map(dia)).toEqual(['2026-07-31', '2026-08-06']);
  });

  it('mide lo mismo que el rango visible y pega con él, sin hueco ni traslape', () => {
    // Este es el candado del borde. La flecha de tendencia compara ventana
    // anterior contra rango visible: si midieran distinto, la flecha mentiría
    // siempre a favor del periodo más largo. Catorce días seguidos terminando
    // hoy tienen que partirse en siete y siete, sin repetir ni perder ninguno.
    const catorce = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(HOY);
      d.setDate(d.getDate() - i);
      return at(toLocalDateString(d));
    });
    const visible = filterCheckinsByRange(catorce, week).map(dia);
    const anterior = previousWindow(catorce, week).map(dia);

    expect(anterior).toHaveLength(7);
    expect(visible).toHaveLength(7);
    expect(anterior.filter((d) => visible.includes(d))).toEqual([]);
    expect(new Set([...anterior, ...visible]).size).toBe(14);
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
