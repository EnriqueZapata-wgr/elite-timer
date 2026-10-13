/**
 * Sueño unificado (20-sep-2026) — la regla de unión de las dos tablas, amarrada.
 *
 * Lo que este test defiende:
 *  - Misma fecha en sleep_nights y health_os_daily: manda sleep_nights, y el
 *    número del teléfono NO se suma ni se promedia con el otro.
 *  - Una fecha que solo vive en health_os_daily sí aparece, con fuente
 *    'telefono' (era el silo que nadie cruzaba).
 *  - Ningún número se corrige en silencio: una duración rara sale tal cual.
 *  - conLimite: "no contestó" devuelve el respaldo y nunca se cuelga.
 *  - 344 (13-oct-2026): las marcas y 'mixto' se reconocen y se nombran; cada
 *    noche lleva la fuente real de cada campo (field_sources) y sus etapas;
 *    una noche 'telefono' toma su fuente de health_os_daily; el import del
 *    teléfono NO completa una noche de marca ni una 'mixto'.
 */
import { describe, it, expect } from 'vitest';
import {
  conLimite,
  decidirEscrituras,
  esFuenteDeMaquina,
  esScoreDeCalma,
  textoScoreDeMarca,
  etiquetaFuenteNoche,
  fechaDesde,
  fuenteDeSleepNight,
  respiroDe,
  unirNoches,
  type FilaExistente,
  type FilaSleepNight,
  type FilaSuenoTelefono,
  type FuenteNoche,
  type RespiroUsuario,
} from '../sueno-unificado-core';
import { decidirCorrida } from '@/src/services/pack-avisos-reconcile-core';

const aLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const propia: FilaSleepNight = {
  night_date: '2026-09-19',
  bed_time: '2026-09-19T05:10:00.000Z',
  wake_time: '2026-09-19T12:40:00.000Z',
  duration_minutes: 431,
  score: 82,
  snore_minutes: 6,
  source: 'sleep_cycle',
};

const importada: FilaSleepNight = {
  night_date: '2026-09-18',
  bed_time: '2026-09-18T05:00:00.000Z',
  wake_time: '2026-09-18T12:00:00.000Z',
  duration_minutes: 400,
  score: null,
  snore_minutes: null,
  source: 'health_connect',
};

