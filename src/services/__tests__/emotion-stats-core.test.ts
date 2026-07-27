/**
 * Tests del reporteo profundo de emociones (MB-9 · Track C).
 * Foco: honestidad estadística (vacíos que informan) + efectividad de navegación.
 */
import { describe, it, expect } from 'vitest';
import {
  moodValue, emotionBaselineMood,
  buildWeekdayPattern, buildDayPartPattern,
  buildQuadrantDistribution, buildTriggers, buildConsistency,
  computeNavigationEfficacy,
  MIN_CHECKINS_FOR_PATTERN, MIN_NAV_SAMPLES,
  type StatsCheckin, type NavEvent,
} from '../emotion-stats-core';

/** Helper: check-in en una fecha/hora concreta. */
function ck(iso: string, quadrant: string, extra: Partial<StatsCheckin> = {}): StatsCheckin {
  return { quadrant, created_at: iso, ...extra };
}

describe('moodValue / baseline', () => {
  it('usa pleasantness si existe; si no, fallback por lado', () => {
    expect(moodValue({ pleasantness: 8, quadrant: 'high_unpleasant' })).toBe(8);
    expect(moodValue({ pleasantness: null, quadrant: 'high_pleasant' })).toBe(7);
    expect(moodValue({ pleasantness: 0, quadrant: 'low_unpleasant' })).toBe(3);
  });

  it('baseline de una emoción sale de su cuadrante; id inexistente → null', () => {
    expect(emotionBaselineMood('calm')).toBeGreaterThan(5); // low_pleasant
    expect(emotionBaselineMood('enraged')).toBeLessThan(5); // high_unpleasant
    expect(emotionBaselineMood('nope')).toBeNull();
  });
});

describe('C.2 · vacíos que informan — patrones temporales', () => {
  it('con menos del mínimo dice cuántos faltan, no muestra un cero', () => {
    const few = [ck('2026-07-20T10:00:00', 'high_pleasant')];
    const r = buildWeekdayPattern(few);
    expect(r.status).toBe('insufficient');
    expect(r.needMore).toBe(MIN_CHECKINS_FOR_PATTERN - 1);
    expect(r.lowest).toBeNull();
  });

  it('con señal en 2+ franjas encuentra la más baja (¿a qué hora se cae?)', () => {
    const checkins = [
      ck('2026-07-20T08:00:00', 'high_pleasant', { pleasantness: 8 }),
      ck('2026-07-21T09:00:00', 'high_pleasant', { pleasantness: 8 }),
      ck('2026-07-20T22:00:00', 'high_unpleasant', { pleasantness: 3 }),
      ck('2026-07-21T23:00:00', 'low_unpleasant', { pleasantness: 3 }),
      ck('2026-07-22T09:00:00', 'high_pleasant', { pleasantness: 7 }),
    ];
    const r = buildDayPartPattern(checkins);
    expect(r.status).toBe('ok');
    expect(r.lowest?.key).toBe('noche');
    expect(r.highest?.key).toBe('manana');
  });
});

describe('distribución por cuadrante + tendencia', () => {
  const period = [
    ck('2026-07-20T10:00:00', 'high_pleasant'),
    ck('2026-07-20T11:00:00', 'high_pleasant'),
    ck('2026-07-21T10:00:00', 'high_unpleasant'),
    ck('2026-07-22T10:00:00', 'low_pleasant'),
    ck('2026-07-23T10:00:00', 'low_unpleasant'),
  ];

  it('reporta % por cuadrante y suma coherente', () => {
    const r = buildQuadrantDistribution(period);
    expect(r.status).toBe('ok');
    const hp = r.shares.find((s) => s.quadrant === 'high_pleasant')!;
    expect(hp.count).toBe(2);
    expect(hp.pct).toBeCloseTo(40);
    // Sin periodo previo comparable → sin tendencia.
    expect(hp.deltaPct).toBeNull();
  });

  it('con periodo anterior comparable calcula la tendencia en puntos', () => {
    const prev = [
      ck('2026-07-10T10:00:00', 'high_unpleasant'),
      ck('2026-07-11T10:00:00', 'high_unpleasant'),
      ck('2026-07-12T10:00:00', 'high_unpleasant'),
      ck('2026-07-13T10:00:00', 'high_pleasant'),
      ck('2026-07-14T10:00:00', 'high_pleasant'),
    ];
    const r = buildQuadrantDistribution(period, prev);
    const hp = r.shares.find((s) => s.quadrant === 'high_pleasant')!;
    expect(hp.prevPct).toBeCloseTo(40);
    expect(hp.deltaPct).toBeCloseTo(0);
    const hu = r.shares.find((s) => s.quadrant === 'high_unpleasant')!;
    expect(hu.prevPct).toBeCloseTo(60);
    expect(hu.deltaPct).toBeCloseTo(20 - 60); // bajó
  });

  it('insuficiente si el periodo actual no llega al mínimo', () => {
    expect(buildQuadrantDistribution(period.slice(0, 2)).status).toBe('insufficient');
  });
});

