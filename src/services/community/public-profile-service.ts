/**
 * Perfil público — I/O sobre user_profile_public + RPCs de la migración 178.
 * La lógica pura (proyección de visibilidad, validación de username) vive en
 * public-profile-core.ts (testeable). Este archivo hace red y emite eventos.
 *
 * Anti-fuga (defensa en profundidad): getPublicProfile pasa la respuesta por
 * projectionIsClean; si algún campo no whitelisteado apareciera, NO se devuelve.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import {
  applyVisibility,
  projectionIsClean,
  validateUsername,
  type PublicProfileRow,
  type VisiblePublicProfile,
} from './public-profile-core';
import { type VisibilityFlags } from '@/src/constants/community';

function emitChanged() {
  DeviceEventEmitter.emit('public_profile_changed');
}

/** Perfil público propio (fila completa + flags) para la pantalla de settings. */
export async function getMyPublicProfile(userId: string): Promise<PublicProfileRow | null> {
  const { data, error } = await supabase
    .from('user_profile_public')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[public-profile] getMyPublicProfile:', error.message);
    return null;
  }
  return (data as PublicProfileRow | null) ?? null;
}

/** Perfil público de OTRO user (vía RPC DEFINER; flags aplicados server-side). */
export async function getPublicProfile(targetUserId: string): Promise<VisiblePublicProfile | null> {
  const { data, error } = await supabase.rpc('get_public_profile', { p_target: targetUserId });
  if (error) {
    console.warn('[public-profile] getPublicProfile:', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  // Guard anti-fuga en runtime: nunca devolver algo con campos fuera del whitelist.
  if (!projectionIsClean(row as Record<string, unknown>)) {
    console.warn('[public-profile] projection guard rejected a row (posible fuga)');
    return null;
  }
  return row as VisiblePublicProfile;
}

export interface UserSearchResult {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  current_rank: number | null;
  streak_days: number | null;
}

/** Buscador de usuarios (solo perfiles discoverable). */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc('search_users', { p_query: query });
  if (error) {
    console.warn('[public-profile] searchUsers:', error.message);
    return [];
  }
  return (data ?? []) as UserSearchResult[];
}

/** Actualiza flags de visibilidad (update directo; RLS dueño-only lo permite). */
export async function updateVisibility(
  userId: string,
  flags: Partial<VisibilityFlags>,
): Promise<boolean> {
  const { error } = await supabase
    .from('user_profile_public')
    .update({ ...flags, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) {
    console.warn('[public-profile] updateVisibility:', error.message);
    return false;
  }
  emitChanged();
  return true;
}

export interface SetUsernameResult {
  ok: boolean;
  error?: string;
}

/** Valida y setea el username (maneja colisión de unicidad con mensaje claro). */
export async function setUsername(raw: string): Promise<SetUsernameResult> {
  const check = validateUsername(raw);
  if (!check.ok) return { ok: false, error: check.error };
  const { error } = await supabase.rpc('sync_public_profile', { p_username: check.normalized });
  if (error) {
    const dup = error.code === '23505' || /duplicate|unique/i.test(error.message);
    return { ok: false, error: dup ? 'Ese nombre de usuario ya está tomado' : error.message };
  }
  emitChanged();
  return { ok: true };
}

export interface SyncProfileInput {
  username?: string;
  displayName?: string;
  country?: string;
  chronotype?: string;
  streakDays?: number;
}

/** Upsert de la fila pública propia (identidad + streak; refresca rank/electrones). */
export async function syncPublicProfile(input: SyncProfileInput): Promise<boolean> {
  const { error } = await supabase.rpc('sync_public_profile', {
    p_username: input.username ?? null,
    p_display_name: input.displayName ?? null,
    p_country: input.country ?? null,
    p_chronotype: input.chronotype ?? null,
    p_streak_days: input.streakDays ?? null,
  });
  if (error) {
    console.warn('[public-profile] syncPublicProfile:', error.message);
    return false;
  }
  emitChanged();
  return true;
}

// Re-export de utilidades de proyección para las pantallas (vista pública propia).
export { applyVisibility };
