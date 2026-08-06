/**
 * Tests que amarran las horas como regla (MB-26 Pieza 9).
 *
 * Mutación 5 · Mismo hábito, dos horarios (dos zonas horarias), dos horas
 *   absolutas correctas; cambiar despertar recorre todo; el override
 *   absoluto previo se conserva.
 * Mutación 6 · Sol sin ubicación cae a despertar + 30 y NUNCA queda sin
 *   hora.
 */
import { describe, it, expect } from 'vitest';
import {
  parseHabitTimeEntry, resolverHora, resolverHabitTimes, reglaIgual,
  REGLA_SOL_DEFAULT, esHoraHHMM,
  type ContextoHorario,
} from '@/src/services/hoy/habit-times-core';

const ctx = (despertar: string, dormir: string, uvInicio: string | null = null): ContextoHorario =>
  ({ despertar, dormir, uvInicio });

describe('parseo de entradas', () => {
  it('acepta fijas y reglas; la basura se ignora', () => {
    expect(parseHabitTimeEntry('07:30')).toBe('07:30');
    expect(parseHabitTimeEntry({ ancla: 'dormir', offsetMin: -60 }))
      .toEqual({ ancla: 'dormir', offsetMin: -60 });
    expect(parseHabitTimeEntry({ ancla: 'uv', offsetMin: 0 }))
      .toEqual({ ancla: 'uv', offsetMin: 0 });
    expect(parseHabitTimeEntry('25:99')).toBeNull();
    expect(parseHabitTimeEntry({ ancla: 'marte', offsetMin: 0 })).toBeNull();
    expect(parseHabitTimeEntry({ ancla: 'uv', offsetMin: Infinity })).toBeNull();
    expect(parseHabitTimeEntry(null)).toBeNull();
  });

  it('reglaIgual: fija ≠ relativa, siempre', () => {
    expect(reglaIgual('07:30', '07:30')).toBe(true);
    expect(reglaIgual('07:30', { ancla: 'despertar', offsetMin: 30 })).toBe(false);
    expect(reglaIgual({ ancla: 'uv', offsetMin: 0 }, { ancla: 'uv', offsetMin: 0 })).toBe(true);
    expect(reglaIgual(null, '07:30')).toBe(false);
  });
});

describe('la misma regla, dos vidas distintas (mutación 5)', () => {
  const regla = { ancla: 'dormir' as const, offsetMin: -60 };

  it('quien viaja no se queda con horarios de su casa', () => {
    // El mismo hábito con la misma regla: en casa (despierta 7, duerme 23)
    // y de viaje (despierta 6, duerme 21) da DOS horas absolutas correctas.
    expect(resolverHora(regla, ctx('07:00', '23:00')).time).toBe('22:00');
    expect(resolverHora(regla, ctx('06:00', '21:00')).time).toBe('20:00');
  });

  it('cambiar la hora de despertar recorre TODO lo anclado', () => {
    const raw = {
      meditation: { ancla: 'despertar', offsetMin: 15 },
      screen_time_cutoff: { ancla: 'dormir', offsetMin: -60 },
      journal: '21:30', // fija: NO se recorre (es del usuario)
    };
    const antes = resolverHabitTimes(raw, ctx('07:00', '23:00')).times;
    const despues = resolverHabitTimes(raw, ctx('05:30', '22:00')).times;
    expect(antes.meditation).toBe('07:15');
    expect(despues.meditation).toBe('05:45');
    expect(antes.screen_time_cutoff).toBe('22:00');
    expect(despues.screen_time_cutoff).toBe('21:00');
    // El override absoluto previo se conserva tal cual.
    expect(antes.journal).toBe('21:30');
    expect(despues.journal).toBe('21:30');
    expect(resolverHabitTimes(raw, ctx('05:30', '22:00')).fuentes.journal).toBe('fija');
  });

  it('la hora resuelta se recorta a la ventana despierto', () => {
    expect(resolverHora({ ancla: 'despertar', offsetMin: -120 }, ctx('07:00', '23:00')).time)
      .toBe('07:00');
  });
});

describe('el sol y su degradación (mutación 6)', () => {
  it('con dato UV, el sol cae en la ventana real', () => {
    const r = resolverHora(REGLA_SOL_DEFAULT, ctx('07:00', '23:00', '09:00'));
    expect(r.time).toBe('09:00');
    expect(r.fuente).toBe('uv');
  });

  it('sin dato UV cae a despertar + 30 y lo dice', () => {
    const r = resolverHora(REGLA_SOL_DEFAULT, ctx('07:00', '23:00', null));
    expect(r.time).toBe('07:30');
    expect(r.fuente).toBe('uv_fallback');
  });

  it('el sol JAMÁS queda sin hora, con o sin entrada del usuario', () => {
    // Sin entrada: el default UV entra solo.
    const sin = resolverHabitTimes({}, ctx('06:00', '22:00', null));
    expect(esHoraHHMM(sin.times.sunlight)).toBe(true);
    expect(sin.times.sunlight).toBe('06:30');
    expect(sin.fuentes.sunlight).toBe('uv_fallback');
    // Con dato: la ventana real.
    const con = resolverHabitTimes({}, ctx('06:00', '22:00', '10:30'));
    expect(con.times.sunlight).toBe('10:30');
    expect(con.fuentes.sunlight).toBe('uv');
    // Con hora fijada a mano: la del usuario, intocada.
    const fija = resolverHabitTimes({ sunlight: '07:45' }, ctx('06:00', '22:00', '10:30'));
    expect(fija.times.sunlight).toBe('07:45');
    expect(fija.fuentes.sunlight).toBe('fija');
  });

  it('una ventana UV fuera del horario despierto se recorta (nunca dormido)', () => {
    const r = resolverHora({ ancla: 'uv', offsetMin: 0 }, ctx('11:00', '23:00', '09:00'));
    expect(r.time).toBe('11:00');
    expect(r.fuente).toBe('uv');
  });
});