describe('unirNoches: una noche, un registro', () => {
  it('misma fecha en las dos tablas: manda sleep_nights y el teléfono no altera el número', () => {
    const telefono: FilaSuenoTelefono[] = [{ date: '2026-09-19', sleep_minutes: 999 }];
    const r = unirNoches([propia], telefono);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      nightDate: '2026-09-19',
      durationMinutes: 431,
      score: 82,
      snoreMinutes: 6,
      fuente: 'sleep_cycle',
      bedTimeISO: '2026-09-19T05:10:00.000Z',
    });
  });

  it('fecha que solo vive en health_os_daily aparece con fuente telefono y sin horas', () => {
    const telefono: FilaSuenoTelefono[] = [{ date: '2026-09-17', sleep_minutes: 455 }];
    const r = unirNoches([propia, importada], telefono);
    expect(r.map((n) => n.nightDate)).toEqual(['2026-09-19', '2026-09-18', '2026-09-17']);
    expect(r[2]).toEqual({
      nightDate: '2026-09-17',
      durationMinutes: 455,
      bedTimeISO: null,
      wakeTimeISO: null,
      score: null,
      snoreMinutes: null,
      fuente: 'telefono',
      fuentes: {
        duration_minutes: null,
        score: null,
        deep_min: null,
        light_min: null,
        rem_min: null,
        awake_min: null,
        latency_min: null,
        efficiency: null,
      },
      deepMin: null,
      lightMin: null,
      remMin: null,
      awakeMin: null,
      latencyMin: null,
      efficiency: null,
    });
  });

  it('la más reciente va primero aunque las filas lleguen desordenadas', () => {
    const r = unirNoches([importada, propia], [{ date: '2026-09-20', sleep_minutes: 380 }]);
    expect(r.map((n) => n.nightDate)).toEqual(['2026-09-20', '2026-09-19', '2026-09-18']);
  });

  it('una fila del teléfono sin minutos no es una noche', () => {
    const r = unirNoches([], [
      { date: '2026-09-16', sleep_minutes: null },
      { date: '2026-09-15' },
      { date: '2026-09-14', sleep_minutes: Number.NaN },
    ]);
    expect(r).toEqual([]);
  });

  it('cero minutos del teléfono SÍ es un dato (una respuesta, no una ausencia)', () => {
    const r = unirNoches([], [{ date: '2026-09-16', sleep_minutes: 0 }]);
    expect(r).toHaveLength(1);
    expect(r[0].durationMinutes).toBe(0);
  });

  it('no corrige en silencio: una duración imposible sale tal cual (eso es la migración 300)', () => {
    const r = unirNoches([{ ...importada, duration_minutes: 1440 }], []);
    expect(r[0].durationMinutes).toBe(1440);
  });

  it('duración ausente en sleep_nights queda null, no se rellena con el teléfono', () => {
    // Mezclar las horas de una tabla con los minutos de la otra sería un
    // registro que ninguna fuente midió. La fila de sleep_nights manda entera.
    const r = unirNoches(
      [{ ...importada, duration_minutes: null }],
      [{ date: '2026-09-18', sleep_minutes: 420 }],
    );
    expect(r).toHaveLength(1);
    expect(r[0].durationMinutes).toBeNull();
    expect(r[0].fuente).toBe('health_connect');
  });

  it('con las dos tablas vacías devuelve lista vacía (y el llamador distingue eso de un fallo)', () => {
    expect(unirNoches([], [])).toEqual([]);
  });

  it('una fecha repetida dentro de sleep_nights no se duplica (la base ya lo impide, el núcleo también)', () => {
    const r = unirNoches([propia, { ...propia, duration_minutes: 100 }], []);
    expect(r).toHaveLength(1);
    expect(r[0].durationMinutes).toBe(431);
  });
});

describe('fuenteDeSleepNight', () => {
  it.each([
    ['sleep_cycle', 'sleep_cycle'],
    ['health_connect', 'health_connect'],
    ['healthkit', 'healthkit'],
    ['oura', 'oura'],
    ['whoop', 'whoop'],
    ['garmin', 'garmin'],
    ['polar', 'polar'],
    ['mixto', 'mixto'],
    ['algo_raro', 'telefono'],
    [null, 'telefono'],
  ] as [string | null, FuenteNoche][])('%s → %s', (source, esperado) => {
    expect(fuenteDeSleepNight(source)).toBe(esperado);
  });
});

describe('fechaDesde: la ventana cuenta como ARGOS (hoy menos dias-1)', () => {
  it('7 noches que terminan el 20 empiezan el 14', () => {
    expect(fechaDesde(new Date(2026, 8, 20), 7, aLocal)).toBe('2026-09-14');
  });
  it('cruza el mes sin romperse', () => {
    expect(fechaDesde(new Date(2026, 8, 3), 14, aLocal)).toBe('2026-08-21');
  });
  it('dias menor a 1 se trata como 1 (solo hoy)', () => {
    expect(fechaDesde(new Date(2026, 8, 20), 0, aLocal)).toBe('2026-09-20');
  });
});

describe('etiquetaFuenteNoche: toda fuente tiene nombre para el usuario', () => {
  it.each([
    'sleep_cycle', 'health_connect', 'healthkit', 'telefono', 'oura', 'whoop', 'garmin', 'polar', 'mixto',
  ] as FuenteNoche[])('%s', (f) => {
    const e = etiquetaFuenteNoche(f);
    expect(e.length).toBeGreaterThan(0);
    expect(e).not.toContain('—');
  });

  it('las marcas se nombran como el aparato de la persona; mixto dice que se juntó', () => {
    expect(etiquetaFuenteNoche('oura')).toBe('Medida con tu Oura');
    expect(etiquetaFuenteNoche('whoop')).toBe('Medida con tu WHOOP');
    expect(etiquetaFuenteNoche('garmin')).toBe('Medida con tu Garmin');
    expect(etiquetaFuenteNoche('polar')).toBe('Medida con tu Polar');
    expect(etiquetaFuenteNoche('mixto')).toBe('De varias fuentes o sin identificar');
  });
});

