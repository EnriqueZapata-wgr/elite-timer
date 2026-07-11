/**
 * Amigos + moderación (C2) — I/O sobre los RPCs de la migración 184.
 * La lógica pura (canonical pair, estados, rate limit, split de listas) vive en
 * friends-core.ts (testeable node-only).
 *
 * Anti-fuga (defensa en profundidad): las proyecciones de perfil que llegan de
 * list_friends pasan por projectionIsClean (espejo cliente del guard — mismo
 * whitelist PUBLIC_PROFILE_FIELDS). Una fila con campos fuera del whitelist se
 * DESCARTA y se loguea. Los RPCs seleccionan SOLO de user_profile_public +
 * tablas sociales (verificado por el test estático sobre la migración).
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { projectionIsClean } from './public-profile-core';
import {
  isSearchAllowed,
  isValidReportReason,
  sortFriends,
  splitPendingRequests,
  type FriendRow,
  type PendingRequestRow,
  type SplitRequests,
  type SocialRpcCode,
} from './friends-core';
import { type UserSearchResult } from './public-profile-service';

function emitChanged() {
  DeviceEventEmitter.emit('friends_changed');
}

/** Ejecuta un RPC de mutación social y normaliza el código de resultado. */
async function socialRpc(fn: string, args: Record<string, unknown>): Promise<SocialRpcCode> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.warn(`[friends] ${fn}:`, error.message);
    return 'error';
  }
  return (typeof data === 'string' ? data : 'error') as SocialRpcCode;
}

// ── Solicitudes ───────────────────────────────────────────────────────────────

export async function sendFriendRequest(targetUserId: string): Promise<SocialRpcCode> {
  const code = await socialRpc('send_friend_request', { p_target: targetUserId });
  if (code === 'sent') emitChanged();
  return code;
}

export async function respondFriendRequest(
  requestId: string,
  accept: boolean,
): Promise<SocialRpcCode> {
  const code = await socialRpc('respond_friend_request', {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (code === 'accepted' || code === 'declined') emitChanged();
  return code;
}

// ── Listas ────────────────────────────────────────────────────────────────────

/** Amigos accepted, orden alfabético. Cada fila pasa el guard anti-fuga. */
export async function listFriends(): Promise<FriendRow[]> {
  const { data, error } = await supabase.rpc('list_friends');
  if (error) {
    console.warn('[friends] listFriends:', error.message);
    return [];
  }
  const rows = ((data ?? []) as FriendRow[]).filter((row) => {
    if (projectionIsClean(row as unknown as Record<string, unknown>)) return true;
    console.warn('[friends] projection guard rechazó una fila de list_friends (posible fuga)');
    return false;
  });
  return sortFriends(rows);
}

/** Pendientes {incoming, outgoing}, más recientes primero. */
export async function listPendingRequests(): Promise<SplitRequests> {
  const { data, error } = await supabase.rpc('list_pending_requests');
  if (error) {
    console.warn('[friends] listPendingRequests:', error.message);
    return { incoming: [], outgoing: [] };
  }
  return splitPendingRequests((data ?? []) as PendingRequestRow[]);
}

// ── Amistad / moderación ──────────────────────────────────────────────────────

export async function unfriend(targetUserId: string): Promise<SocialRpcCode> {
  const code = await socialRpc('unfriend', { p_target: targetUserId });
  if (code === 'unfriended') emitChanged();
  return code;
}

/** Bloquea y (server-side) rompe cualquier amistad/pending entre ambos. */
export async function blockUser(targetUserId: string): Promise<SocialRpcCode> {
  const code = await socialRpc('block_user', { p_target: targetUserId });
  if (code === 'blocked') emitChanged();
  return code;
}

export async function unblockUser(targetUserId: string): Promise<SocialRpcCode> {
  const code = await socialRpc('unblock_user', { p_target: targetUserId });
  if (code === 'unblocked') emitChanged();
  return code;
}

/**
 * ¿Yo bloqueé a este user? Lectura directa de user_blocks — la RLS (183) solo
 * expone las filas donde blocker = yo, así que no filtra nada ajeno.
 * (Si ÉL me bloqueó, el cliente NO lo sabe: el server lo trata como perfil
 * cerrado — anti-enumeración.)
 */
export async function isBlockedByMe(targetUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocked_id', targetUserId)
    .maybeSingle();
  if (error) {
    console.warn('[friends] isBlockedByMe:', error.message);
    return false;
  }
  return data != null;
}

export async function reportUser(
  targetUserId: string,
  reason: string,
  details?: string,
): Promise<SocialRpcCode> {
  if (!isValidReportReason(reason)) return 'invalid_reason';
  return socialRpc('report_user', {
    p_target: targetUserId,
    p_reason: reason,
    p_details: details ?? null,
  });
}

// ── Buscador con rate limit espejo ────────────────────────────────────────────

export interface GuardedSearchResult {
  results: UserSearchResult[];
  /** True si el guard LOCAL frenó la búsqueda (el server también limita a 20/60s). */
  rateLimited: boolean;
}

/** Historial local de búsquedas (ms epoch) para avisar ANTES de quemar la llamada. */
const searchTimestamps: number[] = [];

/**
 * search_users con espejo cliente del rate limit del servidor (20/60s). Si el
 * guard local dice que ya se excedió la ventana, NO llama al RPC y devuelve
 * rateLimited=true para que la UI muestre el mensaje suave.
 */
export async function searchUsersGuarded(query: string): Promise<GuardedSearchResult> {
  if (query.trim().length < 2) return { results: [], rateLimited: false };

  const now = Date.now();
  if (!isSearchAllowed(searchTimestamps, now)) {
    return { results: [], rateLimited: true };
  }
  searchTimestamps.push(now);
  // Poda del historial local (misma idea que la limpieza >1h del RPC).
  while (searchTimestamps.length > 0 && searchTimestamps[0] < now - 3_600_000) {
    searchTimestamps.shift();
  }

  const { data, error } = await supabase.rpc('search_users', { p_query: query });
  if (error) {
    console.warn('[friends] searchUsersGuarded:', error.message);
    return { results: [], rateLimited: false };
  }
  return { results: (data ?? []) as UserSearchResult[], rateLimited: false };
}
