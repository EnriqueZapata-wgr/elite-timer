/**
 * Daily Habits Service — Mapa de hábitos diarios del paciente.
 */
import { supabase } from '@/src/lib/supabase';

export interface DailyHabit {
  id: string;
  user_id: string;
  consultation_id: string | null;
  start_time: string; // HH:MM:SS
  end_time: string;
  title: string;
  category: string;
  notes: string | null;
  is_current: boolean;
}

export const HABIT_CATEGORIES: Record<string, { label: string; color: string }> = {
  sleep: { label: 'Sueño', color: '#5B9BD5' },
  meal: { label: 'Comida', color: '#5DCAA5' },
  work: { label: 'Trabajo', color: '#888780' },
  exercise: { label: 'Ejercicio', color: '#a8e02a' },
  commute: { label: 'Traslado', color: '#B4B2A9' },
  screen: { label: 'Pantallas', color: '#E24B4A' },
  social: { label: 'Social', color: '#D4537E' },
  hygiene: { label: 'Higiene', color: '#E0E0E0' },
  supplement: { label: 'Suplementos', color: '#1D9E75' },
  relaxation: { label: 'Relajación', color: '#7F77DD' },
  other: { label: 'Otro', color: '#666666' },
};

export async function getClientHabits(userId: string): Promise<DailyHabit[]> {
  const { data, error } = await supabase
    .from('client_daily_habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('start_time');
  if (error) throw error;
  return (data ?? []) as DailyHabit[];
}

export async function addHabit(userId: string, habit: {
  start_time: string; end_time: string; title: string; category: string;
  notes?: string; consultation_id?: string;
}): Promise<void> {
  const { error } = await supabase.from('client_daily_habits').insert({
    user_id: userId, ...habit,
  });
  if (error) throw error;
}

export async function updateHabit(habitId: string, data: Partial<DailyHabit>): Promise<void> {
  const { error } = await supabase.from('client_daily_habits').update(data).eq('id', habitId);
  if (error) throw error;
}

export async function deleteHabit(habitId: string): Promise<void> {
  const { error } = await supabase.from('client_daily_habits').delete().eq('id', habitId);
  if (error) throw error;
}
