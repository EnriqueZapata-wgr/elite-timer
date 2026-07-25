/**
 * Tests del historial y correlaciones (MB-4 · Bloque 3).
 * La honestidad estadística es contrato, no adorno.
 */
import { describe, it, expect } from 'vitest';
import {
  buildMosaic, buildDayMoods, computeCorrelation, computePhaseBreakdown,
  filterByRange, localDayKey, MIN_DAYS_PER_GROUP, MIN_DELTA,
  type DayMood, type HistoryCheckin,
} from '../emotion-history-core';

const ci = (date: string, emotions: string[], pleasantness?: number, quadrant = 'high_pleasant'): HistoryCheckin => ({
  emotions, quadrant, pleasantness, created_at: `${date}T12:00:00`,
});

describe('mosaico', () => {
  it('cuenta frecuencia por emoción, orden descendente y determinista', () => {
    const mosaic = buildMosaic([
      ci('2026-07-01', ['happy', 'calm']),
      ci('2026-07-02', ['happy']),
      ci('2026-07-03', ['sad', 'calm']),
      ci('2026-07-04', ['happy']),
    ]);
    expect(mosaic[0]).toEqual({ emotionId: 'happy', count: 3 });
    expect(mosaic[1]).toEqual({ emotionId: 'calm', count: 2 });
    // Empate a 1 → alfabético
    expect(mosaic[2].emotionId).toBe('sad');
  });

  it('vacío no truena', () => {
    expect(buildMosaic([])).toEqual([]);
  });
});

describe('ánimo por día', () => {
  it('promedia varios check-ins del mismo día y usa fallback por cuadrante', () => {
    const days = buildDayMoods([
      ci('2026-07-01', ['happy'], 8),
      ci('2026-07-01', ['sad'], 4),
      ci('2026-07-02', ['sad'], undefined, 'low_unpleasant'), // fallback → 3
    ]);
    expect(days).toHaveLength(2);
    expect(days[0].pleasantness).toBe(6); // (8+4)/2
    expect(days[1].pleasantness).toBe(3);
  });

  it('localDayKey agrupa por día local', () => {
    expect(localDayKey('2026-07-01T12:00:00')).toBe('2026-07-01');
  });
});

describe('correlaciones — honestidad estadística', () => {
  const moodDays = (spec: [string, number][]): DayMood[] =>
    spec.map(([date, pleasantness]) => ({ date, pleasantness }));

  const DEF = {
    key: 'sleep', label: 'Sueño',
    withLabel: 'dormiste menos de 6 h',
    withoutLabel: 'dormiste 6 h o más',
  };

  it('con pocos días NO afirma nada (insufficient) y lo dice', () => {
    const days = moodDays([['2026-07-01', 3], ['2026-07-02', 8]]);
    const r = computeCorrelation(days, { ...DEF, factorDates: ['2026-07-01'] });
    expect(r.status).toBe('insufficient');
    expect(r.withAvg).toBeNull();
    expect(r.observation).toContain('honesto');
    expect(r.observation).toContain(String(MIN_DAYS_PER_GROUP));
  });

  it('con señal real produce OBSERVACIÓN, nunca causa', () => {
    // 6 días con factor (ánimo ~3), 6 sin factor (ánimo ~7)
    const days: DayMood[] = [];
    const factorDates: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const d = `2026-07-0${i}`;
      days.push({ date: d, pleasantness: 3 });
      factorDates.push(d);
    }
    for (let i = 10; i <= 15; i++) days.push({ date: `2026-07-${i}`, pleasantness: 7 });
    const r = computeCorrelation(days, { ...DEF, factorDates });
    expect(r.status).toBe('signal');
    expect(r.withAvg).toBe(3);
    expect(r.withoutAvg).toBe(7);
    expect(r.observation).toContain('dormiste menos de 6 h');
    expect(r.observation).toContain('más bajo');
    // Lenguaje prohibido (causal):
    expect(r.observation.toLowerCase()).not.toContain('causa');
    expect(r.observation.toLowerCase()).not.toContain('provoca');
    expect(r.observation.toLowerCase()).not.toContain('por dormir');
  });

  it('diferencia chica = sin patrón claro (no se infla el ruido)', () => {
    const days: DayMood[] = [];
    const factorDates: string[] = [];
    for (let i = 1; i <= 6; i++) {
      days.push({ date: `2026-07-0${i}`, pleasantness: 6 });
      factorDates.push(`2026-07-0${i}`);
    }
    for (let i = 10; i <= 15; i++) days.push({ date: `2026-07-${i}`, pleasantness: 6 + MIN_DELTA / 2 });
    const r = computeCorrelation(days, { ...DEF, factorDates });
    expect(r.status).toBe('no_signal');
    expect(r.observation).toContain('no se ve un patrón claro');
  });

  it('measuredDates excluye días sin dato del factor (sueño no medido ≠ dormiste bien)', () => {
    const days: DayMood[] = [];
    for (let i = 1; i <= 9; i++) days.push({ date: `2026-07-0${i}`, pleasantness: 5 });
    const r = computeCorrelation(days, {
      ...DEF,
      factorDates: ['2026-07-01'],
      measuredDates: ['2026-07-01', '2026-07-02'], // solo 2 días medidos
    });
    expect(r.status).toBe('insufficient');
    expect(r.withCount + r.withoutCount).toBe(2);
  });
});

describe('consciencia de ciclo', () => {
  it('promedia por fase y exige mínimo de días por fase', () => {
    const days: DayMood[] = [];
    const phaseByDate: Record<string, string> = {};
    for (let i = 1; i <= 4; i++) {
      days.push({ date: `2026-07-0${i}`, pleasantness: 4 });
      phaseByDate[`2026-07-0${i}`] = 'luteal';
    }
    for (let i = 5; i <= 8; i++) {
      days.push({ date: `2026-07-0${i}`, pleasantness: 7 });
      phaseByDate[`2026-07-0${i}`] = 'follicular';
    }
    days.push({ date: '2026-07-09', pleasantness: 9 });
    phaseByDate['2026-07-09'] = 'ovulation'; // solo 1 día → fuera
    const r = computePhaseBreakdown(days, phaseByDate);
    expect(r.status).toBe('ok');
    expect(r.entries).toHaveLength(2);
    expect(r.entries.find(e => e.phase === 'luteal')?.avg).toBe(4);
    expect(r.entries.find(e => e.phase === 'ovulation')).toBeUndefined();
  });

  it('con una sola fase representada es insufficient', () => {
    const days: DayMood[] = [
      { date: '2026-07-01', pleasantness: 5 },
      { date: '2026-07-02', pleasantness: 5 },
      { date: '2026-07-03', pleasantness: 5 },
    ];
    const r = computePhaseBreakdown(days, {
      '2026-07-01': 'luteal', '2026-07-02': 'luteal', '2026-07-03': 'luteal',
    });
    expect(r.status).toBe('insufficient');
  });
});

describe('filtro de rango', () => {
  it('semana / mes recortan por fecha', () => {
    const now = new Date('2026-07-25T12:00:00');
    const items = [
      { created_at: '2026-07-24T10:00:00' },
      { created_at: '2026-07-10T10:00:00' },
      { created_at: '2026-01-01T10:00:00' },
    ];
    expect(filterByRange(items, 'week', now)).toHaveLength(1);
    expect(filterByRange(items, 'month', now)).toHaveLength(2);
    expect(filterByRange(items, 'all', now)).toHaveLength(3);
  });
});