describe('disparadores (asociación, no causa)', () => {
  it('surge el contexto que más acompaña estados desagradables, con soporte mínimo', () => {
    const checkins: StatsCheckin[] = [];
    for (let i = 0; i < 5; i++) {
      checkins.push(ck(`2026-07-${10 + i}T10:00:00`, 'high_unpleasant', { context_where: 'Trabajo' }));
    }
    checkins.push(ck('2026-07-16T10:00:00', 'high_pleasant', { context_where: 'Casa' }));
    const r = buildTriggers(checkins);
    expect(r.status).toBe('ok');
    expect(r.triggers[0]).toMatchObject({ dimension: 'where', value: 'Trabajo', count: 5 });
    // 'Otro' se ignora, y lo agradable no cuenta como disparador.
    expect(r.triggers.some((t) => t.value === 'Casa')).toBe(false);
  });

  it('pocos desagradables → dice cuántos faltan', () => {
    const r = buildTriggers([ck('2026-07-10T10:00:00', 'high_unpleasant', { context_where: 'Gym' })]);
    expect(r.status).toBe('insufficient');
    expect(r.needMore).toBeGreaterThan(0);
  });
});

describe('racha de escucha + consistencia', () => {
  it('cuenta racha activa terminando hoy y la más larga', () => {
    const now = new Date('2026-07-22T20:00:00');
    const checkins = [
      ck('2026-07-22T10:00:00', 'high_pleasant'),
      ck('2026-07-21T10:00:00', 'high_pleasant'),
      ck('2026-07-20T10:00:00', 'high_pleasant'),
      ck('2026-07-18T10:00:00', 'high_pleasant'), // corte el 19
    ];
    const r = buildConsistency(checkins, 30, now);
    expect(r.currentStreak).toBe(3);
    expect(r.longestStreak).toBe(3);
    expect(r.daysWithCheckin).toBe(4);
    expect(r.consistencyPct).toBeCloseTo(round(4 / 30 * 100));
  });

  it('si hoy no hay check-in pero ayer sí, la racha sigue viva desde ayer', () => {
    const now = new Date('2026-07-22T09:00:00');
    const checkins = [
      ck('2026-07-21T10:00:00', 'high_pleasant'),
      ck('2026-07-20T10:00:00', 'high_pleasant'),
    ];
    expect(buildConsistency(checkins, 30, now).currentStreak).toBe(2);
  });
});

describe('C.1 · efectividad de la navegación (el diferenciador)', () => {
  it('mide si el siguiente check-in mejoró tras cada movimiento, con muestra mínima', () => {
    const events: NavEvent[] = [];
    const checkins: StatsCheckin[] = [];
    // 4 veces "bajar" desde enraged (baseline ~3.5) seguido de un check-in mejor.
    for (let i = 0; i < 4; i++) {
      const day = 10 + i;
      events.push({ emotion_id: 'enraged', move: 'bajar', created_at: `2026-07-${day}T10:00:00` });
      const better = i < 3 ? 7 : 3; // 3 de 4 mejoran
      checkins.push(ck(`2026-07-${day}T12:00:00`, better >= 5 ? 'high_pleasant' : 'high_unpleasant', { pleasantness: better }));
    }
    const r = computeNavigationEfficacy(events, checkins);
    expect(r.status).toBe('ok');
    const bajar = r.moves.find((m) => m.move === 'bajar')!;
    expect(bajar.sampled).toBe(4);
    expect(bajar.improved).toBe(3);
    expect(bajar.rate).toBeCloseTo(3 / 4);
  });

  it('con menos de la muestra mínima el movimiento queda PENDIENTE, no se afirma', () => {
    const events: NavEvent[] = [
      { emotion_id: 'anxious', move: 'reencuadrar', created_at: '2026-07-10T10:00:00' },
    ];
    const checkins = [ck('2026-07-10T12:00:00', 'high_pleasant', { pleasantness: 8 })];
    const r = computeNavigationEfficacy(events, checkins);
    expect(r.status).toBe('insufficient');
    expect(r.moves).toHaveLength(0);
    expect(r.pending[0]).toMatchObject({ move: 'reencuadrar', sampled: 1, needMore: MIN_NAV_SAMPLES - 1 });
  });

  it('saborear/canalizar NO se evalúan como mejora (sostienen un buen estado)', () => {
    const events: NavEvent[] = Array.from({ length: 4 }, (_, i) => ({
      emotion_id: 'calm', move: 'saborear', created_at: `2026-07-${10 + i}T10:00:00`,
    }));
    const checkins = events.map((e, i) => ck(`2026-07-${10 + i}T12:00:00`, 'low_pleasant', { pleasantness: 7 }));
    const r = computeNavigationEfficacy(events, checkins);
    expect(r.moves.some((m) => m.move === 'saborear')).toBe(false);
  });

  it('un check-in ANTERIOR al movimiento no cuenta (solo el siguiente)', () => {
    const events: NavEvent[] = Array.from({ length: 3 }, (_, i) => ({
      emotion_id: 'enraged', move: 'bajar', created_at: `2026-07-${10 + i}T10:00:00`,
    }));
    // Check-ins ANTES del movimiento — no deberían muestrear nada.
    const checkins = events.map((e, i) => ck(`2026-07-${10 + i}T08:00:00`, 'high_pleasant', { pleasantness: 9 }));
    const r = computeNavigationEfficacy(events, checkins);
    expect(r.status).toBe('insufficient');
  });
});

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
