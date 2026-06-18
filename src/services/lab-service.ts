/**
 * Lab Service — Upload, extracción IA, CRUD de resultados de laboratorio.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic, uploadFileToAnthropicViaProxy } from '@/src/services/anthropic-client';
import { getArgosCallMetadata } from '@/src/services/argos-service';
import { getLocalToday } from '@/src/utils/date-helpers';
import { insertLabValuesFromRaw, voidLabValuesByUpload, voidLabValuesByLabResult } from '@/src/services/edad-atp/lab-values-service';
import { isLabValueValid, LAB_ABSOLUTE_RANGES } from '@/src/constants/lab-clinical-ranges';
import { processParserItems, type RawParserItem, type ProcessedItem, type DerivedItem, type DupCandidate } from '@/src/services/edad-atp/lab-parser-process';
import { warn as logWarn } from '@/src/lib/logger';
import * as Sentry from '@sentry/react-native';

/** Capa 6 — logging granular a Sentry cuando el JSON del LLM no parsea (con preview del raw). */
function reportLabParseFailure(uploadId: string, flow: 'v1' | 'v2', rawText: string, jsonStr: string, e: unknown): void {
  logWarn(`[lab-parser ${flow}] JSON.parse falló. rawText:`, rawText.substring(0, 500));
  try {
    Sentry.captureMessage('lab-parser JSON parse failed', {
      level: 'warning',
      contexts: {
        labParser: {
          uploadId, flow,
          rawTextLength: rawText.length,
          rawTextPreview: rawText.substring(0, 800),
          jsonStrLength: jsonStr.length,
          errorMessage: String(e),
        },
      },
    } as any);
  } catch { /* sentry best-effort */ }
}

/** Capa 6 — logging cuando el LLM responde pero sin biomarcadores extraíbles. */
function reportLabNoBiomarkers(uploadId: string, flow: 'v1' | 'v2', parsed: any): void {
  try {
    Sentry.captureMessage('lab-parser no biomarkers extracted', {
      level: 'warning',
      contexts: { labParser: { uploadId, flow, parsed: JSON.stringify(parsed ?? {}).substring(0, 1000) } },
    } as any);
  } catch { /* sentry best-effort */ }
}

import { isRetriableError, withSmartRetry } from '@/src/utils/smart-retry';

/**
 * Extrae el primer objeto JSON balanceado del texto, ignorando texto extra
 * antes/después. Cuenta llaves abiertas/cerradas respetando strings.
 * Bulletproof contra LLMs que añaden "Aquí está el JSON:", explicaciones, etc.
 * Devuelve null si no encuentra ningún objeto JSON.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }
  return null;
}

/** Mensaje amigable cuando se agotan los reintentos por red. */
export const LAB_NETWORK_ERROR_MSG =
  'No pudimos leer este archivo. Verifica tu conexión e intenta de nuevo.';

/** Lee un Blob como base64 (sin el prefijo data:). */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

/**
 * Capa 5 — corre el parser sobre un upload. Intenta Anthropic Files API (file_id cacheado en
 * lab_uploads.anthropic_file_id) para evitar re-subir el PDF en cada reintento; si CUALQUIER
 * parte falla (endpoint no desplegado, columna 075 no migrada, error de subida) hace fallback
 * TRANSPARENTE a base64 inline (comportamiento actual). Envuelto en withSmartRetry (Capa 2).
 */
async function runParserOnUpload(
  upload: any,
  uploadId: string,
  contentType: string,
  mediaType: string,
  prompt: string,
  meta: any,
): Promise<any> {
  // Files API DESHABILITADO 2026-06-18: el beta header `files-api-2025-04-14`
  // no es válido contra Anthropic API actual → calls con file_id timeout sin
  // procesar el PDF (input_tokens=0). Volvemos a base64 inline (lo que funcionaba
  // antes de la Capa 5). Cuando se valide el header correcto, restaurar.
  // Mantenemos compat: si el upload tiene anthropic_file_id viejo guardado, lo
  // ignoramos (no lo borramos para no perder data de auditoría).
  void upload?.anthropic_file_id;
  void uploadId;

  return withSmartRetry(
    async () => {
      const fileRes = await fetch(upload.file_url);
      const source = { type: 'base64', media_type: mediaType, data: await blobToBase64(await fileRes.blob()) };
      return callAnthropic(
        [{ role: 'user', content: [
          { type: contentType, source },
          { type: 'text', text: prompt },
        ]}],
        8000, undefined, undefined, meta,
      );
    },
    { onRetry: (attempt, delay, err) => logWarn(`[lab-parser] intento ${attempt} falló (${err?.message ?? err}), reintentando en ${delay}ms`) },
  );
}

