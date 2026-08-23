/**
 * Capture service — persistencia de los datos de captura manual (Sprint 2).
 * Funciones puras de escritura a las tablas edad_atp_* (testeables con mock).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { insertCanonicalBiomarkers, insertLabValuesFromRaw } from './lab-values-service';

export type SaveResult = { ok: boolean; error?: string };

/**
 * Inserta una nueva fila en lab_results (la tabla canónica de labs) con lab_date
 * = hoy y status 'draft'. `values` mapea columna→valor (ya en nombres de columna
 * de lab_results: glucose, creatinine, pcr, cholesterol_total, t3_free, etc.).
 * Así los datos de Edad ATP alimentan el mismo expediente médico que el pilar Salud.
 */
export async function saveLabResults(
  userId: string,
  values: Record<string, number>,
  /** Fecha del estudio. Si no viene, hoy: es captura del momento. */
  fechaEstudio?: string,
): Promise<SaveResult> {
  if (Object.keys(values).length === 0) return { ok: true };
  const fecha = fechaEstudio || getLocalToday();
  const { error } = await supabase.from('lab_results').insert({
    user_id: userId,
    lab_date: fecha,
    status: 'draft',
    lab_name: 'Edad ATP (captura manual)',
    ...values,
  });
  if (error) {
    logWarn('[edad-atp capture] saveLabResults failed:', error);
    return { ok: false, error: error.message };
  }
  // Espejo a la fuente única `lab_values`. `values` está en columnas inglesas
  // de lab_results → toCanonicalEntries las mapea a claves de matriz y convierte unidades.
  //
  // 22-ago: el resultado de esta escritura se tiraba. Si fallaba, la pantalla
  // decía "guardado" igual y el motor se quedaba sin el dato.
  const esp = await insertLabValuesFromRaw(userId, values, { source: 'form', measuredAt: fecha });
  if (!esp.ok) {
    logWarn('[edad-atp capture] el espejo a lab_values falló:', esp.error);
    return { ok: false, error: esp.error ?? 'No se pudieron guardar los valores.' };
  }
  return { ok: true };
}

export type BiomarkerEntry = { key: string; value: number; unit: string };

/**
 * Inserta una fila por biomarcador capturado a mano.
 *
 * 22-ago-2026 — LA FECHA DEJA DE SER SIEMPRE HOY.
 *
 * Se estampaba `new Date()` sin preguntar, así que un estudio de marzo tecleado
 * en agosto entraba como si fuera de agosto. Eso no es un detalle de
 * presentación: `measured_at` es lo que ordena la serie del parámetro y lo que
 * decide qué valor es el vigente. Un estudio viejo capturado a mano pisaba al
 * reciente y la Edad ATP se calculaba con el dato equivocado.
 *
 * Y el resultado del espejo a lab_values se tiraba: si fallaba, esta función
 * devolvía ok igual.
 */
export async function saveBiomarkers(
  userId: string,
  entries: BiomarkerEntry[],
  /** Fecha del estudio en AAAA-MM-DD. Si no viene, hoy. */
  fechaEstudio?: string,
): Promise<SaveResult> {
  const fecha = fechaEstudio || getLocalToday();
  const rows = entries.map((e) => ({
    user_id: userId,
    biomarker_key: e.key,
    value: e.value,
    unit: e.unit,
    source: 'manual',
    measured_at: fecha,
  }));
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from('edad_atp_biomarkers').insert(rows);
  if (error) {
    logWarn('[edad-atp capture] saveBiomarkers failed:', error);
    return { ok: false, error: error.message };
  }
  // Espejo a la fuente única `lab_values` (source 'manual'). biomarker_key ya es clave
  // canónica (de matriz / PhenoAge); insertCanonicalBiomarkers convierte las unidades pct.
  //
  // escritoPorHumano: una persona tecleando su hoja es la autoridad sobre su
  // propio dato y puede corregir lo que sea. La PROTECCIÓN contra parsers se
  // pone abajo, y solo sobre el valor que de verdad cae fuera del rango
  // clínico: es la excepción que Enrique preguntó el 21-ago. Marcar todo lo
  // capturado a mano como intocable dejaba al PDF sin poder corregir nada.
  const esp = await insertCanonicalBiomarkers(
    userId,
    entries.map((e) => ({ parameter_key: e.key, value: e.value, unit: e.unit })),
    { source: 'manual', measuredAt: fecha, escritoPorHumano: true },
  );
  if (!esp.ok) {
    logWarn('[edad-atp capture] el espejo a lab_values falló:', esp.error);
    return { ok: false, error: esp.error ?? 'No se pudieron guardar los valores.' };
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

/**
 * Lee el extracted_data más reciente (lab_uploads) y lo aplana a key→valor.
 * Soporta shape nested { values: { k: { value } } } y flat { k: value }.
 */
export async function getLatestExtractedData(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('lab_uploads')
    .select('extracted_data')
    .eq('user_id', userId)
    .not('extracted_data', 'is', null)
    .order('uploaded_at', { ascending: false })
    .limit(1);
  if (error) { logWarn('[edad-atp capture] getLatestExtractedData failed:', error); return {}; }
  const raw = (data ?? [])[0]?.extracted_data;
  const ev = raw?.values ?? raw;
  const out: Record<string, number> = {};
  if (ev && typeof ev === 'object') {
    for (const [k, v] of Object.entries(ev)) {
      const val = typeof v === 'number' ? v : (v as any)?.value;
      if (typeof val === 'number' && Number.isFinite(val)) out[k] = val;
    }
  }
  return out;
}

/**
 * Coalesce de filas de health_measurements (ordenadas DESC por fecha): para cada
 * columna toma el valor no-null MÁS RECIENTE. Antes se leía SOLO la última fila y
 * cualquier upsert posterior de otra métrica "borraba" para la lectura los valores
 * de días previos (bug B1/B6 del smoke 2026-06-11: VO2max del Cooper desaparecía al
 * guardar peso otro día; MEDICIONES "hace 0d" con campos vacíos).
 * `date` queda la de la fila más reciente (badge de frescura).
 */
export function coalesceHealthRows(rows: Record<string, any>[]): Record<string, any> | null {
  if (!rows.length) return null;
  const out: Record<string, any> = {};
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (v != null && out[k] === undefined) out[k] = v;
    }
  }
  return out;
}

