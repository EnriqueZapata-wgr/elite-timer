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
 */
import { describe, it, expect } from 'vitest';
import {
  conLimite,
  decidirEscrituras,
  esFuenteDeMaquina,
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
  it.each(['sleep_cycle', 'health_connect', 'healthkit', 'telefono'] as FuenteNoche[])('%s', (f) => {
    const e = etiquetaFuenteNoche(f);
    expect(e.length).toBeGreaterThan(0);
    expect(e).not.toContain('—');
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

  it('una fecha repetida en las nuevas se decide una sola vez', () => {
    const r = decidirEscrituras([], [nueva('2026-09-19', 400), nueva('2026-09-19', 500)]);
    expect(r.insertar).toHaveLength(1);
    expect(r.insertar[0].durationMinutes).toBe(400);
  });

  it('esFuenteDeMaquina: solo los dos literales de import', () => {
    expect(esFuenteDeMaquina('health_connect')).toBe(true);
    expect(esFuenteDeMaquina('healthkit')).toBe(true);
    expect(esFuenteDeMaquina('sleep_cycle')).toBe(false);
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