async function getAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

export interface LabUpload {
  id: string; user_id: string; file_url: string; file_type: string;
  file_name: string | null; status: string; extracted_data: any;
  lab_result_id: string | null; uploaded_at: string; error_message: string | null;
}

export interface LabResult {
  id: string; user_id: string; lab_date: string; lab_name: string | null;
  status: string; upload_id: string | null; [key: string]: any;
}

/**
 * Capa 9 — FLAG del worker async. OFF por defecto (flujo síncrono actual intacto).
 * Encender SOLO cuando los 3 estén listos en el proyecto:
 *   1. Edge Function `lab-parser-worker` desplegada
 *   2. Migración 076 corrida (enum 'pending' + trigger pg_net)
 *   3. GUC seteado: app.settings.supabase_url + app.settings.service_role_key
 * Con el flag OFF, enqueueLabWorker nunca se llama y el cliente sigue extrayendo en línea.
 * Bulletproof: si se enciende sin (1)/(2)/(3), el upload quedaría en 'pending' sin procesar
 * → por eso default false y se enciende a mano tras validar el backend. Ver COWORK_REPORT.
 */
export const LAB_ASYNC_WORKER_ENABLED = false;

// === UPLOAD ===

export async function uploadLabFile(
  userId: string, base64Data: string, fileType: 'image' | 'pdf', fileName?: string
): Promise<{ uploadId: string; fileUrl: string }> {
  const ext = fileType === 'pdf' ? 'pdf' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  // Decode base64 to Uint8Array for upload
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const { error: uploadError } = await supabase.storage
    .from('lab-files')
    .upload(path, bytes, { contentType: fileType === 'pdf' ? 'application/pdf' : 'image/jpeg' });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = await supabase.storage.from('lab-files').createSignedUrl(path, 365 * 24 * 60 * 60);
  const fileUrl = urlData?.signedUrl ?? '';

  const { data: upload, error: insertError } = await supabase
    .from('lab_uploads')
    .insert({ user_id: userId, file_url: fileUrl, file_type: fileType, file_name: fileName ?? `lab_${Date.now()}.${ext}`, status: 'uploaded' })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return { uploadId: upload.id, fileUrl };
}

// === EXTRACT WITH AI ===

export interface LabExtractResult {
  labResultId: string;
  extractedCount: number;
  otherValues: any[];
  /** Cuántos valores la IA extrajo pero descartamos por estar fuera de rango clínico. */
  rejectedCount: number;
  rejected: Array<{ key: string; value: number; reason: string }>;
}

export interface LabExtractError {
  error: string;
  /** true si el fallo fue de red (agotó reintentos) → la UI puede ofrecer "Reintentar". */
  retriable?: boolean;
  extractedCount?: number;
  otherValues?: any[];
  rejectedCount?: number;
  rejected?: Array<{ key: string; value: number; reason: string }>;
}

