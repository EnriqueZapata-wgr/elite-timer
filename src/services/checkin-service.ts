/**
 * Check-in Service — Registro y consulta de check-ins emocionales.
 */
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { QuadrantKey } from '@/src/data/emotions-library';

async function getAuthenticatedUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

/**
 * Puerta por la que se llegó a la palabra (MB-10 · Track E). Todas las puertas
 * escriben EL MISMO registro; esto solo etiqueta el camino:
 *  rueda · cuerpo · mapa (exploración) · busqueda · recheck (post-herramienta).
 */
export type CheckinEntryGate = 'rueda' | 'cuerpo' | 'mapa' | 'busqueda' | 'recheck';

export interface CheckinData {
  quadrant: QuadrantKey;
  emotions: string[];
  energy_level?: number;
  pleasantness?: number;
  context_where?: string;
  context_who?: string;
  context_doing?: string;
  note?: string;
  /** Requiere migración 238 (columna entry_gate). */
  entry_gate?: CheckinEntryGate;
}

export interface CheckinRecord {
  id: string;
  quadrant: QuadrantKey;
  emotions: string[];
  context_where: string | null;
  context_who: string | null;
  context_doing: string | null;
  note: string | null;
  created_at: string;
}

/**
 * Guarda el check-in y devuelve su id (MB-4 Bloque 4: el share opt-in del
 * cierre lo necesita para ligar mood_shares.checkin_id — cascada de borrado).
 *
 * Track E (MB-10): si el remoto aún no tiene la columna entry_gate (mig 238
 * sin aplicar — gotcha de columna fantasma con 400), se reintenta SIN la
 * puerta: perder la etiqueta jamás puede costar el check-in.
 */
export async function saveCheckin(data: CheckinData): Promise<string | null> {
  const user = await getAuthenticatedUser();
  const { data: row, error } = await supabase
    .from('emotional_checkins')
    .insert({ user_id: user.id, ...data })
    .select('id')
    .single();
  if (error) {
    const ghostColumn = data.entry_gate != null &&
      (error.code === 'PGRST204' || error.code === '42703' || /entry_gate/.test(error.message ?? ''));
    if (!ghostColumn) throw error;
    const { entry_gate: _gate, ...rest } = data;
    const retry = await supabase
      .from('emotional_checkins')
      .insert({ user_id: user.id, ...rest })
      .select('id')
      .single();
    if (retry.error) throw retry.error;
    return retry.data?.id ?? null;
  }
  return row?.id ?? null;
}

export async function getTodayCheckins(): Promise<CheckinRecord[]> {
  const user = await getAuthenticatedUser();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('emotional_checkins')
    .select('id, quadrant, emotions, context_where, context_who, context_doing, note, created_at')
    .eq('user_id', user.id)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRecentCheckins(days = 7): Promise<CheckinRecord[]> {
  const user = await getAuthenticatedUser();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('emotional_checkins')
    .select('id, quadrant, emotions, context_where, context_who, context_doing, note, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
