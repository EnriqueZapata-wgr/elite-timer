/**
 * leaderboard-core — orden por lifetime_electrons DESC + posición 1..N y
 * formateo de la posición propia.
 */
import { describe, it, expect } from 'vitest';
import {
  rankLeaderboard,
  formatMyPosition,
  isInTop,
  type LeaderboardRow,
  type MyPosition,
} from '../leaderboard-core';

function row(id: string, electrons: number | null): LeaderboardRow {
  return {
    user_id: id,
    username: id,
    display_name: id.toUpperCase(),
    avatar_url: null,
    current_rank: 5,
    lifetime_electrons: electrons,
    streak_days: 3,
  };
}

describe('rankLeaderboard · orden y posición', () => {
  it('ordena por lifetime_electrons DESC y anexa posición 1-based', () => {
    const out = rankLeaderboard([row('a', 100), row('b', 500), row('c', 300)]);
    expect(out.map(r => r.user_id)).toEqual(['b', 'c', 'a']);
    expect(out.map(r => r.position)).toEqual([1, 2, 3]);
  });

  it('no muta el arreglo de entrada', () => {
    const input = [row('a', 100), row('b', 500)];
    const snapshot = input.map(r => r.user_id);
    rankLeaderboard(input);
    expect(input.map(r => r.user_id)).toEqual(snapshot);
  });

  it('empates preservan el orden de entrada (estable)', () => {
    const out = rankLeaderboard([row('x', 200), row('y', 200), row('z', 200)]);
    expect(out.map(r => r.user_id)).toEqual(['x', 'y', 'z']);
  });

  it('electrones ocultos (null) caen al fondo, nunca arriba', () => {
    const out = rankLeaderboard([row('hidden', null), row('top', 50)]);
    expect(out[0].user_id).toBe('top');
    expect(out[1].user_id).toBe('hidden');
    expect(out[1].position).toBe(2);
  });

  it('lista vacía → arreglo vacío', () => {
    expect(rankLeaderboard([])).toEqual([]);
  });
});

describe('formatMyPosition', () => {
  const pos: MyPosition = { position: 3, total: 128, lifetime_electrons: 900, current_rank: 8, streak_days: 4 };

  it('formatea "#3 de 128"', () => {
    expect(formatMyPosition(pos)).toBe('#3 de 128');
  });

  it('null → sin posición', () => {
    expect(formatMyPosition(null)).toBe('Sin posición aún');
  });

  it('total inválido → solo "#N"', () => {
    expect(formatMyPosition({ ...pos, total: 0 })).toBe('#3');
  });
});

describe('isInTop', () => {
  const pos: MyPosition = { position: 5, total: 100, lifetime_electrons: 1, current_rank: 1, streak_days: 0 };

  it('posición dentro del top → true', () => {
    expect(isInTop(pos, 20)).toBe(true);
  });

  it('posición fuera del top → false', () => {
    expect(isInTop({ ...pos, position: 21 }, 20)).toBe(false);
  });

  it('null → false', () => {
    expect(isInTop(null, 20)).toBe(false);
  });
});