export async function extractLabValues(uploadId: string): Promise<LabExtractResult | LabExtractError> {
  // Get upload info
  const { data: upload } = await supabase.from('lab_uploads').select('*').eq('id', uploadId).single();
  if (!upload) return { error: 'Upload no encontrado' };

  await supabase.from('lab_uploads').update({ status: 'processing' }).eq('id', uploadId);

  try {
    const mediaType = upload.file_type === 'pdf' ? 'application/pdf' : 'image/jpeg';
    const contentType = upload.file_type === 'pdf' ? 'document' : 'image';

    const prompt = `Analiza este estudio de laboratorio y extrae TODOS los valores.

IMPORTANTE: Estudios en español (México). Mapea sinónimos a estos keys exactos:
glucose, hba1c, insulin, homa_ir, cholesterol_total, hdl, ldl, triglycerides, vldl, apo_b, non_hdl_cholesterol, lp_a,
tsh, t3_free, t4_free, total_t3, total_t4, testosterone, testosterone_free, estradiol, cortisol, dhea, progesterone, fsh, lh, prolactin, shbg, igf1,
vitamin_d, vitamin_b12, iron, ferritin, magnesium, zinc, folate, calcium, phosphorus,
pcr, homocysteine, rheumatoid_factor, ldh, cpk, aso, esr, fibrinogen, complement_c3, complement_c4,
alt, ast, ggt, bilirubin, bilirubin_direct, bilirubin_indirect, alp, albumin, total_protein, globulin, ag_ratio,
creatinine, uric_acid, bun, urea, sodium, potassium, chloride, co2, gfr,
hemoglobin, hematocrit, platelets, wbc, rbc, mcv, mch, mchc, rdw, mpv,
lymphocyte_pct, lymphocytes_abs, neutrophils_pct, neutrophils_abs, monocytes_pct, monocytes_abs, eosinophils_pct, eosinophils_abs, basophils_pct, basophils_abs, bands_pct,
iga, ige, igg, igm, anti_tpo, anti_tg,
iron_binding, iron_saturation, transferrin, free_iron,
fructosamine, c_peptide, pt, ptt, inr, urine_ph, urine_density

Sinónimos español→key:
Glucosa ayunas→glucose | HbA1c/A1C→hba1c | Insulina→insulin | HOMA→homa_ir
Colesterol total→cholesterol_total | Triglicéridos→triglycerides | HDL→hdl | LDL→ldl | VLDL→vldl
TGP/ALT→alt | TGO/AST→ast | GGT→ggt | FA/Fosfatasa alcalina→alp | DHL/LDH→ldh
Creatinina→creatinine | Ácido úrico→uric_acid | BUN/Nitrógeno ureico→bun | Urea→urea
Eritrocitos/Glóbulos rojos→rbc | VCM/MCV→mcv | HCM→mch | CMHC→mchc | VPM→mpv
ADE/RDW→rdw | Leucocitos→wbc | Linfocitos %→lymphocyte_pct | Neutrófilos %→neutrophils_pct
Monocitos %→monocytes_pct | Eosinófilos %→eosinophils_pct | Basófilos %→basophils_pct
Bilirrubina total→bilirubin | Bilirrubina directa→bilirubin_direct | Bilirrubina indirecta→bilirubin_indirect
Proteínas totales→total_protein | Globulina→globulin | Relación A/G→ag_ratio
TFG/Depuración→gfr | Calcio→calcium | Fósforo→phosphorus | CO2/Bicarbonato→co2
TSH→tsh | T3 libre→t3_free | T4 libre→t4_free | T3 total→total_t3 | T4 total→total_t4
Testosterona→testosterone | Estradiol→estradiol | Cortisol→cortisol | DHEA-S→dhea
FSH→fsh | LH→lh | Prolactina→prolactin | SHBG→shbg | IGF-1→igf1
Vitamina D/25-OH→vitamin_d | B12→vitamin_b12 | Ácido fólico→folate
Ferritina→ferritin | Magnesio→magnesium | Zinc→zinc | Hierro sérico→iron
TIBC→iron_binding | Saturación transferrina→iron_saturation | Transferrina→transferrin
PCR/PCR-us→pcr | Homocisteína→homocysteine | FR→rheumatoid_factor | ASO/ASLO→aso
VSG/Eritrosedimentación→esr | Fibrinógeno→fibrinogen | C3→complement_c3 | C4→complement_c4
TP/Tiempo protrombina→pt | TTP/TPT→ptt | INR→inr
Péptido C→c_peptide | Fructosamina→fructosamine | Sodio/Na→sodium | Potasio/K→potassium | Cloro/Cl→chloride
pH urinario→urine_ph | Densidad urinaria→urine_density

Responde SOLO JSON válido (sin backticks):
{"lab_name":"...","lab_date":"YYYY-MM-DD o null","values":{"glucose":{"value":95,"unit":"mg/dL"},...},"other_values":[{"name":"nombre original","value":123,"unit":"mg/dL"}]}
Solo valores encontrados. No mapeados→other_values.`;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUid = authUser?.id;
    const candidateTarget = upload.user_id;
    const targetUserId = (candidateTarget && candidateTarget !== authUid) ? candidateTarget : null;
    const meta = await getArgosCallMetadata({
      callerUserId: authUid,
      targetUserId,
      requestType: 'lab_interpretation',
    });

    // Capa 5: Files API (file_id cacheado) con fallback transparente a base64. Capa 2: retry.
    const result = await runParserOnUpload(upload, uploadId, contentType, mediaType, prompt, meta);

    const rawText = result.content?.map((c: any) => c.text || '').join('\n') || '';

    // Parse JSON con extracción bracket-balanced: ignora texto antes/después
    // del JSON, respeta strings y escapes. Bulletproof contra cualquier LLM.
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonStr = extractJsonObject(cleaned) ?? cleaned;
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      reportLabParseFailure(uploadId, 'v1', rawText, jsonStr, e);
      throw new Error('No se pudo parsear la respuesta de IA');
    }

    const rawExtracted = parsed.values || {};
    const otherValues = parsed.other_values || [];

    // ── Validación clínica (doctrina: null antes que basura) ──────────────────────
    // Cada valor extraído por la IA se compara contra su rango clínico ABSOLUTO. Los
    // imposibles (LDL 2.27, HDL 2.15, Col 672 — casos reales de Mariana) se DESCARTAN:
    // no se escriben a lab_results ni a lab_values. El motor Edad ATP ya maneja el null
    // (renormaliza CE). Mejor un biomarcador "no detectado" que un número absurdo.
    const values: Record<string, any> = {};
    const rejected: Array<{ key: string; value: number; reason: string }> = [];
    for (const [key, val] of Object.entries(rawExtracted)) {
      const num = (val as any)?.value;
      if (num == null) continue; // la IA no lo encontró → simplemente no se incluye
      if (typeof num === 'number' && isLabValueValid(key, num)) {
        values[key] = val;
      } else {
        const r = LAB_ABSOLUTE_RANGES[key];
        rejected.push({
          key,
          value: num,
          reason: r
            ? `Valor ${num} fuera del rango clínico absoluto (${r.min}-${r.max} ${r.unit})`
            : `Valor ${num} no numérico o inválido`,
        });
      }
    }
    if (rejected.length > 0) {
      // logWarn va a Sentry como breadcrumb (no hay instancia de PostHog fuera de React).
      logWarn('[lab-parser] valores rechazados por rango clínico:', { uploadId, rejected });
    }

    // Create lab_result
    const labData: Record<string, any> = {
      user_id: upload.user_id,
      lab_date: parsed.lab_date || getLocalToday(),
      lab_name: parsed.lab_name || null,
      upload_id: uploadId,
      status: 'draft',
    };

    // Map extracted values to columns
    for (const [key, val] of Object.entries(values)) {
      if (val && (val as any).value != null) {
        labData[key] = (val as any).value;
      }
    }

    // Save other_values as JSONB
    if (otherValues.length > 0) {
      labData.other_values = otherValues;
    }

    // No insertar una fila vacía: si la IA no extrajo biomarcadores, abortar y marcar failed
    // (evita rows de lab_results con TODOS los campos NULL que ensucian loadUserData).
    const extractedCount = Object.values(values).filter((v: any) => v?.value != null).length;
    if (extractedCount === 0) {
      reportLabNoBiomarkers(uploadId, 'v1', parsed);
      // Diferenciar "no se extrajo nada" de "todo lo extraído era basura clínica".
      const allRejected = rejected.length > 0;
      const errorMessage = allRejected
        ? `Ningún valor pasó la validación clínica (${rejected.length} descartados por estar fuera de rango).`
        : 'No biomarkers extracted';
      await supabase.from('lab_uploads').update({
        status: 'failed',
        extracted_data: parsed,
        ai_raw_response: rawText,
        error_message: errorMessage,
      }).eq('id', uploadId);
      return { error: errorMessage, extractedCount: 0, otherValues, rejectedCount: rejected.length, rejected };
    }

    const { data: labResult, error: labError } = await supabase
      .from('lab_results')
      .insert(labData)
      .select('id')
      .single();

    if (labError) throw new Error(labError.message || JSON.stringify(labError));

    // Fuente ÚNICA canónica: escribir cada valor extraído a lab_values (append-only, con
    // fecha+procedencia por-valor). Esto es lo que alimenta el motor Edad ATP — lab_results
    // queda como expediente médico crudo. measured_at = fecha del estudio (no de la subida).
    const rawValues: Record<string, number> = {};
    for (const [key, val] of Object.entries(values)) {
      const num = (val as any)?.value;
      if (typeof num === 'number' && Number.isFinite(num)) rawValues[key] = num;
    }
    await insertLabValuesFromRaw(upload.user_id, rawValues, {
      source: 'lab_pdf',
      measuredAt: labData.lab_date,
      uploadId,
      labResultId: labResult.id,
    });

    // Update upload
    await supabase.from('lab_uploads').update({
      status: 'extracted',
      extracted_data: parsed,
      ai_raw_response: rawText,
      lab_result_id: labResult.id,
    }).eq('id', uploadId);

    return { labResultId: labResult.id, extractedCount, otherValues, rejectedCount: rejected.length, rejected };

  } catch (err: any) {
    const retriable = isRetriableError(err);
    const message = retriable ? LAB_NETWORK_ERROR_MSG : (err?.message ?? 'Error al procesar el archivo');
    await supabase.from('lab_uploads').update({ status: 'failed', error_message: message }).eq('id', uploadId);
    return { error: message, retriable };
  }
}

