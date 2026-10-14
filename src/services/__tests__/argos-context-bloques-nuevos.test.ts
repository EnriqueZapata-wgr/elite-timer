/**
 * Pieza 2 (IMPL-03) — los cuatro bloques nuevos del contexto.
 *
 * Lo que estos tests protegen no es el formato: es que el sueño viaje marcado
 * como dato externo NO verificado, y que la Edad ATP nunca salga del contexto
 * sin su etiqueta de estimación educativa (compliance de tiendas).
 */
import { describe, it, expect } from 'vitest';
import {
  buildContextPrompt,
  construirSleepContext,
  lineaVitales,
  tendenciaSuenoArgos,
  vitalesArgosDesde,
  type NocheParaArgos,
  type UserContext,
  type VitalArgos,
} from '@/src/services/argos-context-core';
import { resumirVitales } from '@/src/services/health/vitales-core';
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
    // 13-oct-2026: tendencia en español.
    expect(p).toContain('promedio 6.8 h en 6 noches');
    expect(p).toContain('tendencia sube');
    expect(p).not.toContain('tendencia up');
  });

  it('marca la fuente externa como NO verificada — ARGOS no la puede afirmar como medición propia', () => {
    const p = buildContextPrompt(ctx);
    expect(p).toContain('NO verificado');
    // 13-oct-2026: la fuente con nombre de persona, no el literal de la base.
    expect(p).toContain('Fuente externa: Sueño de ATP');
    expect(p).not.toMatch(/\bsleep_cycle\b/);
  });
});

// Literales crudos de la base que nunca deben llegar al texto del prompt.
const CRUDOS = /\b(oura|whoop|garmin|polar|health_connect|healthkit|sleep_cycle|mixto|aplica_rango_casa)\b|rango de la casa/;

describe('sleepContext · tendencia solo dentro de la misma fuente (13-oct-2026)', () => {
  const noche = (dia: number, horas: number, fuente: string | null) => ({
    fecha: `2026-10-${String(dia).padStart(2, '0')}`, horas, fuente,
  });

  it('si el aparato cambió, la tendencia usa solo el tramo nuevo y dice qué había antes', () => {
    const t = tendenciaSuenoArgos([
      noche(12, 8, 'oura'), noche(11, 8, 'oura'), noche(10, 8, 'oura'),
      noche(9, 5, 'health_connect'), noche(8, 5, 'health_connect'), noche(7, 5, 'health_connect'),
    ]);
    // Sin el corte, 8 h contra 5 h sería 'up'. Con 3 noches de oura no se calcula.
    expect(t).toEqual({
      trend: 'no_se_calcula', trendNoches: 3, trendFuente: 'oura',
      trendCortadaDesde: '2026-10-10', fuenteAnterior: 'health_connect',
    });
  });

  it('con 4 o más noches de la misma fuente calcula como siempre (umbral 0.5 h)', () => {
    const t = tendenciaSuenoArgos([
      noche(12, 8, 'health_connect'), noche(11, 8, 'health_connect'),
      noche(10, 7, 'health_connect'), noche(9, 7, 'health_connect'),
    ]);
    expect(t).toMatchObject({ trend: 'up', trendNoches: 4, trendCortadaDesde: null, fuenteAnterior: null });
  });

  it('menos de 4 noches en total ya no es "stable": no se calcula', () => {
    expect(tendenciaSuenoArgos([noche(12, 7, 'oura'), noche(11, 7, 'oura')]).trend).toBe('no_se_calcula');
  });
});

