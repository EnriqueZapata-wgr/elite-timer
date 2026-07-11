/**
 * Feed de actividad — núcleo PURO (sin react-native/supabase), testeable con
 * vitest. El I/O (insert de eventos propios + RPC get_friends_feed) vive en
 * feed-service.ts. La UI completa del feed es C3 futuro.
 *
 * Invariante anti-fuga: el ÚNICO emisor de payload es buildDayCompletePayload
 * (fecha + atp_score — cero clínico). isFeedEventAllowed espeja el CHECK de la
 * migración 193 (que a su vez espeja FEED_EVENT_TYPES).
 */
import {
  FEED_EVENT_TYPE_SET,
  FORBIDDEN_FEED_EVENTS,
  type FeedEventType,
} from '@/src/constants/community';

/** Campos permitidos en el payload de day_complete (whitelist estricta). */
export const DAY_COMPLETE_PAYLOAD_FIELDS = ['date', 'atp_score'] as const;

export interface DayCompletePayload {
  /** Fecha local YYYY-MM-DD (getLocalToday del caller). */
  date: string;
  /** Score del día (compliance_pct al cierre, 0-100). */
  atp_score: number;
}

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True si el tipo está en el whitelist Y no es un evento prohibido. */
export function isFeedEventAllowed(eventType: string): boolean {
  if (!FEED_EVENT_TYPE_SET.has(eventType)) return false;
  return !(FORBIDDEN_FEED_EVENTS as readonly string[]).includes(eventType);
}

/** True si compliance_pct significa "día completo" (100%). */
export function isDayComplete(compliancePct: number | null | undefined): boolean {
  return typeof compliancePct === 'number' && Number.isFinite(compliancePct) && compliancePct >= 100;
}

/**
 * Construye el payload NO-clínico de day_complete. Devuelve null si la fecha o
 * el score son inválidos (el caller no emite nada en ese caso — fail-soft).
 */
export function buildDayCompletePayload(
  date: string,
  atpScore: number,
): DayCompletePayload | null {
  if (!LOCAL_DATE_RE.test(date)) return null;
  if (!Number.isFinite(atpScore) || atpScore < 0 || atpScore > 100) return null;
  return { date, atp_score: Math.round(atpScore) };
}

/**
 * Guard anti-fuga del payload de day_complete: SOLO keys de la whitelist.
 * (Defensa en profundidad — el emisor tipado ya lo garantiza.)
 */
export function dayCompletePayloadIsClean(payload: Record<string, unknown>): boolean {
  const allowed = new Set<string>(DAY_COMPLETE_PAYLOAD_FIELDS);
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) return false;
  }
  return true;
}

/** Fila que devuelve el RPC get_friends_feed (proyección pública, mig 193). */
export interface FriendFeedRow {
  event_id: string;
  friend_user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  event_type: FeedEventType;
  event_date: string;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Filtra filas del feed con event_type fuera del whitelist (defensa en
 * profundidad: el CHECK de la 193 ya lo impide a nivel DB).
 */
export function filterAllowedFeedRows(rows: FriendFeedRow[]): FriendFeedRow[] {
  return rows.filter((r) => isFeedEventAllowed(r.event_type));
}
