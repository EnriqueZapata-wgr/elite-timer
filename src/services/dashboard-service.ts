/**
 * Dashboard Service — Datos consolidados para la pantalla Yo.
 */
import { supabase } from '@/src/lib/supabase';
import { getLatestScore } from './health-score-service';
import { getUserChronotype, type ChronotypeData } from './quiz-service';
import type { HealthScore } from '@/src/data/functional-health-engine';

export interface DashboardData {
  profile: {
    full_name: string;
    email: string;
    created_at: string;
  } | null;
  chronotype: ChronotypeData | null;
  healthScore: HealthScore | null;
  composition: {
    weight_kg: number | null;
    body_fat_pct: number | null;
    muscle_mass_pct: number | null;
    visceral_fat: number | null;
    measured_at: string | null;
  } | null;
  chronologicalAge: number | null;
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user.id;
}

export async function getDashboardData(): Promise<DashboardData> {
  const userId = await getUserId();

  const [profileRes, bodyRes, chronotype, healthScore] = await Promise.all([
    supabase.from('profiles').select('full_name, email, created_at').eq('id', userId).single(),
    supabase.from('body_measurements').select('weight_kg, body_fat_pct, muscle_mass_pct, visceral_fat, measured_at')
      .eq('user_id', userId).order('measured_at', { ascending: false }).limit(1).single(),
    getUserChronotype().catch(() => null),
    getLatestScore(userId).catch(() => null),
  ]);

  // Edad cronológica desde client_profiles
  let chronologicalAge: number | null = null;
  const { data: cp } = await supabase.from('client_profiles').select('date_of_birth').eq('user_id', userId).single();
  if (cp?.date_of_birth) {
    chronologicalAge = Math.floor((Date.now() - new Date(cp.date_of_birth).getTime()) / 31557600000);
  }

  return {
    profile: profileRes.data,
    chronotype,
    healthScore,
    composition: bodyRes.data ?? null,
    chronologicalAge,
  };
}
