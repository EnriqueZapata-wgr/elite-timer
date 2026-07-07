/**
 * lab-values-service — lectura/escritura de la time-series canónica `lab_values`.
 *
 * `lab_values` es la ÚNICA fuente de verdad de labs (migración 072). Reemplaza las 3
 * fuentes paralelas con `limit(1)` (lab_results / lab_uploads.extracted_data /
 * edad_atp_biomarkers) que descartaban datos: un panel parcial nuevo borraba glucosa/
 * tiroides de paneles anteriores. Aquí:
 *   - lectura: ÚLTIMO valor por `parameter_key` (más reciente por `measured_at`), ignorando
 *     `is_voided`. Cada parámetro toma su propio valor más nuevo aunque sean de fechas
 *     distintas (regla de recencia #1.2). Valor > STALE_DAYS → `is_stale=true` (flag, NO se
 *     descarta).
 *   - escritura: append-only (INSERT, nunca UPDATE destructivo). Conversión de unidad UNA
 *     vez aquí (borde de escritura).
 *   - void: marcar `is_voided=true` por `upload_id` (deshacer archivo malo sin borrar otros).
 *
 * Funciones puras (`dedupeLatestByKey`, `bridgeToPhenoAge`) testeables sin Supabase.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import {
  STALE_DAYS,
  toCanonicalEntries,
  toCanonicalUnit,
  canonicalParameterKey,
  PHENOAGE_FIELD_TO_CANONICAL,
  decimalToPct,
} from '@/src/constants/lab-canonical-map';

export type LabValueSource = 'lab_pdf' | 'manual' | 'upload_extract' | 'wearable' | 'form';

export interface LabValueRow {
  parameter_key: string;
  value: number;
  unit: string | null;
  measured_at: string; // YYYY-MM-DD
  source: LabValueSource;
  is_voided?: boolean;
}

/** Valor canónico resuelto para un parámetro: el más reciente + metadatos de procedencia. */
export interface CanonicalValue {
  value: number;
  measured_at: string;
  source: LabValueSource;
  is_stale: boolean;
}

export type CanonicalMap = Record<string, CanonicalValue>;

/** Días entre dos fechas YYYY-MM-DD (a - b). Negativo si a < b. */
function daysBetween(aISO: string, bISO: string): number {
  const a = parseLocalDate(aISO).getTime();
  const b = parseLocalDate(bISO).getTime();
  return Math.round((a - b) / 86_400_000);
}

/**
 * Núcleo PURO: dado el set de filas de `lab_values` (ya filtradas is_voided=false),
 * devuelve el valor MÁS RECIENTE por `parameter_key` con flag de obsolescencia.
 * `todayISO` se inyecta para testear sin depender del reloj.
 */
export function dedupeLatestByKey(
  rows: LabValueRow[],
  todayISO: string,
  staleDays: number = STALE_DAYS,
): CanonicalMap {
  const out: CanonicalMap = {};
  for (const r of rows) {
    if (r.is_voided) continue;
    if (r.value == null || !Number.isFinite(r.value)) continue;
    const prev = out[r.parameter_key];
    // Más reciente gana. Empate por fecha → la fila que llegó primero (orden de entrada).
    if (prev && prev.measured_at >= r.measured_at) continue;
    out[r.parameter_key] = {
      value: r.value,
      measured_at: r.measured_at,
      source: r.source,
      is_stale: daysBetween(todayISO, r.measured_at) > staleDays,
    };
  }
  return out;
}

/**
 * Lee `lab_values` (no-voided) y resuelve el último valor por parámetro.
 * UNA query. Devuelve el mapa canónico { parameter_key: { value, measured_at, source,
 * is_stale } }. Devuelve {} si falla la lectura (no rompe el motor).
 */