/**
 * Capa 9 — encola el upload para el worker async server-side. status → 'pending' dispara el
 * trigger de la migración 076, que invoca a `lab-parser-worker` vía pg_net. El worker procesa
 * en background (sin el cap de 60s) y al terminar pone 'extracted'/'failed' → Supabase Realtime
 * notifica al cliente. El cliente NO espera al LLM. Idempotente.
 */
export async function enqueueLabWorker(uploadId: string): Promise<void> {
  const { error } = await supabase.from('lab_uploads').update({ status: 'pending' }).eq('id', uploadId);
  if (error) throw new Error(error.message || JSON.stringify(error));
}

// === PARSER v2 — extract para revisión + guardado confirmado ===

/** Prompt v2: array con confidence + unidad textual del documento (Capa 3). */
const PARSER_V2_PROMPT = `Eres un extractor de biomarcadores de un laboratorio médico (español/México).

Mapea los nombres a estos keys exactos (usa other_values para lo no listado):
glucose, hba1c, insulin, homa_ir, cholesterol_total, hdl, ldl, triglycerides, vldl, apo_b, non_hdl_cholesterol, lp_a,
tsh, t3_free, t4_free, total_t3, total_t4, testosterone, testosterone_free, estradiol, cortisol, dhea, progesterone, fsh, lh, prolactin, shbg, igf1,
vitamin_d, vitamin_b12, iron, ferritin, magnesium, zinc, folate, calcium, phosphorus,
pcr, homocysteine, rheumatoid_factor, ldh, cpk, aso, esr, fibrinogen, complement_c3, complement_c4,
alt, ast, ggt, bilirubin, bilirubin_direct, bilirubin_indirect, alp, albumin, total_protein, globulin, ag_ratio,
creatinine, uric_acid, bun, urea, sodium, potassium, chloride, co2, gfr,
hemoglobin, hematocrit, platelets, wbc, rbc, mcv, mch, mchc, rdw, mpv,
lymphocyte_pct, lymphocytes_abs, neutrophils_pct, neutrophils_abs, monocytes_pct, monocytes_abs, eosinophils_pct, eosinophils_abs, basophils_pct, basophils_abs, bands_pct,
iga, ige, igg, igm, anti_tpo, anti_tg, iron_binding, iron_saturation, transferrin, free_iron,
fructosamine, c_peptide, pt, ptt, inr, urine_ph, urine_density

Sinónimos comunes: Glucosa ayunas→glucose, HbA1c/A1C→hba1c, Colesterol total→cholesterol_total, Triglicéridos→triglycerides,
TGP/ALT→alt, TGO/AST→ast, Creatinina→creatinine, Ácido úrico→uric_acid, BUN→bun, Leucocitos→wbc, VCM→mcv, ADE/RDW→rdw,
Testosterona→testosterone, Vitamina D/25-OH→vitamin_d, B12→vitamin_b12, Ferritina→ferritin, PCR→pcr, Homocisteína→homocysteine.

Para CADA valor encontrado devuelve un objeto con este shape EXACTO:
{"key":"ldl","value":149,"unit_in_document":"mg/dL","confidence":"high","raw_text_snippet":"LDL: 149 mg/dL"}

REGLAS:
1. unit_in_document = la unidad TEXTUAL tal como aparece junto al valor (ej. "mg/dL", "mmol/L", "%"). null si no está clara.
2. Si la unidad NO está explícita junto al valor → confidence "low". Si el OCR es pobre o el valor es ambiguo → "low" o "medium". Si es claro → "high".
3. NO inventes valores. Es mejor OMITIR un biomarcador que adivinarlo.
4. NO mezcles valores de dos pacientes ni de fechas distintas (toma el estudio más reciente).
5. Solo keys de la lista. Lo no mapeado va en other_values.

Responde SOLO JSON válido (sin backticks) con este shape:
{"lab_name":"...","lab_date":"YYYY-MM-DD o null","values":[ ...objetos como arriba... ],"other_values":[{"name":"nombre original","value":123,"unit":"mg/dL"}]}`;

