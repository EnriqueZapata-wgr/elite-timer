/**
 * Mood Share Service — I/O de la capa social de ánimo (MB-4 · Bloque 4).
 *
 * Escrituras del dueño van por RLS directa (mood_shares es suya); las lecturas
 * cross-user van EXCLUSIVAMENTE por los RPCs DEFINER de la mig 226
 * (get_friends_moods / react_to_mood), que validan amistad + blocks
 * server-side. Este servicio jamás toca emotional_checkins de terceros.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { buildSharePayload, type MoodReactionKind, type SharePayloadInput } from './mood-share-core';

export interface FriendMoodRow {
  share_id: string;
  other_user_id: string;
  friend_username: string | null;
  friend_display_name: string | null;
  friend_avatar_url: string | null;
  shared_quadrant: string;
  shared_emotion_label: string | null;
  shared_at: string;
  my_reaction: MoodReactionKind | null;
}

export interface MyShareRow {
  id: string;
  quadrant: string;
  emotion_label: string | null;
  created_at: string;
  /** Reacciones recibidas (solo tipos, sin identidad — cálido, no métrica). */
  reactions: MoodReactionKind[];
}

/** Comparte un check-in. Devuelve el id del share, o null si falló. */
export async function shareMood(input: SharePayloadInput): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const payload = buildSharePayload(input);
    const { data, error } = await supabase
      .from('mood_shares')
      .insert({ user_id: user.id, ...payload })
      .select('id')
      .single();
    if (error) {
      // 23505 = ya compartido (unique por checkin) — no es error para el usuario.
      if ((error as { code?: string }).code === '23505') {
        const { data: existing } = await supabase
          .from('mood_shares')
          .select('id')
          .eq('checkin_id', payload.checkin_id as string)
          .maybeSingle();
        return existing?.id ?? null;
      }
      throw error;
    }
    return data?.id ?? null;
  } catch (e) {
    logWarn('[mood-share] share failed', e);
    return null;
  }
}

/** Retira un share (privacidad: dejar de compartir es un derecho, no un flujo). */
export async function unshareMood(shareId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('mood_shares').delete().eq('id', shareId);
    if (error) throw error;
    return true;
  } catch (e) {
    logWarn('[mood-share] unshare failed', e);
    return false;
  }
}

/** Ánimo reciente de tus personas (RPC DEFINER, amistad + blocks server-side). */
export async function getFriendsMoods(): Promise<FriendMoodRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_friends_moods');
    if (error) throw error;
    return (data ?? []) as FriendMoodRow[];
  } catch (e) {
    logWarn('[mood-share] getFriendsMoods failed', e);
    return [];
  }
}

/** Reacción cálida (una por persona; repetir cambia el tipo). */
export async function reactToMood(shareId: string, kind: MoodReactionKind): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('react_to_mood', {
      p_share_id: shareId,
      p_kind: kind,
    });
    if (error) throw error;
    return (data as string) ?? 'error';
  } catch (e) {
    logWarn('[mood-share] react failed', e);
    return 'error';
  }
}

/** Mis shares de los últimos 7 días + reacciones recibidas (sin identidad). */
export async function getMyShares(): Promise<MyShareRow[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data, error } = await supabase
      .from('mood_shares')
      .select('id, quadrant, emotion_label, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    const shares = data ?? [];
    if (shares.length === 0) return [];

    const { data: reactions } = await supabase
      .from('mood_share_reactions')
      .select('share_id, kind')
      .in('share_id', shares.map((s: { id: string }) => s.id));
    const byShare = new Map<string, MoodReactionKind[]>();
    for (const r of reactions ?? []) {
      const arr = byShare.get(r.share_id) ?? [];
      arr.push(r.kind as MoodReactionKind);
      byShare.set(r.share_id, arr);
    }
    return shares.map((s: { id: string; quadrant: string; emotion_label: string | null; created_at: string }) => ({
      ...s,
      reactions: byShare.get(s.id) ?? [],
    }));
  } catch (e) {
    logWarn('[mood-share] getMyShares failed', e);
    return [];
  }
}
