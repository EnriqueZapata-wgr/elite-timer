/**
 * Share Service — Compartir rutinas por link.
 *
 * Flujo:
 *   1. Creator llama shareRoutine(routineId) → obtiene link con share_code
 *   2. Receptor abre link → getShareInfo(code) → preview
 *   3. Receptor llama cloneFromShare(code) → rutina clonada en su biblioteca
 */
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';

const SHARE_BASE_URL = 'https://enriquezapata.com.mx/r';

// === AUTH HELPER ===

async function getAuthenticatedUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

// === TYPES ===

export interface ShareInfo {
  share_code: string;
  routine_name: string;
  routine_mode: string;
  creator_name: string;
  block_count: number;
  times_cloned: number;
  created_at: string;
}

// === FUNCIONES ===

/**
 * Crea (o recupera) un share link para una rutina.
 * Retorna el link completo listo para compartir.
 */
export async function shareRoutine(routineId: string): Promise<string> {
  await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('create_routine_share', {
    p_routine_id: routineId,
  });
  if (error) throw new Error(error.message);
  const code = data as string;
  return `${SHARE_BASE_URL}/${code}`;
}

/**
 * Clona una rutina desde un share code.
 * Retorna el ID de la nueva rutina.
 */
export async function cloneFromShare(shareCode: string): Promise<string> {
  await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('clone_from_share', {
    p_share_code: shareCode,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Obtiene info de preview de una rutina compartida (sin necesidad de auth).
 * Consulta routine_shares + routines + blocks + profiles.
 */
export async function getShareInfo(shareCode: string): Promise<ShareInfo | null> {
  // Obtener el share
  const { data: share, error: shareError } = await supabase
    .from('routine_shares')
    .select('routine_id, creator_id, share_code, times_cloned, created_at')
    .eq('share_code', shareCode)
    .single();

  if (shareError || !share) return null;

  // Obtener la rutina (nombre, modo)
  const { data: routine } = await supabase
    .from('routines')
    .select('name, mode')
    .eq('id', share.routine_id)
    .single();

  // Contar bloques
  const { count } = await supabase
    .from('blocks')
    .select('id', { count: 'exact', head: true })
    .eq('routine_id', share.routine_id);

  // Obtener nombre del creador
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', share.creator_id)
    .single();

  return {
    share_code: share.share_code,
    routine_name: routine?.name ?? 'Rutina',
    routine_mode: routine?.mode ?? 'timer',
    creator_name: profile?.full_name ?? 'Usuario',
    block_count: count ?? 0,
    times_cloned: share.times_cloned,
    created_at: share.created_at,
  };
}