describe('construirSleepContext (13-oct-2026): calma de ATP aparte del score de cada marca', () => {
  const n = (dia: number, minutos: number, fuenteMinutos: string | null, score: number | null, fuenteScore: string | null): NocheParaArgos => ({
    fecha: `2026-10-${String(dia).padStart(2, '0')}`, minutos, fuenteMinutos, score, fuenteScore,
    fuenteNoche: fuenteMinutos ?? 'telefono',
  });
  const noches: NocheParaArgos[] = [
    n(12, 450, 'oura', 82, 'oura'),
    n(11, 420, 'oura', 80, 'oura'),
    n(10, 400, 'oura', 84, 'oura'),
    n(9, 380, 'sleep_cycle', 85, 'sleep_cycle'),
    n(8, 400, 'sleep_cycle', 87, 'sleep_cycle'),
    n(7, 390, 'health_connect', null, null),
  ];

  it('la calma promedio solo usa noches con score de la sesión propia, y dice cuántas', () => {
    const s = construirSleepContext(noches)!;
    expect(s.avgScore).toBe(86);
    expect(s.avgScoreNoches).toBe(2);
  });

  it('el score de cada marca va aparte, por fuente, nunca promediado con la calma', () => {
    const s = construirSleepContext([...noches, n(6, 400, 'whoop', 50, 'whoop')])!;
    expect(s.scoresDeMarca).toEqual([
      { fuente: 'oura', promedio: 82, ultimo: 82, noches: 3 },
      { fuente: 'whoop', promedio: 50, ultimo: 50, noches: 1 },
    ]);
  });

  it('un score sin fuente identificada no se promedia: solo viaja el último', () => {
    const s = construirSleepContext([n(12, 400, 'mixto', 70, 'mixto'), n(11, 400, null, 90, null)])!;
    expect(s.scoresDeMarca).toEqual([{ fuente: null, promedio: null, ultimo: 70, noches: 2 }]);
    expect(s.avgScore).toBeNull();
  });

  it('el promedio de horas es de todas las noches y declara su composición', () => {
    const s = construirSleepContext(noches)!;
    expect(s.nightsLast7).toBe(6);
    expect(s.avgHours).toBe(6.8);
    expect(s.composicion).toEqual([
      { fuente: 'oura', noches: 3 }, { fuente: 'sleep_cycle', noches: 2 }, { fuente: 'health_connect', noches: 1 },
    ]);
    expect(s.source).toBe('oura');
  });

  it('antes de la 344 (sin field_sources) la noche propia sigue contando como calma', () => {
    // Sin field_sources, fuentes.score cae al source de la fila: 'sleep_cycle'.
    const s = construirSleepContext([n(12, 431, 'sleep_cycle', 82, 'sleep_cycle')])!;
    expect(s.avgScore).toBe(82);
    expect(s.scoresDeMarca).toEqual([]);
  });

  it('sin noches no hay bloque', () => {
    expect(construirSleepContext([])).toBeNull();
  });

  it('el texto: composición, calma de ATP, score de marca con su escala y tendencia, en español', () => {
    const p = buildContextPrompt({ name: 'Cliente', sleepContext: construirSleepContext(noches)! });
    expect(p).toContain('Sueño 7d: promedio 6.8 h en 6 noches (3 de Oura, 2 de Sueño de ATP, 1 de Health Connect)');
    expect(p).toContain('calma promedio 86/100 (Sueño de ATP, 2 noches)');
    expect(p).toContain('score de sueño de Oura, promedio 82/100 en 3 noches (escala de Oura, no de ATP)');
    expect(p).toContain('tendencia no se calcula (3 noches de Oura, antes Sueño de ATP, se cortó)');
    expect(p).toContain('Fuente externa: Oura.');
    expect(p).not.toMatch(CRUDOS);
    expect(p).not.toContain('—');
  });

  it('una sola fuente: "en 6 noches de Health Connect" y tendencia calculada en español', () => {
    const s = construirSleepContext([8, 8, 8, 7, 7, 7].map((h, i) => n(12 - i, h * 60, 'health_connect', null, null)))!;
    const p = buildContextPrompt({ name: 'Cliente', sleepContext: s });
    expect(p).toContain('promedio 7.5 h en 6 noches de Health Connect');
    expect(p).toContain('tendencia sube sobre 6 noches de Health Connect.');
    expect(p).not.toContain('se cortó');
    expect(p).not.toContain('calma');
    expect(p).not.toMatch(CRUDOS);
  });
});