export async function loadCanonicalLabValues(userId: string): Promise<CanonicalMap> {
  try {
    const { data, error } = await supabase
      .from('lab_values')
      .select('parameter_key, value, measured_at, source, is_voided')
      .eq('user_id', userId)
      .eq('is_voided', false)
      .order('measured_at', { ascending: false });
    if (error) { logWarn('[lab-values] loadCanonicalLabValues failed:', error); return {}; }
    return dedupeLatestByKey((data ?? []) as LabValueRow[], getLocalToday());
  } catch (err) {
    logWarn('[lab-values] loadCanonicalLabValues threw:', err);
    return {};
  }
}

/**
 * Colapsa duplicados por idioma en un mapa canónico (#labs-desmadre): si conviven una key raw
 * inglesa (`testosterone`) y su canónica español (`testosterona_total`), las funde en UNA — gana
 * la más reciente (empate → la que ya estaba en el destino canónico). Defense-in-depth de SOLO
 * DISPLAY: la UI de ATP LABS la aplica DESPUÉS de loadCanonicalLabValues, así no toca lo que ve el
 * motor v2 (que lee por su propio bridge). Función pura, testeable sin Supabase.
 */
export function collapseLanguageDuplicates(map: CanonicalMap): CanonicalMap {
  const out: CanonicalMap = {};
  for (const [key, cv] of Object.entries(map)) {
    const canon = canonicalParameterKey(key);
    const prev = out[canon];
    // Gana la más reciente. Empate por fecha → conserva la primera (preferencia al destino canónico
    // si el mapa lo trae antes; el orden de Object.entries respeta inserción).
    if (!prev || prev.measured_at < cv.measured_at) out[canon] = cv;
  }
  return out;
}

/** Aplana el mapa canónico a { parameter_key: value } (para el motor de matriz). */
export function canonicalToValueDict(map: CanonicalMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) out[k] = v.value;
  return out;
}

/**
 * Bridge PURO: del mapa canónico a los campos PhenoAge de UnifiedUserData (con la inversión
 * de unidad a % donde el consumidor lo espera). Solo incluye los campos presentes.
 */
export function bridgeToPhenoAge(map: CanonicalMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [field, spec] of Object.entries(PHENOAGE_FIELD_TO_CANONICAL)) {
    const cv = map[spec.key];
    if (!cv) continue;
    out[field] = spec.pctOut ? decimalToPct(cv.value) : cv.value;
  }
  return out;
}

// ============================================================
// Escritura append-only
// ============================================================

/**
 * Inserta valores canónicos en `lab_values` (append-only). Aplica la conversión de unidad
 * UNA vez (en `toCanonicalEntries`). `raw` viene en claves inglesas/español del extractor o
 * captura; se mapean a parameter_key canónico y se expanden alias (ggt → 2 filas).
 * Idempotente por el UNIQUE(user_id, parameter_key, measured_at, source) → ON CONFLICT ignora.
 */
export async function insertLabValuesFromRaw(
  userId: string,
  raw: Record<string, number>,
  opts: { source: LabValueSource; measuredAt?: string; uploadId?: string; labResultId?: string },
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  const entries = toCanonicalEntries(raw);
  if (entries.length === 0) return { ok: true, inserted: 0 };
  const measured_at = opts.measuredAt ?? getLocalToday();
  const rows = entries.map((e) => ({
    user_id: userId,
    parameter_key: e.parameter_key,
    value: e.value,
    measured_at,
    source: opts.source,
    upload_id: opts.uploadId ?? null,
    lab_result_id: opts.labResultId ?? null,
  }));
  const { error } = await supabase
    .from('lab_values')
    .upsert(rows, { onConflict: 'user_id,parameter_key,measured_at,source', ignoreDuplicates: true });
  if (error) {
    logWarn('[lab-values] insertLabValuesFromRaw failed:', error);
    return { ok: false, inserted: 0, error: error.message };
  }
  return { ok: true, inserted: rows.length };
}

/**
 * Inserta biomarcadores ya canónicos (parameter_key = clave de matriz, value en unidad de
 * matriz salvo los pct que se convierten aquí). Para la captura manual de Edad ATP.
 */