describe('344: fuente real por campo y etapas de la noche', () => {
  it('lee field_sources campo por campo (una fila mixto con duración de Oura y score de Sleep Cycle)', () => {
    const r = unirNoches([{
      night_date: '2026-10-12',
      duration_minutes: 452,
      score: 81,
      deep_min: 70,
      light_min: 250,
      rem_min: 100,
      awake_min: 32,
      latency_min: 12,
      efficiency: 91,
      source: 'mixto',
      field_sources: {
        duration_minutes: 'oura', score: 'sleep_cycle', deep_min: 'oura', light_min: 'oura',
        rem_min: 'oura', awake_min: 'oura', latency_min: 'oura', efficiency: 'oura',
      },
    }], []);
    expect(r[0].fuente).toBe('mixto');
    expect(r[0].fuentes).toEqual({
      duration_minutes: 'oura', score: 'sleep_cycle', deep_min: 'oura', light_min: 'oura',
      rem_min: 'oura', awake_min: 'oura', latency_min: 'oura', efficiency: 'oura',
    });
    expect([r[0].deepMin, r[0].lightMin, r[0].remMin, r[0].awakeMin, r[0].latencyMin, r[0].efficiency])
      .toEqual([70, 250, 100, 32, 12, 91]);
  });

  it('sin field_sources (fila de antes de la 344) la fuente de cada campo es el source de la fila', () => {
    const r = unirNoches([importada], []);
    expect(r[0].fuentes.duration_minutes).toBe('health_connect');
    // Campo sin valor: sin dato no hay fuente que reportar.
    expect(r[0].fuentes.score).toBeNull();
    expect(r[0].fuentes.deep_min).toBeNull();
  });

  it('sin las columnas nuevas (antes de la 344) las etapas salen null, no cero', () => {
    const r = unirNoches([propia], []);
    expect([r[0].deepMin, r[0].lightMin, r[0].remMin, r[0].awakeMin, r[0].latencyMin, r[0].efficiency])
      .toEqual([null, null, null, null, null, null]);
  });

  it('noche solo del teléfono: la fuente de la duración sale de field_sources.sleep_minutes', () => {
    const r = unirNoches([], [{
      date: '2026-10-11', sleep_minutes: 410, source: 'mixto',
      field_sources: { sleep_minutes: 'health_connect', steps: 'garmin' },
    }]);
    expect(r[0].fuente).toBe('telefono');
    expect(r[0].fuentes.duration_minutes).toBe('health_connect');
  });

  it('noche solo del teléfono sin field_sources: usa el source de esa fila', () => {
    const r = unirNoches([], [{ date: '2026-10-11', sleep_minutes: 410, source: 'healthkit' }]);
    expect(r[0].fuentes.duration_minutes).toBe('healthkit');
  });

  it('una racha de Health Connect no cambia de fuente porque una noche vino por la otra tabla', () => {
    const r = unirNoches(
      [{ night_date: '2026-10-12', duration_minutes: 400, source: 'health_connect' }],
      [{ date: '2026-10-11', sleep_minutes: 410, source: 'health_connect' }],
    );
    expect(r.map((n) => n.fuentes.duration_minutes)).toEqual(['health_connect', 'health_connect']);
  });

  it('score de calma solo si su fuente es sleep_cycle; antes de la 344 la noche propia sigue siendo calma', () => {
    // Sin field_sources: la fuente del score cae al source de la fila.
    expect(esScoreDeCalma(unirNoches([propia], [])[0])).toBe(true);
    const deOura = unirNoches([{ night_date: '2026-10-12', duration_minutes: 452, score: 88, source: 'oura' }], [])[0];
    expect(esScoreDeCalma(deOura)).toBe(false);
    const mixta = unirNoches([{
      night_date: '2026-10-12', duration_minutes: 452, score: 88, source: 'mixto',
      field_sources: { duration_minutes: 'sleep_cycle', score: 'oura' },
    }], [])[0];
    expect(esScoreDeCalma(mixta)).toBe(false);
  });

  it('el score de marca se nombra con su marca y sin etiqueta de calma', () => {
    expect(textoScoreDeMarca(88, 'oura')).toBe('Score de sueño de Oura · 88');
    expect(textoScoreDeMarca(70, 'whoop')).toBe('Score de sueño de WHOOP · 70');
    expect(textoScoreDeMarca(70, 'mixto')).toBe('Score de sueño (fuente sin identificar) · 70');
  });

  it('la regla de unión no cambia: misma fecha manda sleep_nights entera, aunque sea de una marca', () => {
    const r = unirNoches(
      [{ night_date: '2026-10-12', duration_minutes: 452, source: 'oura' }],
      [{ date: '2026-10-12', sleep_minutes: 999, source: 'health_connect' }],
    );
    expect(r).toHaveLength(1);
    expect(r[0].durationMinutes).toBe(452);
    expect(r[0].fuentes.duration_minutes).toBe('oura');
  });
});