export interface LabReviewPayload {
  uploadId: string;
  userId: string;
  labName: string | null;
  labDate: string;
  items: ProcessedItem[];
  derived: DerivedItem[];
  otherValues: any[];
  /** Multi-foto: candidatos alternativos por key cuando varias fotos detectaron el mismo biomarker. */
  duplicates?: Record<string, DupCandidate[]>;
  /** Multi-foto: todos los uploads que componen esta revisión (para guardar/descartar en bloque). */
  uploadIds?: string[];
}

/** Acepta `values` como array v2 o como objeto {key:{value,unit}} (compat) → RawParserItem[]. */
function normalizeParserValues(values: any): RawParserItem[] {
  if (Array.isArray(values)) {
    return values
      .filter((v) => v && typeof v.key === 'string' && typeof v.value === 'number')
      .map((v) => ({
        key: v.key,
        value: v.value,
        unit_in_document: v.unit_in_document ?? v.unit ?? null,
        confidence: (v.confidence === 'high' || v.confidence === 'medium' || v.confidence === 'low') ? v.confidence : 'medium',
        raw_text_snippet: typeof v.raw_text_snippet === 'string' ? v.raw_text_snippet : undefined,
      }));
  }
  if (values && typeof values === 'object') {
    const out: RawParserItem[] = [];
    for (const [key, v] of Object.entries(values)) {
      const val = (v as any)?.value ?? v;
      if (typeof val === 'number' && Number.isFinite(val)) {
        out.push({ key, value: val, unit_in_document: (v as any)?.unit ?? null, confidence: 'medium' });
      }
    }
    return out;
  }
  return [];
}