describe('vitalesContext (13-oct-2026)', () => {
  const metricas: VitalArgos[] = vitalesArgosDesde(resumirVitales([
    { date: '2026-10-12', hrv_ms: 62, hrv_sdnn_ms: 41, resting_hr: 54, breath_rate: 14.5, temp_deviation_c: 0.3, spo2_pct: 96, readiness_score: 81,
      source: 'mixto', field_sources: { hrv_ms: 'oura', hrv_sdnn_ms: 'healthkit', resting_hr: 'oura', breath_rate: 'oura', temp_deviation_c: 'oura', spo2_pct: 'oura', readiness_score: 'oura' } },
    { date: '2026-10-11', hrv_ms: 60, resting_hr: 55, source: 'oura' },
    { date: '2026-10-10', hrv_ms: 52, resting_hr: 57, source: 'oura' },
    { date: '2026-10-09', hrv_ms: 50, resting_hr: 58, source: 'oura' },
    { date: '2026-10-08', hrv_ms: 30, resting_hr: 70, source: 'health_connect' },
  ]));

  it('el objeto conserva el contrato del lector (metodo y aplica_rango_casa)', () => {
    const hrv = metricas.find((m) => m.clave === 'hrv_rmssd')!;
    expect(hrv).toMatchObject({ fuente: 'oura', metodo: 'rmssd', aplica_rango_casa: true });
    expect(metricas.find((m) => m.clave === 'hrv_sdnn')).toMatchObject({ metodo: 'sdnn', aplica_rango_casa: false });
  });

  it('cabecera y cada métrica explicada en español, sin banderas ni literales crudos', () => {
    const p = buildContextPrompt({ name: 'Cliente', vitalesContext: { metricas } });
    expect(p).toContain('Vitales del reloj o anillo (los mide el aparato, ATP no los verifica) [registrado 2026-10-12]:');
    expect(p).toContain('HRV RMSSD 62 ms (Oura, noche completa; meta de ATP: más de 50 ms), tendencia sube sobre 4 días (antes Health Connect, se cortó)');
    expect(p).toContain('variabilidad SDNN de Salud de Apple 41 ms (otra medida: no se compara con la RMSSD ni con ningún rango, solo con su propio SDNN)');
    expect(p).toContain('FC en reposo 54 lpm (Oura; sin meta de ATP), tendencia baja sobre 4 días (antes Health Connect, se cortó)');
    expect(p).toContain('temperatura de piel vs su base +0.3 °C (Oura; sin meta de ATP)');
    expect(p).toContain('score del día de Oura 81/100 (escala de Oura, no de ATP)');
    expect(p).not.toMatch(CRUDOS);
  });

  it('SpO2: oxigenación de noche, dicho que no es un oxímetro médico; sin nombrar enfermedades', () => {
    const p = buildContextPrompt({ name: 'Cliente', vitalesContext: { metricas } });
    expect(p).toContain('oxigenación de noche 96 % (Oura; no es un oxímetro médico; sin meta de ATP)');
    for (const prohibida of ['apnea', 'fiebre', 'arritmia', 'diagnóstico', '—']) {
      expect(p.toLowerCase()).not.toContain(prohibida);
    }
  });

  it('HRV de ventana parcial (Polar): solo una parte de la noche, solo contra su propia línea', () => {
    const [hrv] = vitalesArgosDesde(resumirVitales([{ date: '2026-10-12', hrv_ms: 48, source: 'polar' }]));
    expect(lineaVitales([hrv])).toContain(
      'HRV RMSSD 48 ms (Polar, solo una parte de la noche; no se compara con la meta de ATP, solo con su propia línea)',
    );
  });

  it("HRV de fuente 'mixto': fuente sin identificar, solo contra su propia línea", () => {
    const [hrv] = vitalesArgosDesde(resumirVitales([
      { date: '2026-10-12', hrv_ms: 50, source: 'mixto', field_sources: { hrv_ms: 'mixto' } },
    ]));
    const l = lineaVitales([hrv]);
    expect(l).toContain('HRV RMSSD 50 ms (fuente sin identificar; no se compara con la meta de ATP, solo con su propia línea)');
    expect(l).not.toMatch(CRUDOS);
  });

  it('score del día sin fuente identificada lo dice', () => {
    const [r] = vitalesArgosDesde(resumirVitales([{ date: '2026-10-12', readiness_score: 70, source: 'mixto' }]));
    expect(lineaVitales([r])).toContain('score del día 70/100 (fuente sin identificar)');
  });

  it('es DATO: no agrega reglas nuevas al prompt', () => {
    const sin = buildContextPrompt({ name: 'Cliente', hydrationStats: { last7dAvgMl: 2000, todayProgressPct: 50 } });
    const con = buildContextPrompt({
      name: 'Cliente', hydrationStats: { last7dAvgMl: 2000, todayProgressPct: 50 }, vitalesContext: { metricas },
    });
    const reglas = (t: string) => (t.match(/REGLA/g) ?? []).length;
    expect(reglas(con)).toBe(reglas(sin));
  });

  it('fechas distintas: cada métrica lleva la suya', () => {
    const l = lineaVitales([
      { ...metricas[0], fecha: '2026-10-12' },
      { ...metricas[2], fecha: '2026-10-11' },
    ]);
    expect(l).not.toContain('ATP no los verifica) [registrado');
    expect(l).toContain('62 ms [registrado 2026-10-12]');
    expect(l).toContain('54 lpm [registrado 2026-10-11]');
  });

  it('sin métricas no hay bloque', () => {
    expect(buildContextPrompt({ name: 'Cliente', vitalesContext: { metricas: [] } })).not.toContain('Vitales');
  });

  it('presupuesto: las siete métricas caben en una línea corta (< 1400 caracteres, ~350 tokens)', () => {
    expect(lineaVitales(metricas).length).toBeLessThan(1400);
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
