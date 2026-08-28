/**
 * Longitud de ciclo observada (bug Mariana M3.b) — el promedio que la
 * pantalla de ciclo ignoraba. Reglas: ventana fisiológica (20, 45), hasta 6
 * periodos, y NO se aprende con menos de 2 ciclos válidos (manda el ajuste).
 */
import { describe, it, expect } from 'vitest';
import {
  cycleLengthsFromPeriods,
  observedCycleLength,
} from '@/src/services/cycle/cycle-length-core';

const p = (dates: string[]) => dates.map((start_date) => ({ start_date }));

describe('cycleLengthsFromPeriods', () => {
  it('duraciones entre inicios consecutivos (entrada DESC, la más reciente primero)', () => {
    // 31 días entre jul 1 y ago 1; 30 entre jun 1 y jul 1.
    expect(cycleLengthsFromPeriods(p(['2026-08-01', '2026-07-01', '2026-06-01'])))
      .toEqual([31, 30]);
  });

  it('filtra gaps fuera de la ventana fisiológica (20, 45)', () => {
    // 10 días (spotting mal agrupado) y 60 días (hueco sin registrar): fuera.
    expect(cycleLengthsFromPeriods(p(['2026-08-01', '2026-07-22', '2026-05-23'])))
      .toEqual([]);
  });

  it('mira a lo más 6 periodos (5 gaps)', () => {
    const dates = ['2026-08-01', '2026-07-04', '2026-06-06', '2026-05-09', '2026-04-11', '2026-03-14', '2026-02-14', '2026-01-17'];
    expect(cycleLengthsFromPeriods(p(dates))).toHaveLength(5);
  });

  it('vacío y un solo periodo → sin duraciones', () => {
    expect(cycleLengthsFromPeriods([])).toEqual([]);
    expect(cycleLengthsFromPeriods(p(['2026-08-01']))).toEqual([]);
  });
});

describe('observedCycleLength', () => {
  it('con menos de 2 ciclos válidos NO aprende (manda el ajuste manual)', () => {
    expect(observedCycleLength([])).toBeNull();
    expect(observedCycleLength(p(['2026-08-01']))).toBeNull();
    // Un solo gap válido: todavía no.
    expect(observedCycleLength(p(['2026-08-01', '2026-07-01']))).toBeNull();
  });

  it('con 2+ ciclos válidos devuelve el promedio redondeado y cuántos lo alimentan', () => {
    // El caso de la usuaria de 31: 31 y 31 → 31, no "de 28".
    // min y max alimentan la banda de la ventana fértil (predecirOvulacion):
    // con dos ciclos de 31 no hay variabilidad que declarar.
    expect(observedCycleLength(p(['2026-08-02', '2026-07-02', '2026-06-01'])))
      .toEqual({ length: 31, cyclesUsed: 2, min: 31, max: 31 });
    // 31 y 30 → 30.5 redondea a 31. Aquí min y max SÍ difieren, y esa
    // diferencia es la que ensancha la banda de menor probabilidad.
    expect(observedCycleLength(p(['2026-08-01', '2026-07-01', '2026-06-01'])))
      .toEqual({ length: 31, cyclesUsed: 2, min: 30, max: 31 });
  });

  it('los gaps inválidos no cuentan como evidencia', () => {
    // Un gap válido (31) + uno inválido (60) = 1 ciclo válido → null.
    expect(observedCycleLength(p(['2026-08-01', '2026-07-01', '2026-05-02']))).toBeNull();
  });
});
