/**
 * Capture service — persistencia de los datos de captura manual (Sprint 2).
 * Funciones puras de escritura a las tablas edad_atp_* (testeables con mock).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';

export type SaveResult = { ok: boolean; error?: string };

/**
 * Inserta una nueva fila en lab_results (la tabla canónica de labs) con lab_date
 * = hoy y status 'draft'. `values` mapea columna→valor (ya en nombres de columna
 * de lab_results: glucose, creatinine, pcr, cholesterol_total, t3_free, etc.).
 * Así los datos de Edad ATP alimentan el mismo expediente médico que el pilar Salud.
 */
export async function saveLabResults(userId: string, values: Record<string, number>): Promise<SaveResult> {
  if (Object.keys(values).length === 0) return { ok: true };
  const { error } = await supabase.from('lab_results').insert({
    user_id: userId,
    lab_date: getLocalToday(),
    status: 'draft',
    lab_name: 'Edad ATP (captura manual)',
    ...values,
  });
  if (error) {
    logWarn('[edad-atp capture] saveLabResults failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type BiomarkerEntry = { key: string; value: number; unit: string };

/** Inserta una fila por biomarcador (source 'manual', measured_at now). */
export async function saveBiomarkers(userId: string, entries: BiomarkerEntry[]): Promise<SaveResult> {
  const rows = entries.map((e) => ({
    user_id: userId,
    biomarker_key: e.key,
    value: e.value,
    unit: e.unit,
    source: 'manual',
    measured_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from('edad_atp_biomarkers').insert(rows);
  if (error) {
    logWarn('[edad-atp capture] saveBiomarkers failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type BodyCompositionInput = {
  weight_kg?: number;
  height_cm?: number;
  body_fat_pct?: number;
  skeletal_muscle_pct?: number;
  visceral_fat?: number;
  grip_strength_kg?: number;
  ffmi?: number;
};

/** Inserta una fila de composición corporal (source 'manual'). */
export async function saveBodyComposition(userId: string, comp: BodyCompositionInput): Promise<SaveResult> {
  const { error } = await supabase.from('edad_atp_body_composition').insert({
    user_id: userId,
    ...comp,
    source: 'manual',
    measured_at: new Date().toISOString(),
  });
  if (error) {
    logWarn('[edad-atp capture] saveBodyComposition failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type QuestionnaireResponse = { parameter_key: string; value?: number; value_text?: string };

/** Inserta las respuestas de un cuestionario de dominio (una fila por parámetro). */
export async function saveQuestionnaireResponses(
  userId: string,
  domain: string,
  responses: QuestionnaireResponse[],
): Promise<SaveResult> {
  const rows = responses.map((r) => ({
    user_id: userId,
    domain,
    parameter_key: r.parameter_key,
    value: r.value ?? null,
    value_text: r.value_text ?? null,
    measured_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from('edad_atp_questionnaire_responses').insert(rows);
  if (error) {
    logWarn('[edad-atp capture] saveQuestionnaireResponses failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type FunctionalTestEntry = { test_key: string; value_primary: number; value_secondary?: number };

/** Inserta resultados de tests funcionales (una fila por test). */
export async function saveFunctionalTests(userId: string, entries: FunctionalTestEntry[]): Promise<SaveResult> {
  const rows = entries.map((e) => ({
    user_id: userId,
    test_key: e.test_key,
    value_primary: e.value_primary,
    value_secondary: e.value_secondary ?? null,
    measured_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from('edad_atp_functional_tests').insert(rows);
  if (error) {
    logWarn('[edad-atp capture] saveFunctionalTests failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
