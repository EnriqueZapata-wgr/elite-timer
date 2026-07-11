/**
 * Leaderboard — núcleo PURO (sin react-native/supabase), testeable con vitest.
 *
 * El orden autoritativo lo produce el RPC get_leaderboard (ORDER BY
 * lifetime_electrons DESC, ya con flags aplicados). Estas utilidades son de
 * presentación: re-asegurar el orden en cliente (defensa contra un backend que
 * devuelva desordenado) y anexar el número de posición 1..N para la UI.
 *
 * Anti-fuga: estos tipos SOLO contienen campos públicos (rank/electrones/racha/
 * foto/nombre). Ningún campo clínico existe en esta superficie.
 */

export interface LeaderboardRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  current_rank: number | null;
  lifetime_electrons: number | null;
  streak_days: number | null;
}

export interface RankedLeaderboardRow extends LeaderboardRow {
  position: number;
}

/** Electrones para ordenar (null/oculto = -1: cae al fondo, nunca arriba). */
function sortKey(row: LeaderboardRow): number {
  const e = row.lifetime_electrons;
  return typeof e === 'number' && Number.isFinite(e) ? e : -1;
}

/**
 * Ordena por lifetime_electrons DESC (estable ante empates: preserva el orden de
 * entrada) y anexa `position` 1-based. No muta el arreglo original.
 */
export function rankLeaderboard(rows: LeaderboardRow[]): RankedLeaderboardRow[] {
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const d = sortKey(b.row) - sortKey(a.row);
      return d !== 0 ? d : a.i - b.i; // empate → orden de entrada (estable)
    })
    .map(({ row }, idx) => ({ ...row, position: idx + 1 }));
}

export interface MyPosition {
  position: number;
  total: number;
  lifetime_electrons: number;
  current_rank: number;
  streak_days: number;
}

/**
 * Texto humano de la posición propia: "#3 de 128". Fail-soft si faltan datos.
 */
export function formatMyPosition(pos: MyPosition | null): string {
  if (!pos || !Number.isFinite(pos.position) || pos.position < 1) return 'Sin posición aún';
  if (!Number.isFinite(pos.total) || pos.total < 1) return `#${pos.position}`;
  return `#${pos.position} de ${pos.total}`;
}

/** True si la posición propia entra en el top N mostrado (para no duplicar la fila). */
export function isInTop(pos: MyPosition | null, topSize: number): boolean {
  return !!pos && Number.isFinite(pos.position) && pos.position >= 1 && pos.position <= topSize;
}
