/**
 * Feed de actividad — I/O (Comunidad V1.1 §2.4).
 *
 * Escritura: el DUEÑO inserta sus propios eventos en activity_feed (la RLS de
 * la migración 193 lo permite; el CHECK del event_type rechaza cualquier cosa
 * fuera del whitelist a nivel DB). Idempotente por (user_id, event_date) para
 * day_complete: el UNIQUE parcial hace que un re-emit del mismo día sea no-op
 * (se traga el 23505).
 *
 * Lectura de amigos: SOLO vía RPC get_friends_feed (SECURITY DEFINER —
 * friendships accepted + user_profile_public, proyección pública). La UI del
 * feed completo es C3 futuro; este service ya queda listo para esa pantalla.
 */
import { supabase } from '@/src/lib/supabase';
import {
  buildDayCompletePayload,
  filterAllowedFeedRows,
  isFeedEventAllowed,
  type FriendFeedRow,
} from './feed-core';

const DUPLICATE_KEY = '23505'; // unique_violation → emit idempotente, no es error

/**
 * Emite day_complete al feed (fire-and-forget seguro: jamás lanza).
 * Se llama al detectar compliance_pct = 100 (protocol-builder toggleAction).
 */
export async function emitDayComplete(
  userId: string,
  date: string,
  atpScore: number,
): Promise<void> {
  try {
    if (!userId || !isFeedEventAllowed('day_complete')) return;
    const payload = buildDayCompletePayload(date, atpScore);
    if (!payload) return;

    const { error } = await supabase.from('activity_feed').insert({
      user_id: userId,
      event_type: 'day_complete',
      event_date: payload.date,
      payload,
    });
    if (error && error.code !== DUPLICATE_KEY) {
      console.warn('[feed] emitDayComplete:', error.message);
    }
  } catch (e) {
    console.warn('[feed] emitDayComplete threw:', e);
  }
}

/** Eventos de amigos (accepted, show_activity on), más recientes primero. */
export async function getFriendsFeed(): Promise<FriendFeedRow[]> {
  const { data, error } = await supabase.rpc('get_friends_feed');
  if (error) {
    console.warn('[feed] getFriendsFeed:', error.message);
    return [];
  }
  return filterAllowedFeedRows((data ?? []) as FriendFeedRow[]);
}
