import { describe, it, expect } from 'vitest';
import { computeRankFromLifetime, lifetimeForRank, rankProgress, rankTierLabel } from '@/src/services/economy/rank';

describe('economy/rank — curva por bandas (doc económico)', () => {
  it('valores ancla del doc', () => {
    expect(computeRankFromLifetime(0)).toBe(1);
    expect(computeRankFromLifetime(500)).toBe(5);          // medio del tramo 1-9
    expect(computeRankFromLifetime(1000)).toBe(10);        // borde → entra a banda 2
    expect(computeRankFromLifetime(30000)).toBe(50);       // borde banda 4
    expect(computeRankFromLifetime(100000)).toBe(80);      // borde banda 5
    expect(computeRankFromLifetime(500000)).toBe(99);      // cap
    expect(computeRankFromLifetime(999_999_999)).toBe(99); // cap
  });
  it('5,500 E- cae cerca de rank 20 (tramo 10-29)', () => {
    const r = computeRankFromLifetime(5500);
    expect(r).toBeGreaterThanOrEqual(18);
    expect(r).toBeLessThanOrEqual(21);
  });
  it('29,999 → 49 (justo bajo el borde de banda 4)', () => {
    expect(computeRankFromLifetime(29999)).toBe(49);
  });
  it('monótono no decreciente', () => {
    let prev = 0;
    for (const lt of [0, 500, 1000, 5000, 10000, 30000, 100000, 300000, 500000]) {
      const r = computeRankFromLifetime(lt);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });
});

describe('economy/rank — lifetimeForRank round-trip', () => {
  it('computeRank(lifetimeForRank(r)) === r', () => {
    for (const r of [1, 2, 5, 9, 10, 20, 30, 49, 50, 79, 80, 99]) {
      expect(computeRankFromLifetime(lifetimeForRank(r))).toBe(r);
    }
  });
});

describe('economy/rank — rankProgress', () => {
  it('progreso 0 en el piso del rank', () => {
    const p = rankProgress(lifetimeForRank(20));
    expect(p.rank).toBe(20);
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.progress).toBeLessThan(0.5);
  });
  it('rank 99 → progreso 1', () => {
    expect(rankProgress(999_999_999).progress).toBe(1);
  });
});

describe('economy/rank — rankTierLabel (insignias doc)', () => {
  it('mapea bandas a insignias', () => {
    expect(rankTierLabel(5)).toBe('Iniciado');
    expect(rankTierLabel(20)).toBe('Consistente');
    expect(rankTierLabel(40)).toBe('Atleta');
    expect(rankTierLabel(60)).toBe('Élite');
    expect(rankTierLabel(90)).toBe('Maestro ATP');
  });
});