describe('decidirEscrituras (A5): la noche parcial no queda congelada, la propia jamás se toca', () => {
  const nueva = (nightDate: string, durationMinutes: number) => ({ nightDate, durationMinutes, externalId: `hc-${nightDate}` });

  it('noche sin fila: se inserta', () => {
    const r = decidirEscrituras([], [nueva('2026-09-19', 480)]);
    expect(r.insertar.map((n) => n.nightDate)).toEqual(['2026-09-19']);
    expect(r.actualizar).toEqual([]);
  });

  it('fila de máquina más corta (la lectura de las 5:30) y la nueva trae más: se actualiza SOLO esa', () => {
    const existentes: FilaExistente[] = [
      { night_date: '2026-09-19', source: 'health_connect', duration_minutes: 300 },
      { night_date: '2026-09-18', source: 'healthkit', duration_minutes: 420 },
    ];
    const r = decidirEscrituras(existentes, [nueva('2026-09-19', 480), nueva('2026-09-18', 420)]);
    expect(r.insertar).toEqual([]);
    expect(r.actualizar.map((n) => [n.nightDate, n.durationMinutes])).toEqual([['2026-09-19', 480]]);
  });

  it('fila sleep_cycle (sesión propia): nunca se toca, aunque la nueva traiga más minutos', () => {
    const existentes: FilaExistente[] = [{ night_date: '2026-09-19', source: 'sleep_cycle', duration_minutes: 100 }];
    const r = decidirEscrituras(existentes, [nueva('2026-09-19', 600)]);
    expect(r).toEqual({ insertar: [], actualizar: [] });
  });

  it('misma o menor duración: nada', () => {
    const existentes: FilaExistente[] = [
      { night_date: '2026-09-19', source: 'health_connect', duration_minutes: 480 },
      { night_date: '2026-09-18', source: 'health_connect', duration_minutes: 480 },
    ];
    const r = decidirEscrituras(existentes, [nueva('2026-09-19', 480), nueva('2026-09-18', 300)]);
    expect(r).toEqual({ insertar: [], actualizar: [] });
  });

  it('fila de máquina sin duración se completa; source desconocido no se pisa', () => {
    const existentes: FilaExistente[] = [
      { night_date: '2026-09-19', source: 'healthkit', duration_minutes: null },
      { night_date: '2026-09-18', source: null, duration_minutes: 10 },
      { night_date: '2026-09-17', duration_minutes: 10 },
    ];
    const r = decidirEscrituras(existentes, [nueva('2026-09-19', 400), nueva('2026-09-18', 400), nueva('2026-09-17', 400)]);
    expect(r.actualizar.map((n) => n.nightDate)).toEqual(['2026-09-19']);
    expect(r.insertar).toEqual([]);
  });

  it('344: una noche de Oura, WHOOP, Garmin, Polar o mixto no la completa el import del teléfono', () => {
    const existentes: FilaExistente[] = [
      { night_date: '2026-10-12', source: 'oura', duration_minutes: 300 },
      { night_date: '2026-10-11', source: 'whoop', duration_minutes: 300 },
      { night_date: '2026-10-10', source: 'garmin', duration_minutes: null },
      { night_date: '2026-10-09', source: 'polar', duration_minutes: 300 },
      { night_date: '2026-10-08', source: 'mixto', duration_minutes: 300 },
    ];
    const r = decidirEscrituras(existentes, [
      nueva('2026-10-12', 480), nueva('2026-10-11', 480), nueva('2026-10-10', 480),
      nueva('2026-10-09', 480), nueva('2026-10-08', 480),
    ]);
    expect(r).toEqual({ insertar: [], actualizar: [] });
  });

  it('una fecha repetida en las nuevas se decide una sola vez', () => {
    const r = decidirEscrituras([], [nueva('2026-09-19', 400), nueva('2026-09-19', 500)]);
    expect(r.insertar).toHaveLength(1);
    expect(r.insertar[0].durationMinutes).toBe(400);
  });

  it('esFuenteDeMaquina: solo los dos literales de import', () => {
    expect(esFuenteDeMaquina('health_connect')).toBe(true);
    expect(esFuenteDeMaquina('healthkit')).toBe(true);
    expect(esFuenteDeMaquina('sleep_cycle')).toBe(false);
    // 344: a propósito. Una noche de marca o 'mixto' no la completa el teléfono.
    for (const marca of ['oura', 'whoop', 'garmin', 'polar', 'mixto']) {
      expect(esFuenteDeMaquina(marca)).toBe(false);
    }
    expect(esFuenteDeMaquina(null)).toBe(false);
    expect(esFuenteDeMaquina(undefined)).toBe(false);
  });
});

