/**
 * Amigos + moderación (C2) — núcleo PURO (sin react-native/supabase), testeable
 * con vitest. El I/O (RPCs de la migración 184) vive en friends-service.ts.
 *
 * Espeja las decisiones del servidor:
 *  - Edge BIDIRECCIONAL único por par (canonical pair = LEAST/GREATEST de 182).
 *  - Estado derivado de una friendship respecto al caller (none/incoming/
 *    outgoing/friends/blocked — blocked domina todo).
 *  - Rate limit del buscador: máx SEARCH_RATE_LIMIT búsquedas por ventana de
 *    SEARCH_RATE_WINDOW_MS (espejo del RPC search_users v2).
 *  - Auto-hide por reports: >= REPORT_AUTOHIDE_THRESHOLD reporters distintos.
 *
 * Anti-fuga: los tipos de esta superficie SOLO contienen campos públicos
 * whitelisteados (PUBLIC_PROFILE_FIELDS). Nada clínico existe aquí.
 */
import {
  REPORT_AUTOHIDE_THRESHOLD,
  REPORT_REASON_KEYS,
  type ReportReasonKey,
} from '@/src/constants/community';

// ── Tipos del grafo social ────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface FriendshipEdge {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

/** Estado de la relación caller ↔ target, para decidir qué botón mostrar. */
export type FriendState = 'none' | 'incoming' | 'outgoing' | 'friends' | 'blocked';

/** Códigos que devuelven los RPCs de mutación (mig 184). */
export type SocialRpcCode =
  | 'sent' | 'already_friends' | 'already_pending' | 'incoming_pending'
  | 'accepted' | 'declined' | 'unfriended' | 'blocked' | 'unblocked' | 'reported'
  | 'not_found' | 'not_allowed' | 'invalid_reason' | 'no_auth' | 'error';

// ── Canonical pair (espejo del índice único LEAST/GREATEST de 182) ───────────

/** Par canónico ordenado: un solo edge por par sin importar dirección. */
export function canonicalPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

/** True si dos pares (en cualquier orden) representan el mismo edge. */
export function isSameEdge(a1: string, b1: string, a2: string, b2: string): boolean {
  const [x1, y1] = canonicalPair(a1, b1);
  const [x2, y2] = canonicalPair(a2, b2);
  return x1 === x2 && y1 === y2;
}

// ── Estado derivado ───────────────────────────────────────────────────────────

export interface BlockContext {
  /** El caller bloqueó al target. */
  blockedByMe?: boolean;
  /** El target bloqueó al caller (normalmente el cliente NO lo sabe; server-side). */
  blockedMe?: boolean;
}

/**
 * Deriva el estado de amistad respecto al caller. `blocked` domina cualquier
 * edge (el servidor borra el edge al bloquear, pero por si llegan datos stale).
 * Un edge `declined` se trata como `none`: el server permite re-request
 * (decisión C2 — el "no definitivo" es el block, no el declined).
 */
export function deriveFriendState(
  edge: Pick<FriendshipEdge, 'requester_id' | 'addressee_id' | 'status'> | null | undefined,
  callerId: string,
  blocks?: BlockContext,
): FriendState {
  if (blocks?.blockedByMe || blocks?.blockedMe) return 'blocked';
  if (!edge) return 'none';
  const mine = edge.requester_id === callerId || edge.addressee_id === callerId;
  if (!mine) return 'none';
  if (edge.status === 'accepted') return 'friends';
  if (edge.status === 'pending') {
    return edge.addressee_id === callerId ? 'incoming' : 'outgoing';
  }
  return 'none'; // declined → re-request permitido
}

/** Mapea el código del RPC send_friend_request al estado resultante en UI. */
export function stateAfterSendCode(code: SocialRpcCode): FriendState {
  switch (code) {
    case 'sent':
    case 'already_pending':
      return 'outgoing';
    case 'incoming_pending':
      return 'incoming';
    case 'already_friends':
      return 'friends';
    default:
      return 'none';
  }
}

// ── Listas: proyecciones públicas ─────────────────────────────────────────────

/** Fila de list_friends (MISMO shape que get_public_profile — whitelist 178/184). */
export interface FriendRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  chronotype: string | null;
  streak_days: number | null;
  lifetime_electrons: number | null;
  current_rank: number | null;
  friend_count: number;
}

export interface PendingRequestRow {
  request_id: string;
  direction: 'incoming' | 'outgoing';
  other_user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  requested_at: string;
}

/** Nombre visible fail-soft para cualquier proyección pública. */
export function publicDisplayName(row: { display_name?: string | null; username?: string | null }): string {
  return row.display_name ?? row.username ?? 'Atleta ATP';
}

/** Ordena amigos alfabéticamente por nombre visible (estable, no muta). */
export function sortFriends(rows: FriendRow[]): FriendRow[] {
  return [...rows].sort((a, b) =>
    publicDisplayName(a).toLowerCase().localeCompare(publicDisplayName(b).toLowerCase(), 'es'),
  );
}

export interface SplitRequests {
  incoming: PendingRequestRow[];
  outgoing: PendingRequestRow[];
}

/** Separa pendientes en recibidas/enviadas, más recientes primero (no muta). */
export function splitPendingRequests(rows: PendingRequestRow[]): SplitRequests {
  const byDateDesc = (a: PendingRequestRow, b: PendingRequestRow) =>
    Date.parse(b.requested_at) - Date.parse(a.requested_at);
  return {
    incoming: rows.filter(r => r.direction === 'incoming').sort(byDateDesc),
    outgoing: rows.filter(r => r.direction === 'outgoing').sort(byDateDesc),
  };
}

// ── Reports ───────────────────────────────────────────────────────────────────

/** True si la razón es una de las keys válidas del CHECK de user_reports (183). */
export function isValidReportReason(reason: string): reason is ReportReasonKey {
  return (REPORT_REASON_KEYS as string[]).includes(reason);
}

/** Espejo del umbral de auto-hide del RPC report_user (mig 184). */
export function shouldAutoHide(distinctReporters: number): boolean {
  return Number.isFinite(distinctReporters) && distinctReporters >= REPORT_AUTOHIDE_THRESHOLD;
}

// ── Rate limit del buscador (espejo cliente de search_users v2) ───────────────

/** Máx búsquedas por ventana (idéntico a v_rate_limit del RPC). */
export const SEARCH_RATE_LIMIT = 20;
/** Ventana del rate limit en ms (60s, idéntico al RPC). */
export const SEARCH_RATE_WINDOW_MS = 60_000;

/**
 * True si una nueva búsqueda en `now` está permitida dado el historial local
 * `previousTimestamps` (ms epoch). Semántica idéntica al servidor: se permiten
 * hasta SEARCH_RATE_LIMIT búsquedas dentro de la ventana; la siguiente se
 * bloquea. (El server devuelve vacío; el cliente usa esto para avisar suave
 * ANTES de quemar la llamada.)
 */
export function isSearchAllowed(
  previousTimestamps: readonly number[],
  now: number,
  limit: number = SEARCH_RATE_LIMIT,
  windowMs: number = SEARCH_RATE_WINDOW_MS,
): boolean {
  const inWindow = previousTimestamps.filter(t => t > now - windowMs && t <= now);
  return inWindow.length < limit;
}
