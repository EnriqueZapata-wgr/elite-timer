/**
 * Leaderboard — I/O sobre los RPCs get_leaderboard / get_my_leaderboard_position
 * (migración 180). El orden/posición puro vive en leaderboard-core.ts.
 *
 * Anti-fuga (defensa en profundidad): los RPCs seleccionan SOLO de
 * electron_balance + user_profile_public (verificado por el test estático sobre
 * la migración). Aquí no se hace ningún otro query.
 */
import { supabase } from '@/src/lib/supabase';
import {
  rankLeaderboard,
  type LeaderboardRow,
  type RankedLeaderboardRow,
  type MyPosition,
} from './leaderboard-core';

export type LeaderboardScope = 'all_time' | 'week' | 'month';

/** Top 20 (con posición 1..N anexada), ordenado por lifetime_electrons DESC. */
export async function getLeaderboard(
  scope: LeaderboardScope = 'all_time',
): Promise<RankedLeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_scope: scope });
  if (error) {
    console.warn('[leaderboard] getLeaderboard:', error.message);
    return [];
  }
  return rankLeaderboard((data ?? []) as LeaderboardRow[]);
}

/** Posición global del usuario autenticado (null si no tiene economía aún). */
export async function getMyPosition(): Promise<MyPosition | null> {
  const { data, error } = await supabase.rpc('get_my_leaderboard_position');
  if (error) {
    console.warn('[leaderboard] getMyPosition:', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const r = row as Record<string, unknown>;
  return {
    position: Number(r.rank_position ?? 0),   // ⚠️ RPC devuelve rank_position — 'position' es reservada Postgres
    total: Number(r.total ?? 0),
    lifetime_electrons: Number(r.lifetime_electrons ?? 0),
    current_rank: Number(r.current_rank ?? 1),
    streak_days: Number(r.streak_days ?? 0),
  };
}
