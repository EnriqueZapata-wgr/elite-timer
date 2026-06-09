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

/** Lee los biomarcadores manuales (edad_atp_biomarkers) más recientes por key. */
export async function getManualBiomarkers(userId: string): Promise<Record<string, { value: number; measured_at: string }>> {
  const { data, error } = await supabase
    .from('edad_atp_biomarkers')
    .select('biomarker_key, value, measured_at')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false });
  if (error) { logWarn('[edad-atp capture] getManualBiomarkers failed:', error); return {}; }
  const out: Record<string, { value: number; measured_at: string }> = {};
  for (const r of (data ?? []) as any[]) {
    if (out[r.biomarker_key] === undefined && r.value != null) out[r.biomarker_key] = { value: r.value, measured_at: r.measured_at };
  }
  return out;
}

/** Lee la medición de salud más reciente del usuario (para pre-poblar). */
export async function getLatestHealthMeasurement(userId: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('health_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1);
  if (error) { logWarn('[edad-atp capture] getLatestHealthMeasurement failed:', error); return null; }
  return (data ?? [])[0] ?? null;
}

export type HealthMeasurementInput = {
  weight_kg?: number; height_cm?: number; body_fat_pct?: number;
  muscle_mass_kg?: number; visceral_fat?: number; grip_strength_kg?: number;
  systolic_bp?: number; diastolic_bp?: number; resting_hr?: number; vo2max_estimate?: number;
};

/**
 * Upsert de la medición de salud de HOY en health_measurements (tabla canónica de
 * composición/vitals). UNIQUE(user_id, date) → re-guardar el mismo día actualiza la
 * fila; columnas no incluidas conservan su valor. Edad ATP comparte expediente con Salud.
 */
export async function saveHealthMeasurement(userId: string, fields: HealthMeasurementInput): Promise<SaveResult> {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(clean).length === 0) return { ok: true };
  const { error } = await supabase
    .from('health_measurements')
    .upsert({ user_id: userId, date: getLocalToday(), source: 'edad_atp', ...clean }, { onConflict: 'user_id,date' });
  if (error) {
    logWarn('[edad-atp capture] saveHealthMeasurement failed:', error);
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

/**
 * @deprecated Sprint 2.5 — la composición ahora se escribe a health_measurements
 * (tabla canónica) vía saveHealthMeasurement. Esta función ya NO se usa por las
 * pantallas; se conserva solo por compatibilidad. loadUserData sigue LEYENDO de
 * edad_atp_body_composition como fallback para datos generados en Sprint 2.
 * TODO: deprecate edad_atp_body_composition table en sprint futuro (sin migración
 * destructiva — los datos existentes se mantienen leíbles).
 */
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