/**
 * Capa 3+4: extrae un upload y lo deja LISTO PARA REVISIÓN (NO guarda nada). Corre el LLM v2,
 * normaliza unidades, auto-deriva y valida. El guardado ocurre solo tras la confirmación del
 * usuario vía saveConfirmedLabValues. Reusa el retry de red de Sprint 1.
 */
export async function extractLabValuesForReview(uploadId: string): Promise<LabReviewPayload | LabExtractError> {
  const { data: upload } = await supabase.from('lab_uploads').select('*').eq('id', uploadId).single();
  if (!upload) return { error: 'Upload no encontrado' };

  await supabase.from('lab_uploads').update({ status: 'processing' }).eq('id', uploadId);

  try {
    const mediaType = upload.file_type === 'pdf' ? 'application/pdf' : 'image/jpeg';
    const contentType = upload.file_type === 'pdf' ? 'document' : 'image';

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUid = authUser?.id;
    const candidateTarget = upload.user_id;
    const targetUserId = (candidateTarget && candidateTarget !== authUid) ? candidateTarget : null;
    const meta = await getArgosCallMetadata({ callerUserId: authUid, targetUserId, requestType: 'lab_interpretation' });

    // Capa 5: Files API con fallback a base64. Capa 2: retry inteligente.
    const result = await runParserOnUpload(upload, uploadId, contentType, mediaType, PARSER_V2_PROMPT, meta);

    const rawText = result.content?.map((c: any) => c.text || '').join('\n') || '';
    // Misma estrategia que el flujo v1: limpia backticks + extrae JSON balanceado.
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonStr = extractJsonObject(cleaned) ?? cleaned;
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      reportLabParseFailure(uploadId, 'v2', rawText, jsonStr, e);
      throw new Error('No se pudo parsear la respuesta de IA');
    }

    const rawItems = normalizeParserValues(parsed.values);
    const { items, derived } = processParserItems(rawItems);

    // Guardar crudo + marcar 'extracted' (listo para revisión). Esto dispara Realtime
    // → el banner async pasa a "Lab listo · Toca para revisar". El usuario después
    // confirmará valores en lab-confirmation, lo que actualizará a 'confirmed'.
    await supabase.from('lab_uploads').update({
      extracted_data: parsed,
      ai_raw_response: rawText,
      status: 'extracted',
    }).eq('id', uploadId);

    if (items.length === 0) {
      reportLabNoBiomarkers(uploadId, 'v2', parsed);
      await supabase.from('lab_uploads').update({ status: 'failed', error_message: 'No biomarkers extracted' }).eq('id', uploadId);
      return { error: 'No biomarkers extracted', extractedCount: 0, otherValues: parsed.other_values ?? [] };
    }

    return {
      uploadId,
      userId: upload.user_id,
      labName: parsed.lab_name ?? null,
      labDate: parsed.lab_date || getLocalToday(),
      items,
      derived,
      otherValues: parsed.other_values ?? [],
    };
  } catch (err: any) {
    const retriable = isRetriableError(err);
    const message = retriable ? LAB_NETWORK_ERROR_MSG : (err?.message ?? 'Error al procesar el archivo');
    await supabase.from('lab_uploads').update({ status: 'failed', error_message: message }).eq('id', uploadId);
    return { error: message, retriable };
  }
}