describe('respiroDe (A3): el respiro es por cuenta, no del módulo', () => {
  const RESPIRO = 2 * 60 * 60 * 1000;
  const ahora = 1_800_000_000_000;

  it('la cuenta que acaba de correr espera; la cuenta nueva corre', () => {
    const respiros = new Map<string, RespiroUsuario>([['user-a', { corriendo: false, ultimaCorridaMs: ahora - 60_000 }]]);
    const a = decidirCorrida({ ...respiroDe(respiros, 'user-a'), ahoraMs: ahora, respiroMs: RESPIRO });
    const b = decidirCorrida({ ...respiroDe(respiros, 'user-b'), ahoraMs: ahora, respiroMs: RESPIRO });
    expect(a).toBe('muy_pronto');
    expect(b).toBe('corre');
  });

  it('una cuenta corriendo no bloquea a la otra', () => {
    const respiros = new Map<string, RespiroUsuario>([['user-a', { corriendo: true, ultimaCorridaMs: 0 }]]);
    expect(decidirCorrida({ ...respiroDe(respiros, 'user-a'), ahoraMs: ahora, respiroMs: RESPIRO })).toBe('ya_corriendo');
    expect(decidirCorrida({ ...respiroDe(respiros, 'user-b'), ahoraMs: ahora, respiroMs: RESPIRO })).toBe('corre');
  });

  it('devuelve una copia: mutarla no toca el mapa', () => {
    const respiros = new Map<string, RespiroUsuario>([['user-a', { corriendo: false, ultimaCorridaMs: 5 }]]);
    const r = respiroDe(respiros, 'user-a');
    r.corriendo = true;
    expect(respiros.get('user-a')!.corriendo).toBe(false);
    expect(respiroDe(respiros, 'nadie')).toEqual({ corriendo: false, ultimaCorridaMs: 0 });
  });
});

describe('conLimite: la plataforma que no contesta no cuelga la pantalla', () => {
  it('devuelve el valor si la promesa llega a tiempo', async () => {
    const v = await conLimite(Promise.resolve(7), null, 200);
    expect(v).toBe(7);
  });

  it('devuelve el respaldo (y avisa "tiempo") si no contesta', async () => {
    const motivos: string[] = [];
    const nunca = new Promise<number>(() => {});
    const v = await conLimite(nunca, null, 20, (m) => motivos.push(m));
    expect(v).toBeNull();
    expect(motivos).toEqual(['tiempo']);
  });

  it('devuelve el respaldo (y avisa "error") si la promesa revienta', async () => {
    const motivos: string[] = [];
    const v = await conLimite(Promise.reject(new Error('x')), null, 200, (m) => motivos.push(m));
    expect(v).toBeNull();
    expect(motivos).toEqual(['error']);
  });
});
