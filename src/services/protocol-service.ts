/**
 * Protocol Service — Timeline diario del protocolo del usuario.
 *
 * Consulta las actividades programadas para hoy y permite
 * marcar/desmarcar completadas.
 */
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';

// === AUTH ===

async function getAuthenticatedUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

// === TYPES ===

export interface TimelineItem {
  item_id: string;
  protocol_name: string;
  scheduled_time: string;      // "HH:MM:SS"
  duration_minutes: number | null;
  category: string;
  title: string;
  description: string | null;
  accent_color: string;
  link_type: string | null;
  link_routine_id: string | null;
  link_url: string | null;
  is_completed: boolean;
  completed_at: string | null;
}

export interface CompletionStats {
  total: number;
  completed: number;
  percentage: number;
}

// === CATEGORÍA LABELS E ICONOS ===

export const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  fitness: { label: 'Fitness', icon: 'barbell-outline' },
  nutrition: { label: 'Nutrición', icon: 'restaurant-outline' },
  supplements: { label: 'Suplementos', icon: 'medical-outline' },
  habits: { label: 'Hábitos', icon: 'sunny-outline' },
  recovery: { label: 'Recuperación', icon: 'heart-outline' },
  mind: { label: 'Mente', icon: 'brain-outline' },
  sleep: { label: 'Sueño', icon: 'moon-outline' },
};

// === QUERIES ===

/** Obtiene el timeline completo de hoy */
export async function getTodayTimeline(): Promise<TimelineItem[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('get_today_timeline', {
    p_user_id: user.id,
  });
  if (error) throw error;
  return (data ?? []) as TimelineItem[];
}

/** Toggle completar/descompletar un item */
export async function toggleCompletion(itemId: string): Promise<boolean> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('toggle_protocol_completion', {
    p_user_id: user.id,
    p_item_id: itemId,
  });
  if (error) throw error;
  return data as boolean;
}

/** Stats de completados del día actual */
export function getCompletionStats(items: TimelineItem[]): CompletionStats {
  const total = items.length;
  const completed = items.filter(i => i.is_completed).length;
  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