/**
 * Capa 9: reconstruye el LabReviewPayload desde extracted_data YA guardado por el worker async
 * (shape {values:{key:{value,unit}}, other_values, lab_name, lab_date}). Reusa EXACTAMENTE el
 * mismo pipeline que el flujo síncrono (normalizeParserValues → processParserItems) para que la
 * pantalla de confirmación sea idéntica venga del worker o del cliente. NO llama al LLM: solo
 * transforma data en memoria. Así el cliente "reconstruye la revisión" sin re-procesar.
 */
export function reconstructReviewFromExtractedData(upload: any): LabReviewPayload | LabExtractError {
  const parsed = upload?.extracted_data;
  if (!parsed || typeof parsed !== 'object') return { error: 'Sin datos extraídos' };
  const rawItems = normalizeParserValues(parsed.values);
  const { items, derived } = processParserItems(rawItems);
  if (items.length === 0) {
    return { error: 'No biomarkers extracted', extractedCount: 0, otherValues: parsed.other_values ?? [] };
  }
  return {
    uploadId: upload.id,
    userId: upload.user_id,
    labName: parsed.lab_name ?? null,
    labDate: parsed.lab_date || getLocalToday(),
    items,
    derived,
    otherValues: parsed.other_values ?? [],
  };
}

/**
 * Capa 9: carga la revisión desde DB cuando el worker ya extrajo (no hay payload en memoria,
 * p.ej. el banner 'extracted' tras cerrar/reabrir la app). Lee lab_uploads.extracted_data y
 * reconstruye. Lo usa lab-confirmation como fallback cuando lab-review-store está vacío.
 */
export async function loadReviewFromDb(uploadId: string): Promise<LabReviewPayload | LabExtractError> {
  const { data: upload } = await supabase.from('lab_uploads').select('*').eq('id', uploadId).single();
  if (!upload) return { error: 'Upload no encontrado' };
  return reconstructReviewFromExtractedData(upload);
}

/**
 * Capa 4: guarda los valores YA CONFIRMADOS por el usuario (con sus ediciones aplicadas).
 * Re-valida cada uno contra rangos clínicos (defensa) y escribe SOLO los válidos a
 * lab_results + lab_values. `confirmed` trae key inglés + valor en unidad canónica.
 */
export async function saveConfirmedLabValues(
  uploadId: string,
  confirmed: Array<{ key: string; value: number }>,
  opts: { labDate?: string; labName?: string | null; extraUploadIds?: string[] },
): Promise<LabExtractResult | LabExtractError> {
  const { data: upload } = await supabase.from('lab_uploads').select('*').eq('id', uploadId).single();
  if (!upload) return { error: 'Upload no encontrado' };

  try {
    const validated: Record<string, number> = {};
    const rejected: Array<{ key: string; value: number; reason: string }> = [];
    for (const { key, value } of confirmed) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (isLabValueValid(key, value)) {
        validated[key] = value;
      } else {
        const r = LAB_ABSOLUTE_RANGES[key];
        rejected.push({ key, value, reason: r ? `Fuera de rango (${r.min}-${r.max} ${r.unit})` : 'Valor inválido' });
      }
    }

    const extractedCount = Object.keys(validated).length;
    if (extractedCount === 0) {
      await supabase.from('lab_uploads').update({ status: 'failed', error_message: 'Ningún valor confirmado válido' }).eq('id', uploadId);
      return { error: 'Ningún valor confirmado válido', extractedCount: 0, otherValues: [], rejectedCount: rejected.length, rejected };
    }

    const labData: Record<string, any> = {
      user_id: upload.user_id,
      lab_date: opts.labDate || getLocalToday(),
      lab_name: opts.labName ?? null,
      upload_id: uploadId,
      status: 'draft',
      ...validated,
    };

    const { data: labResult, error: labError } = await supabase
      .from('lab_results').insert(labData).select('id').single();
    if (labError) throw new Error(labError.message || JSON.stringify(labError));

    await insertLabValuesFromRaw(upload.user_id, validated, {
      source: 'lab_pdf', measuredAt: labData.lab_date, uploadId, labResultId: labResult.id,
    });

    await supabase.from('lab_uploads').update({ status: 'extracted', lab_result_id: labResult.id }).eq('id', uploadId);

    // Multi-foto: las demás fotos quedan asociadas al mismo lab_result (no quedan "fallidas").
    const extras = (opts.extraUploadIds ?? []).filter((id) => id && id !== uploadId);
    if (extras.length > 0) {
      await supabase.from('lab_uploads').update({ status: 'extracted', lab_result_id: labResult.id }).in('id', extras);
    }

    if (rejected.length > 0) logWarn('[lab-parser-v2] confirmados rechazados por rango:', { uploadId, rejected });
    return { labResultId: labResult.id, extractedCount, otherValues: [], rejectedCount: rejected.length, rejected };
  } catch (err: any) {
    return { error: err?.message ?? 'Error al guardar' };
  }
}

