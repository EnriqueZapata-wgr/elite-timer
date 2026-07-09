import { describe, it, expect } from 'vitest';
import {
  MEDAL_TIERS,
  MENTE_CATEGORIES,
  CATEGORY_COPY,
  medalTiersForStreak,
  nextMedalTarget,
  medalsToAward,
  streakCopy,
} from '@/src/services/mente-streaks-core';
import { computeJournalStreak } from '@/src/services/journal-logic';

describe('medalTiersForStreak — medallas por racha (T5)', () => {
  it('umbrales exactos: 7 / 30 / 90 / 365', () => {
    expect(medalTiersForStreak(0)).toEqual([]);
    expect(medalTiersForStreak(6)).toEqual([]);
    expect(medalTiersForStreak(7)).toEqual(['7d']);
    expect(medalTiersForStreak(30)).toEqual(['7d', '30d']);
    expect(medalTiersForStreak(90)).toEqual(['7d', '30d', '90d']);
    expect(medalTiersForStreak(365)).toEqual(['7d', '30d', '90d', '365d']);
    expect(medalTiersForStreak(1000)).toHaveLength(4);
  });
});

describe('nextMedalTarget', () => {
  it('apunta a la siguiente medalla con días restantes', () => {
    expect(nextMedalTarget(0)).toEqual({ tier: '7d', days: 7, remaining: 7 });
    expect(nextMedalTarget(7)).toEqual({ tier: '30d', days: 30, remaining: 23 });
    expect(nextMedalTarget(100)).toEqual({ tier: '365d', days: 365, remaining: 265 });
  });
  it('con 365+ ya no hay siguiente', () => {
    expect(nextMedalTarget(365)).toBeNull();
    expect(nextMedalTarget(999)).toBeNull();
  });
});

describe('medalsToAward — diff contra lo ya persistido (idempotencia)', () => {
  it('solo otorga lo nuevo', () => {
    expect(medalsToAward('journal', 30, ['7d'])).toEqual([
      { category: 'journal', tier: '30d' },
    ]);
  });
  it('sin racha suficiente o todo otorgado → vacío', () => {
    expect(medalsToAward('breathing', 3, [])).toEqual([]);
    expect(medalsToAward('checkin', 30, ['7d', '30d'])).toEqual([]);
  });
  it('racha grande sin historial otorga todas de golpe', () => {
    expect(medalsToAward('meditation', 90, [])).toHaveLength(3);
  });
});

describe('computeJournalStreak como motor genérico de rachas MENTE', () => {
  const TODAY = '2026-07-10';
  it('racha viva anclada en hoy', () => {
    expect(computeJournalStreak(['2026-07-10', '2026-07-09', '2026-07-08'], TODAY)).toBe(3);
  });
  it('racha viva anclada en ayer (hoy aún sin sesión)', () => {
    expect(computeJournalStreak(['2026-07-09', '2026-07-08'], TODAY)).toBe(2);
  });
  it('hueco rompe la racha; duplicados del mismo día cuentan una vez', () => {
    expect(computeJournalStreak(['2026-07-10', '2026-07-08'], TODAY)).toBe(1);
    expect(computeJournalStreak(['2026-07-10', '2026-07-10', '2026-07-09'], TODAY)).toBe(2);
  });
});

describe('estructura del pilar', () => {
  it('4 categorías con copy completo', () => {
    expect(MENTE_CATEGORIES).toHaveLength(4);
    MENTE_CATEGORIES.forEach((c) => {
      expect(CATEGORY_COPY[c].label.length).toBeGreaterThan(0);
      expect(CATEGORY_COPY[c].motivation.length).toBeGreaterThan(0);
    });
  });
  it('tiers ordenados ascendentes', () => {
    const days = MEDAL_TIERS.map((m) => m.days);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });
  it('streakCopy editorial', () => {
    expect(streakCopy(0)).toBe('Empieza hoy');
    expect(streakCopy(1)).toContain('1 día');
    expect(streakCopy(12)).toBe('12 días seguidos');
  });
});