export async function insertCanonicalBiomarkers(
  userId: string,
  entries: { parameter_key: string; value: number; unit?: string }[],
  opts: { source: LabValueSource; measuredAt?: string },
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  if (entries.length === 0) return { ok: true, inserted: 0 };
  const measured_at = opts.measuredAt ?? getLocalToday();
  const rows = entries.map((e) => {
    // #labs-desmadre: colapsar key raw inglesa → canónica español ANTES de persistir, para que la
    // captura manual no vuelva a crear duplicados (`testosterone` vs `testosterona_total`). El path
    // de PDF ya canonicaliza vía toCanonicalEntries; aquí faltaba. Idempotente para keys ya canónicas.
    const parameter_key = canonicalParameterKey(e.parameter_key);
    return {
      user_id: userId,
      parameter_key,
      // Conversión de unidad UNA vez, en el borde de escritura (hba1c/hematocrito/rdw_cv %→dec).
      value: toCanonicalUnit(parameter_key, e.value),
      unit: e.unit ?? null,
      measured_at,
      source: opts.source,
    };
  });
  const { error } = await supabase
    .from('lab_values')
    .upsert(rows, { onConflict: 'user_id,parameter_key,measured_at,source', ignoreDuplicates: true });
  if (error) {
    logWarn('[lab-values] insertCanonicalBiomarkers failed:', error);
    return { ok: false, inserted: 0, error: error.message };
  }
  return { ok: true, inserted: rows.length };
}

/**
 * Soft-delete: marca como voided todos los valores de un upload (archivo mal subido).
 * No borra nada — la lectura los ignora y cada parámetro vuelve a su penúltimo valor.
 */
export async function voidLabValuesByUpload(uploadId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('lab_values')
    .update({ is_voided: true })
    .eq('upload_id', uploadId);
  if (error) {
    logWarn('[lab-values] voidLabValuesByUpload failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Soft-delete por lab_result (cuando se borra una fila de lab_results). */
export async function voidLabValuesByLabResult(labResultId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('lab_values')
    .update({ is_voided: true })
    .eq('lab_result_id', labResultId);
  if (error) {
    logWarn('[lab-values] voidLabValuesByLabResult failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Serie temporal completa (no-voided) de un parámetro, ascendente por fecha — para la
 * gráfica de continuum (Fase 3). Aquí porque comparte la tabla; la UI la consume luego.
 */
/**
 * Series completas de TODOS los parámetros en UNA query (F4: tendencias en las
 * cards de ATP Labs + gráficas instantáneas al expandir, sin round-trip por tap).
 * Devuelve { parameter_key: puntos asc por fecha }.
 */
export async function loadAllSeries(
  userId: string,
): Promise<Record<string, { value: number; measured_at: string; source: LabValueSource }[]>> {
  try {
    const { data, error } = await supabase
      .from('lab_values')
      .select('parameter_key, value, measured_at, source')
      .eq('user_id', userId)
      .eq('is_voided', false)
      .order('measured_at', { ascending: true });
    if (error) { logWarn('[lab-values] loadAllSeries failed:', error); return {}; }
    const out: Record<string, { value: number; measured_at: string; source: LabValueSource }[]> = {};
    for (const row of (data ?? []) as { parameter_key: string; value: number; measured_at: string; source: LabValueSource }[]) {
      (out[row.parameter_key] ??= []).push({ value: row.value, measured_at: row.measured_at, source: row.source });
    }
    return out;
  } catch (err) {
    logWarn('[lab-values] loadAllSeries threw:', err);
    return {};
  }
}

export async function getParameterSeries(
  userId: string,
  parameterKey: string,
): Promise<{ value: number; measured_at: string; source: LabValueSource }[]> {
  try {
    const { data, error } = await supabase
      .from('lab_values')
      .select('value, measured_at, source')
      .eq('user_id', userId)
      .eq('parameter_key', parameterKey)
      .eq('is_voided', false)
      .order('measured_at', { ascending: true });
    if (error) { logWarn('[lab-values] getParameterSeries failed:', error); return []; }
    return (data ?? []) as { value: number; measured_at: string; source: LabValueSource }[];
  } catch (err) {
    logWarn('[lab-values] getParameterSeries threw:', err);
    return [];
  }
}
