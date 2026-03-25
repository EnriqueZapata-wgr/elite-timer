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

export interface CheckinData {
  quadrant: QuadrantKey;
  emotions: string[];
  energy_level?: number;
  pleasantness?: number;
  context_where?: string;
  context_who?: string;
  context_doing?: string;
  note?: string;
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

export async function saveCheckin(data: CheckinData): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase.from('emotional_checkins').insert({
    user_id: user.id,
    ...data,
  });
  if (error) throw error;
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
