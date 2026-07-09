import { describe, it, expect } from 'vitest';
import {
  mergeRecentActivity,
  formatRelativeTime,
  formatDuration,
  lastActivitySubtitle,
  ACTIVITY_META,
  type MenteActivity,
} from '@/src/components/mente/mente-hub-core';

const NOW = new Date('2026-07-10T18:00:00.000Z');

function act(kind: MenteActivity['kind'], at: string, durationSeconds?: number): MenteActivity {
  return { kind, label: kind, at, durationSeconds };
}

describe('mergeRecentActivity — timeline cross-MENTE (T1)', () => {
  it('ordena descendente por fecha y respeta el límite', () => {
    const merged = mergeRecentActivity([
      act('journal', '2026-07-08T10:00:00Z'),
      act('breathing', '2026-07-10T09:00:00Z'),
      act('checkin', '2026-07-09T22:00:00Z'),
    ], 2);
    expect(merged).toHaveLength(2);
    expect(merged[0].kind).toBe('breathing');
    expect(merged[1].kind).toBe('checkin');
  });

  it('descarta timestamps inválidos sin crashear', () => {
    const merged = mergeRecentActivity([
      act('journal', 'garbage'),
      act('meditation', '2026-07-10T09:00:00Z'),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe('meditation');
  });

  it('lista vacía → vacía', () => {
    expect(mergeRecentActivity([])).toEqual([]);
  });
});

describe('formatRelativeTime', () => {
  it('hace poco / horas / ayer / días', () => {
    expect(formatRelativeTime('2026-07-10T17:40:00Z', NOW)).toBe('Hace poco');
    expect(formatRelativeTime('2026-07-10T15:00:00Z', NOW)).toBe('Hace 3h');
    expect(formatRelativeTime('2026-07-09T12:00:00Z', NOW)).toBe('Ayer');
    expect(formatRelativeTime('2026-07-06T12:00:00Z', NOW)).toBe('Hace 4 días');
  });
  it('fecha inválida → string vacío', () => {
    expect(formatRelativeTime('nope', NOW)).toBe('');
  });
});

describe('formatDuration', () => {
  it('segundos, minutos y sin dato', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(600)).toBe('10 min');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(0)).toBe('');
  });
});

describe('lastActivitySubtitle', () => {
  it('con actividad → prefix + relativo; sin actividad → solo prefix', () => {
    expect(lastActivitySubtitle('4 técnicas', '2026-07-10T15:00:00Z', NOW)).toBe('4 técnicas · hace 3h');
    expect(lastActivitySubtitle('4 técnicas', null, NOW)).toBe('4 técnicas');
  });
});

describe('ACTIVITY_META', () => {
  it('cubre los 4 tipos del ecosistema', () => {
    expect(Object.keys(ACTIVITY_META).sort()).toEqual(['breathing', 'checkin', 'journal', 'meditation']);
  });
});