/** Filas a leer para el coalesce (suficiente histórico sin cargar la tabla entera). */
export const HEALTH_COALESCE_ROWS = 30;

/** Lee la medición de salud del usuario (coalesce por columna, para pre-poblar). */
export async function getLatestHealthMeasurement(userId: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('health_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(HEALTH_COALESCE_ROWS);
  if (error) { logWarn('[edad-atp capture] getLatestHealthMeasurement failed:', error); return null; }
  return coalesceHealthRows((data ?? []) as Record<string, any>[]);
}

export type HealthMeasurementInput = {
  weight_kg?: number; height_cm?: number; body_fat_pct?: number;
  muscle_mass_kg?: number; visceral_fat?: number; grip_strength_kg?: number;
  systolic_bp?: number; diastolic_bp?: number; resting_hr?: number; vo2max_estimate?: number;
  waist_cm?: number; // columna existente (la lee loadUserData) — captura inline drill-down
  hip_cm?: number;   // captura de cadera → ratio cintura/cadera (Mariana #13)
  arm_cm?: number;   // MB-27 P1 (mig 256): medidas que solo tenía body_measurements
  leg_cm?: number;
  chest_cm?: number;
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

// F6 (#26): saveBodyComposition + BodyCompositionInput ELIMINADOS — deprecated
// desde Sprint 2.5 y sin importadores (la escritura va a health_measurements vía
// saveHealthMeasurement). OJO: loadUserData sigue LEYENDO edad_atp_body_composition
// como fallback de datos Sprint 2 — la TABLA no se toca (sin migración destructiva).

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
  // Idempotente por dominio: borra respuestas previas antes de reinsertar (permite editar).
  await supabase.from('edad_atp_questionnaire_responses').delete().eq('user_id', userId).eq('domain', domain);
  const { error } = await supabase.from('edad_atp_questionnaire_responses').insert(rows);
  if (error) {
    logWarn('[edad-atp capture] saveQuestionnaireResponses failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Lee los tests funcionales más recientes por test_key. */
export async function getLatestFunctionalTests(userId: string): Promise<Record<string, { value: number; measured_at: string }>> {
  const { data, error } = await supabase
    .from('edad_atp_functional_tests')
    .select('test_key, value_primary, measured_at')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false });
  if (error) { logWarn('[edad-atp capture] getLatestFunctionalTests failed:', error); return {}; }
  const out: Record<string, { value: number; measured_at: string }> = {};
  for (const r of (data ?? []) as any[]) {
    if (out[r.test_key] === undefined && r.value_primary != null) out[r.test_key] = { value: r.value_primary, measured_at: r.measured_at };
  }
  return out;
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
  // Economía: test_completed NO se cablea aquí. capture-service es importado por ~13 tests
  // edad-atp; arrastrar electron-award-client (→ react-native) rompía su colección en Vitest.
  // El award de test_completed se cablea a nivel PANTALLA (deferido, FLAG en COWORK_REPORT);
  // la infra (regla + Edge Function + cap semanal) ya está lista.
  return { ok: true };
}
