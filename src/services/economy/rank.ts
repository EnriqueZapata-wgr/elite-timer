/**
 * Curva de rank a partir de electrones lifetime. PURO (testeable sin supabase).
 * DEBE coincidir con economy_rank_from_lifetime() en la migración 093.
 *
 * Calibrado con R and D/03_ECONOMIA_PROTONES_H_PLUS.md (tramos lineales por banda):
 *   Nivel 1-9    : 0 - 1,000 E-     (🟢 Iniciado)
 *   Nivel 10-29  : 1,001 - 10,000   (🔵 Consistente)
 *   Nivel 30-49  : 10,001 - 30,000  (🟡 Atleta)
 *   Nivel 50-79  : 30,001 - 100,000 (🟠 Élite)
 *   Nivel 80-99  : 100,001+         (🔴 Maestro ATP) — cap a 99 en 500,000 E-
 */
interface Band { r0: number; r1: number; e0: number; e1: number; }

const BANDS: Band[] = [
  { r0: 1,  r1: 9,  e0: 0,      e1: 1000 },
  { r0: 10, r1: 29, e0: 1000,   e1: 10000 },
  { r0: 30, r1: 49, e0: 10000,  e1: 30000 },
  { r0: 50, r1: 79, e0: 30000,  e1: 100000 },
  { r0: 80, r1: 99, e0: 100000, e1: 500000 },
];
const MAX_E = 500000; // ≥ esto → rank 99

export function computeRankFromLifetime(lifetimeElectrons: number): number {
  const lt = Math.max(0, Math.floor(lifetimeElectrons || 0));
  if (lt >= MAX_E) return 99;
  for (const b of BANDS) {
    if (lt >= b.e0 && lt < b.e1) {
      const spanE = b.e1 - b.e0;
      const spanR = b.r1 - b.r0 + 1;
      const rank = b.r0 + Math.floor(((lt - b.e0) / spanE) * spanR);
      return Math.min(b.r1, Math.max(b.r0, rank));
    }
  }
  return 99;
}

/** Mínimo lifetime que alcanza un rank (inverso de la curva; usa ceil para round-trip exacto). */
export function lifetimeForRank(rank: number): number {
  const r = Math.min(99, Math.max(1, Math.floor(rank)));
  for (const b of BANDS) {
    if (r >= b.r0 && r <= b.r1) {
      const spanE = b.e1 - b.e0;
      const spanR = b.r1 - b.r0 + 1;
      return Math.ceil(b.e0 + (r - b.r0) * (spanE / spanR));
    }
  }
  return MAX_E;
}

/** Insignia del doc económico por rank. */
export function rankTierLabel(rank: number): string {
  if (rank >= 80) return 'Maestro ATP';
  if (rank >= 50) return 'Élite';
  if (rank >= 30) return 'Atleta';
  if (rank >= 10) return 'Consistente';
  return 'Iniciado';
}

/** Progreso [0..1] del rank actual hacia el siguiente, dado el lifetime. */
export function rankProgress(lifetimeElectrons: number): {
  rank: number; nextRank: number; floor: number; ceil: number; progress: number;
} {
  const rank = computeRankFromLifetime(lifetimeElectrons);
  if (rank >= 99) {
    const floor99 = lifetimeForRank(99);
    return { rank: 99, nextRank: 99, floor: floor99, ceil: floor99, progress: 1 };
  }
  const nextRank = rank + 1;
  const floor = lifetimeForRank(rank);
  const ceil = lifetimeForRank(nextRank);
  const span = Math.max(1, ceil - floor);
  const progress = Math.min(1, Math.max(0, (lifetimeElectrons - floor) / span));
  return { rank, nextRank, floor, ceil, progress };
}
