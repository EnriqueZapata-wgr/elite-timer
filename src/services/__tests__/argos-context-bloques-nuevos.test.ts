/**
 * Pieza 2 (IMPL-03) — los cuatro bloques nuevos del contexto.
 *
 * Lo que estos tests protegen no es el formato: es que el sueño viaje marcado
 * como dato externo NO verificado, y que la Edad ATP nunca salga del contexto
 * sin su etiqueta de estimación educativa (compliance de tiendas).
 */
import { describe, it, expect } from 'vitest';
import { buildContextPrompt, type UserContext } from '@/src/services/argos-context-core';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';

function hace(dias: number): string {
  const d = parseLocalDate(getLocalToday());
  d.setDate(d.getDate() - dias);
  return toLocalDateString(d);
}

describe('sleepContext', () => {
  const ctx: UserContext = {
    name: 'Cliente',
    sleepContext: {
      nightsLast7: 6, avgHours: 6.8, avgScore: 74,
      lastNightDate: hace(0), lastNightHours: 7.2,
      trend: 'up', source: 'sleep_cycle',
    },
  };

  it('resume las 7 noches con promedio y tendencia', () => {
    const p = buildContextPrompt(ctx);
    expect(p).toContain('6 noches registradas');
    expect(p).toContain('promedio 6.8 h');
    expect(p).toContain('tendencia up');
  });

  it('marca la fuente externa como NO verificada — ARGOS no la puede afirmar como medición propia', () => {
    const p = buildContextPrompt(ctx);
    expect(p).toContain('NO verificado');
    expect(p).toContain('sleep_cycle');
  });
});

describe('edadAtpContext', () => {
  const ctx: UserContext = {
    name: 'Cliente',
    edadAtpContext: {
      edadIntegral: 34.2,
      edadCronologica: 41,
      subEdades: [{ area: 'labs', valor: 30.1 }, { area: 'fitness', valor: 28 }],
      calculatedAt: hace(12),
    },
  };

  it('entrega integral, cronológica y sub-edades', () => {
    const p = buildContextPrompt(ctx);
    expect(p).toContain('Edad ATP integral: 34.2');
    expect(p).toContain('edad cronológica 41');
    expect(p).toContain('labs 30.1');
  });

  it('SIEMPRE viaja como estimación educativa, nunca como diagnóstico', () => {
    const p = buildContextPrompt(ctx);
    expect(p).toContain('estimación educativa');
    expect(p).toContain('NO un diagnóstico');
  });

  it('lleva la fecha de cálculo pegada', () => {
    expect(buildContextPrompt(ctx)).toContain('calculada hace 12 días');
  });
});

describe('agendaContext', () => {
  it('dice qué falta y qué sigue', () => {
    const p = buildContextPrompt({
      name: 'Cliente',
      agendaContext: {
        total: 8, completed: 3,
        pendingNames: ['Sol de la mañana', 'Respiración'],
        nextName: 'Sol de la mañana', nextTime: '07:30',
      },
    });
    expect(p).toContain('3 de 8 completados');
    expect(p).toContain('Sol de la mañana, Respiración');
    expect(p).toContain('Siguiente: Sol de la mañana a las 07:30');
  });

  it('día limpio: lo dice sin inventar pendientes', () => {
    const p = buildContextPrompt({
      name: 'Cliente',
      agendaContext: { total: 4, completed: 4, pendingNames: [], nextName: null, nextTime: null },
    });
    expect(p).toContain('4 de 4 completados');
    expect(p).toContain('nada pendiente');
  });
});

describe('adherenceContext', () => {
  it('porcentaje, días con actividad y racha', () => {
    const p = buildContextPrompt({
      name: 'Cliente',
      adherenceContext: { pctLast7: 82, daysWithActivity: 6, currentStreak: 11 },
    });
    expect(p).toContain('82% de hábitos completados');
    expect(p).toContain('6 de 7 días con actividad');
    expect(p).toContain('racha actual 11 días');
  });

  it('racha de 1 día va en singular', () => {
    const p = buildContextPrompt({
      name: 'Cliente',
      adherenceContext: { pctLast7: 30, daysWithActivity: 1, currentStreak: 1 },
    });
    expect(p).toContain('racha actual 1 día');
    expect(p).not.toContain('1 días');
  });
});

describe('presupuesto de tokens de los cuatro bloques', () => {
  it('los cuatro juntos caben en ~900 tokens', () => {
    const p = buildContextPrompt({
      name: 'Cliente',
      sleepContext: {
        nightsLast7: 7, avgHours: 6.8, avgScore: 74,
        lastNightDate: hace(0), lastNightHours: 7.2, trend: 'stable', source: 'health_connect',
      },
      edadAtpContext: {
        edadIntegral: 34.2, edadCronologica: 41,
        subEdades: [
          { area: 'riesgos', valor: 33 }, { area: 'composición', valor: 35.5 },
          { area: 'labs', valor: 30.1 }, { area: 'fitness', valor: 28 },
          { area: 'cognición', valor: 31.4 },
        ],
        calculatedAt: hace(12),
      },
      agendaContext: {
        total: 9, completed: 4,
        pendingNames: ['Sol de la mañana', 'Respiración', 'Caminata', 'Agua', 'Journal', 'Suplementos'],
        nextName: 'Sol de la mañana', nextTime: '07:30',
      },
      adherenceContext: { pctLast7: 82, daysWithActivity: 6, currentStreak: 11 },
    });
    // ~4 caracteres por token en español: el techo de 900 tokens son ~3600 chars.
    expect(p.length).toBeLessThan(3600);
  });
});
