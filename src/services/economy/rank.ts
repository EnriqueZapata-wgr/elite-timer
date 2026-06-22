/**
 * Curva de rank a partir de electrones lifetime. PURO (testeable sin supabase).
 * DEBE coincidir con economy_rank_from_lifetime() en la migración 091.
 *
 * ⚠️ Curva PLACEHOLDER (calibrar con 03_ECONOMIA_PROTONES_H_PLUS.md): rank = 1 + floor(sqrt(lifetime/50)),
 * acotado a 1..99. lifetime 0→1, 50→2, 200→3, ... ~480k→99.
 */
export function computeRankFromLifetime(lifetimeElectrons: number): number {
  const lt = Math.max(0, Math.floor(lifetimeElectrons || 0));
  const rank = 1 + Math.floor(Math.sqrt(lt / 50));
  return Math.min(99, Math.max(1, rank));
}

/** Electrones lifetime necesarios para alcanzar un rank dado (inverso de la curva). */
export function lifetimeForRank(rank: number): number {
  const r = Math.min(99, Math.max(1, Math.floor(rank)));
  return (r - 1) * (r - 1) * 50;
}

/** Progreso [0..1] del rank actual hacia el siguiente, dado el lifetime. */
export function rankProgress(lifetimeElectrons: number): {
  rank: number; nextRank: number; floor: number; ceil: number; progress: number;
} {
  const rank = computeRankFromLifetime(lifetimeElectrons);
  const nextRank = Math.min(99, rank + 1);
  const floor = lifetimeForRank(rank);
  const ceil = lifetimeForRank(nextRank);
  const span = Math.max(1, ceil - floor);
  const progress = rank >= 99 ? 1 : Math.min(1, Math.max(0, (lifetimeElectrons - floor) / span));
  return { rank, nextRank, floor, ceil, progress };
}
