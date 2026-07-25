/**
 * Mobility service (MB-3.6 Bloque 2) — persistencia de la evaluación guiada.
 *
 * Tabla `mobility_assessments` (migración 036, RLS owner, UNIQUE user_id+date):
 * una evaluación por día — repetirla hoy la sobreescribe (upsert). La
 * comparación se hace contra la última evaluación ANTERIOR a hoy.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { overallMobilityScore, type MobilityInput } from './mobility-core';

export interface MobilityAssessmentRow extends MobilityInput {
  id: string;
  date: string;
  overall_score: number | null;
}

export interface SaveMobilityResult {
  ok: boolean;
  overall: number | null;
  error?: string;
}

/** Guarda la evaluación de HOY (upsert user_id+date) con el overall calculado. */
export async function saveMobilityAssessment(userId: string, input: MobilityInput): Promise<SaveMobilityResult> {
  const overall = overallMobilityScore(input);
  const { error } = await supabase.from('mobility_assessments').upsert({
    user_id: userId,
    date: getLocalToday(),
    ...input,
    overall_score: overall,
  }, { onConflict: 'user_id,date' });
  if (error) return { ok: false, overall, error: error.message };
  return { ok: true, overall };
}

/** Última evaluación ANTERIOR a hoy (para comparar sin compararse consigo mismo). */
export async function getPreviousMobilityAssessment(userId: string): Promise<MobilityAssessmentRow | null> {
  const { data, error } = await supabase
    .from('mobility_assessments')
    .select('*')
    .eq('user_id', userId)
    .lt('date', getLocalToday())
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as MobilityAssessmentRow;
}
