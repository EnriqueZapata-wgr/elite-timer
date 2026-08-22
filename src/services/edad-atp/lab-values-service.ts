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
import { numeroDePg } from '@/src/utils/pg-number';
import {
  STALE_DAYS,
  toCanonicalEntries,
  toCanonicalUnit,
  canonicalParameterKey,
  PHENOAGE_FIELD_TO_CANONICAL,
  decimalToPct,
} from '@/src/constants/lab-canonical-map';
import { aUnidadDeMatriz } from '@/src/constants/lab-unidades-core';
import { isLabValueValid } from '@/src/constants/lab-clinical-ranges';

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
    // Cuello de botella #2 de los labs: este descarte alimenta al motor de Edad
    // ATP. Descartar de más aquí no degrada el motor, lo mata entero y en
    // silencio. La coerción vive en un solo lugar (pg-number).
    const value = numeroDePg(r.value);
    if (value === null) continue;
    const prev = out[r.parameter_key];
    // Más reciente gana. Empate por fecha → la fila que llegó primero (orden de entrada).
    if (prev && prev.measured_at >= r.measured_at) continue;
    out[r.parameter_key] = {
      value,
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

/**
 * Aplana el mapa canónico a { parameter_key: value } PARA EL MOTOR DE MATRIZ.
 *
 * Este es el único borde por el que los valores guardados entran al motor, y por
 * eso es aquí donde se llevan a la unidad en que la matriz escribe sus ventanas.
 * `lab_values` guarda la testosterona total en ng/dL (993, como la reporta el
 * laboratorio) y la matriz la puntúa en ng/mL: sin esta conversión el motor le
 * daba 0 puntos a una testosterona sana y eso bajaba la Edad ATP de la persona.
 *
 * Los fixtures de regresión contra el Excel NO pasan por aquí: alimentan
 * `computeSFGlobalReal` directo con valores que ya vienen en unidad de matriz.
 * Sus números no se mueven. Y aunque pasaran, tampoco: la conversión mira la
 * magnitud, y el 3.32 del fixture se lee como ng/mL y sale intacto.
 */
export function canonicalToValueDict(map: CanonicalMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) out[k] = aUnidadDeMatriz(k, v.value);
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
// Escritura: UNA sola puerta
// ============================================================

/**
 * 22-ago-2026 — LA ESCRITURA DEJA DE SER append-only Y PASA POR LA BASE.
 *
 * El upsert con `onConflict: user_id,parameter_key,measured_at,source` e
 * `ignoreDuplicates: true` tenía dos defectos que se comieron datos reales:
 *
 *  · Con el ORIGEN dentro de la llave, el mismo dato del mismo día podía
 *    vivir tres veces, una por etiqueta de origen, y cuál alimentaba el motor
 *    era el orden en que Postgres devolviera las filas. En la cuenta de
 *    pruebas convivieron un colesterol total de 672 y uno de 172 (migración
 *    307). La corrección del humano nunca ganaba: solo se sumaba a la pila.
 *
 *  · `ignoreDuplicates` descartaba en silencio la segunda versión del mismo
 *    dato. Corregir un valor en la pantalla y volver a guardar no corregía el
 *    motor: el expediente mostraba lo corregido y la Edad ATP seguía con lo
 *    equivocado.
 *
 * Ahora la regla vive en la base (migración 308): un índice único parcial deja
 * a lo más un valor VIVO por usuario, dato y fecha, y la función
 * `lab_valor_guardar` anula el anterior y escribe el nuevo en un solo acto.
 * Lo anulado se conserva, así que sigue habiendo histórico.
 *
 * NOTA PARA QUIEN LEA `lab-no-pisa.test.ts`: ese candado decía "estas
 * funciones jamás hacen update ni delete sobre lab_values". Sigue siendo
 * cierto y sigue importando, pero se re-apunta: ahora prohíbe que el servicio
 * escriba DIRECTO a la tabla, porque la única puerta legítima es el RPC. Un
 * update a mano desde aquí volvería a abrir el agujero de los dos valores.
 */

/** Lo que devuelve la función de la base por cada dato. */
type ResultadoGuardado = 'escrito' | 'sin_cambio' | 'protegido';

async function guardarUnValor(fila: {
  user_id: string; parameter_key: string; value: number; unit: string | null;
  measured_at: string; source: LabValueSource; upload_id?: string | null;
  lab_result_id?: string | null;
  /** Quién escribe. Un humano siempre puede corregir su propio dato. */
  es_humano?: boolean;
  /** El valor cae fuera del rango clínico y una persona lo sostiene igual. */
  fuera_confirmado?: boolean;
}): Promise<{ ok: boolean; resultado?: ResultadoGuardado; error?: string }> {
  const { data, error } = await supabase.rpc('lab_valor_guardar', {
    p_user_id: fila.user_id,
    p_parameter_key: fila.parameter_key,
    p_value: fila.value,
    p_unit: fila.unit,
    p_measured_at: fila.measured_at,
    p_source: fila.source,
    p_upload_id: fila.upload_id ?? null,
    p_lab_result_id: fila.lab_result_id ?? null,
    p_es_humano: fila.es_humano ?? false,
    p_fuera_confirmado: fila.fuera_confirmado ?? false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, resultado: (data as ResultadoGuardado) ?? 'escrito' };
}

/**
 * Escribe valores canónicos. Aplica la conversión de unidad UNA vez (en
 * `toCanonicalEntries`). `raw` viene en claves inglesas/español del extractor o
 * captura; se mapean a parameter_key canónico y se expanden alias (ggt → 2 filas).
 *
 * Devuelve el conteo REAL de lo que entró, no el de lo que se intentó. Quien
 * llame tiene que mirarlo: la pantalla decía "guardado" aunque la escritura
 * hubiera fallado entera.
 */
export async function insertLabValuesFromRaw(
  userId: string,
  raw: Record<string, number>,
  opts: { source: LabValueSource; measuredAt?: string; uploadId?: string; labResultId?: string },
): Promise<{ ok: boolean; inserted: number; sinCambio: number; protegidos: number; error?: string }> {
  const entries = toCanonicalEntries(raw);
  if (entries.length === 0) return { ok: true, inserted: 0, sinCambio: 0, protegidos: 0 };
  const measured_at = opts.measuredAt ?? getLocalToday();
  let inserted = 0; let sinCambio = 0; let protegidos = 0;
  const fallos: string[] = [];
  for (const e of entries) {
    const r = await guardarUnValor({
      user_id: userId,
      parameter_key: e.parameter_key,
      value: e.value,
      unit: null,
      measured_at,
      source: opts.source,
      upload_id: opts.uploadId ?? null,
      lab_result_id: opts.labResultId ?? null,
    });
    if (!r.ok) { fallos.push(`${e.parameter_key}: ${r.error}`); continue; }
    if (r.resultado === 'escrito') inserted += 1;
    else if (r.resultado === 'sin_cambio') sinCambio += 1;
    else protegidos += 1;
  }
  if (fallos.length > 0) {
    logWarn('[lab-values] insertLabValuesFromRaw fallos:', fallos);
    return { ok: false, inserted, sinCambio, protegidos, error: fallos[0] };
  }
  return { ok: true, inserted, sinCambio, protegidos };
}

/**
 * Inserta biomarcadores ya canónicos (parameter_key = clave de matriz, value en unidad de
 * matriz salvo los pct que se convierten aquí). Para la captura manual de Edad ATP.
 */
export async function insertCanonicalBiomarkers(
  userId: string,
  entries: { parameter_key: string; value: number; unit?: string }[],
  opts: {
    source: LabValueSource; measuredAt?: string;
    /** Lo escribió una persona (captura manual), no un extractor. */
    escritoPorHumano?: boolean;
  },
): Promise<{ ok: boolean; inserted: number; sinCambio: number; protegidos: number; error?: string }> {
  if (entries.length === 0) return { ok: true, inserted: 0, sinCambio: 0, protegidos: 0 };
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
      // La clave TAL COMO LLEGÓ, que es con la que están indexados los rangos
      // clínicos (LAB_ABSOLUTE_RANGES usa las claves del extractor y de la UI,
      // en inglés). Preguntar el rango con la clave canónica en español no
      // encuentra nada y devuelve "válido" por omisión, que es justo lo que
      // haría inútil la protección.
      _claveOriginal: e.parameter_key,
      // Y el valor SIN convertir: los rangos están en unidad de reporte
      // (hba1c en %), no en la de almacenamiento (fracción decimal).
      _valorOriginal: e.value,
    };
  });
  let inserted = 0; let sinCambio = 0; let protegidos = 0;
  const fallos: string[] = [];
  for (const { _claveOriginal, _valorOriginal, ...row } of rows) {
    // 4EP GRAVE-3: la protección se pone SOLO en el valor que de verdad cae
    // fuera del rango clínico. Marcar todo lo capturado a mano blindaba
    // valores normales, y después el PDF del mismo estudio no podía corregir
    // nada. Escribir a mano da autoridad para corregir; no convierte cada
    // número en intocable.
    const esHumano = opts.escritoPorHumano ?? false;
    const fueraDeRango = !isLabValueValid(_claveOriginal, _valorOriginal);
    const r = await guardarUnValor({
      ...row,
      es_humano: esHumano,
      fuera_confirmado: esHumano && fueraDeRango,
    });
    if (!r.ok) { fallos.push(`${row.parameter_key}: ${r.error}`); continue; }
    if (r.resultado === 'escrito') inserted += 1;
    else if (r.resultado === 'sin_cambio') sinCambio += 1;
    else protegidos += 1;
  }
  if (fallos.length > 0) {
    logWarn('[lab-values] insertCanonicalBiomarkers fallos:', fallos);
    return { ok: false, inserted, sinCambio, protegidos, error: fallos[0] };
  }
  return { ok: true, inserted, sinCambio, protegidos };
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