// === QUERIES ===

export async function getLabHistory(userId: string, limit = 20): Promise<LabResult[]> {
  const { data } = await supabase
    .from('lab_results')
    .select('*')
    .eq('user_id', userId)
    .order('lab_date', { ascending: false })
    .limit(limit);
  return (data ?? []) as LabResult[];
}

export async function getLabUploads(userId: string): Promise<LabUpload[]> {
  const { data } = await supabase
    .from('lab_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });
  return (data ?? []) as LabUpload[];
}

export async function updateLabValues(labId: string, values: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('lab_results').update(values).eq('id', labId);
  if (error) throw error;
}

export async function approveLabResult(labId: string): Promise<void> {
  const user = await getAuth();
  const { error } = await supabase.from('lab_results').update({
    status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
  }).eq('id', labId);
  if (error) throw error;
}

export async function deleteLabResult(labId: string): Promise<void> {
  // Obtener upload_id antes de borrar
  const { data: lab } = await supabase.from('lab_results').select('upload_id').eq('id', labId).single();

  // Soft-delete de los valores canónicos derivados (no se borran: la lectura los ignora y
  // cada parámetro vuelve a su penúltimo valor). Por upload y por lab_result para cubrir ambos.
  await voidLabValuesByLabResult(labId);
  if (lab?.upload_id) await voidLabValuesByUpload(lab.upload_id);

  // Romper referencias circulares antes de borrar
  if (lab?.upload_id) {
    await supabase.from('lab_uploads').update({ lab_result_id: null }).eq('lab_result_id', labId);
  }
  // Romper referencia desde consultations
  await supabase.from('consultations').update({ lab_result_id: null }).eq('lab_result_id', labId);

  const { error } = await supabase.from('lab_results').delete().eq('id', labId);
  if (error) throw new Error(error.message || JSON.stringify(error));

  // Limpiar upload huérfano
  if (lab?.upload_id) {
    await supabase.from('lab_uploads').delete().eq('id', lab.upload_id);
  }
}

export async function deleteLabUpload(uploadId: string): Promise<void> {
  // Soft-delete de los valores canónicos de este upload (archivo mal subido, #11): NO se
  // borran otros valores; la lectura ignora is_voided y los params vuelven al penúltimo.
  await voidLabValuesByUpload(uploadId);
  // Romper referencia circular: lab_results.upload_id → null
  await supabase.from('lab_results').update({ upload_id: null }).eq('upload_id', uploadId);
  // Borrar lab_results que vinieron de este upload
  await supabase.from('lab_results').delete().eq('upload_id', uploadId);

  const { error } = await supabase.from('lab_uploads').delete().eq('id', uploadId);
  if (error) throw new Error(error.message || JSON.stringify(error));
}

/** Obtener uploads que fallaron o quedaron huérfanos (sin lab_result) */
export async function getFailedUploads(userId: string): Promise<LabUpload[]> {
  const { data } = await supabase
    .from('lab_uploads')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['failed', 'processing', 'uploaded'])
    .order('uploaded_at', { ascending: false });
  return (data ?? []) as LabUpload[];
}
