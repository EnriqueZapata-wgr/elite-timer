import { describe, it, expect } from 'vitest';
import { computeRankFromLifetime, lifetimeForRank, rankProgress } from '@/src/services/economy/rank';

describe('economy/rank — computeRankFromLifetime', () => {
  it('acotado a 1..99', () => {
    expect(computeRankFromLifetime(0)).toBe(1);
    expect(computeRankFromLifetime(-100)).toBe(1);
    expect(computeRankFromLifetime(999_999_999)).toBe(99);
  });
  it('monótono creciente', () => {
    expect(computeRankFromLifetime(50)).toBe(2);
    expect(computeRankFromLifetime(200)).toBe(3);
    expect(computeRankFromLifetime(450)).toBe(4);
    expect(computeRankFromLifetime(40)).toBe(1);
  });
  it('inverso lifetimeForRank coincide con la curva', () => {
    for (const r of [1, 2, 5, 10, 50, 99]) {
      expect(computeRankFromLifetime(lifetimeForRank(r))).toBe(r);
    }
  });
});

describe('economy/rank — rankProgress', () => {
  it('progreso 0 en el piso del rank', () => {
    const p = rankProgress(lifetimeForRank(5)); // justo al entrar a rank 5
    expect(p.rank).toBe(5);
    expect(p.progress).toBeCloseTo(0, 5);
  });
  it('progreso entre 0 y 1', () => {
    const p = rankProgress(lifetimeForRank(5) + 10);
    expect(p.progress).toBeGreaterThan(0);
    expect(p.progress).toBeLessThan(1);
  });
  it('rank 99 → progreso 1', () => {
    expect(rankProgress(999_999_999).progress).toBe(1);
  });
});
