/**
 * Health Measurement Service — CRUD de mediciones de salud del usuario.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';

export interface HealthMeasurement {
  id?: string;
  user_id?: string;
  date: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  visceral_fat: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  neck_cm: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  resting_hr: number | null;
  grip_strength_kg: number | null;
  energy_level: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  mood_level: number | null;
  sleep_hours: number | null;
  steps_daily: number | null;
  exercise_min_weekly: number | null;
  vo2max_estimate: number | null;
}

const FIELDS = [
  'weight_kg', 'height_cm', 'body_fat_pct', 'muscle_mass_kg', 'visceral_fat',
  'waist_cm', 'hip_cm', 'neck_cm',
  'systolic_bp', 'diastolic_bp', 'resting_hr',
  'grip_strength_kg',
  'energy_level', 'sleep_quality', 'stress_level', 'mood_level',
  'sleep_hours',
  'steps_daily', 'exercise_min_weekly', 'vo2max_estimate',
];

/** Obtener la medición más reciente */
export async function getLatestMeasurement(userId: string): Promise<HealthMeasurement | null> {
  const { data } = await supabase
    .from('health_measurements').select('*')
    .eq('user_id', userId).order('date', { ascending: false }).limit(1).single();
  return data as HealthMeasurement | null;
}

/** Guardar o actualizar medición del día */
export async function saveMeasurement(userId: string, data: Partial<HealthMeasurement>): Promise<HealthMeasurement> {
  const today = getLocalToday();
  const payload: Record<string, any> = { user_id: userId, date: today, updated_at: new Date().toISOString() };
  for (const field of FIELDS) {
    if ((data as any)[field] !== undefined) payload[field] = (data as any)[field];
  }

  const { data: result, error } = await supabase
    .from('health_measurements')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select().single();

  if (error) throw error;
  return result as HealthMeasurement;
}

/** Contar secciones completas (de 7) */
export function countCompleteSections(m: HealthMeasurement | null): { complete: number; total: number } {
  if (!m) return { complete: 0, total: 7 };
  let c = 0;
  if (m.weight_kg || m.body_fat_pct || m.muscle_mass_kg || m.visceral_fat) c++;
  if (m.waist_cm || m.hip_cm || m.neck_cm) c++;
  if (m.systolic_bp || m.diastolic_bp || m.resting_hr) c++;
  if (m.grip_strength_kg) c++;
  if (m.energy_level || m.sleep_quality || m.stress_level || m.mood_level) c++;
  if (m.sleep_hours) c++;
  if (m.steps_daily || m.exercise_min_weekly || m.vo2max_estimate) c++;
  return { complete: c, total: 7 };
}

/** Obtener historial de mediciones */
export async function getMeasurementHistory(userId: string, limit = 30): Promise<HealthMeasurement[]> {
  const { data } = await supabase
    .from('health_measurements').select('*')
    .eq('user_id', userId).order('date', { ascending: false }).limit(limit);
  return (data ?? []) as HealthMeasurement[];
}
