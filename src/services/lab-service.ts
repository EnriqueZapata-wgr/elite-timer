/**
 * Lab Service — Upload, extracción IA, CRUD de resultados de laboratorio.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from '@/src/services/anthropic-client';
import { getArgosCallMetadata } from '@/src/services/argos-service';
import { getLocalToday } from '@/src/utils/date-helpers';
import { insertLabValuesFromRaw, voidLabValuesByUpload, voidLabValuesByLabResult } from '@/src/services/edad-atp/lab-values-service';
import { isLabValueValid, LAB_ABSOLUTE_RANGES } from '@/src/constants/lab-clinical-ranges';
import { processParserItems, type RawParserItem, type ProcessedItem, type DerivedItem, type DupCandidate } from '@/src/services/edad-atp/lab-parser-process';
import { warn as logWarn } from '@/src/lib/logger';

/** Reintentos del parser ante fallo de red: backoff 1s, 3s (3 intentos totales). */
const PARSER_RETRY_DELAYS_MS = [1000, 3000];

/** Mensaje amigable cuando se agotan los reintentos por red. */
export const LAB_NETWORK_ERROR_MSG =
  'No pudimos leer este archivo. Verifica tu conexión e intenta de nuevo.';

/** ¿El error es de red/timeout (reintentable) y no un error de contenido/parseo? */
function isRetriableNetworkError(err: any): boolean {
  if (err?.name === 'AbortError') return true;
  const msg = String(err?.message ?? err ?? '');
  return /network request failed|networkerror|failed to fetch|timeout|ARGOS_TIMEOUT|aborted|socket hang up/i.test(msg);
}

/** Ejecuta `fn` reintentando SOLO ante fallos de red, con backoff. Re-lanza el último error. */
async function withNetworkRetry<T>(fn: () => Promise<T>, label = 'lab-parser'): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= PARSER_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const canRetry = attempt < PARSER_RETRY_DELAYS_MS.length && isRetriableNetworkError(err);
      if (!canRetry) throw err;
      const delay = PARSER_RETRY_DELAYS_MS[attempt];
      logWarn(`[${label}] intento ${attempt + 1} falló por red, reintentando en ${delay}ms:`, err?.message ?? err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
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

    // Descarga del archivo + llamada al parser AI envueltos en reintento de red (1s, 3s).
    // Si los 3 intentos fallan por red, withNetworkRetry re-lanza y el catch lo marca retriable.
    const result = await withNetworkRetry(async () => {
      const fileRes = await fetch(upload.file_url);
      const blob = await fileRes.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      return callAnthropic(
        [{ role: 'user', content: [
          { type: contentType, source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ]}],
        8000,
        undefined,
        undefined,
        meta,
      );
    });

    const rawText = result.content?.map((c: any) => c.text || '').join('\n') || '';

    // Parse JSON: limpia backticks y extrae el primer {...} en caso de que el
    // LLM (Sonnet 4.6 o fallback Gemini) lo envuelva con texto explicativo.
    // Bulletproof contra "Aquí está el JSON:" / "Lo siento, no pude..." / etc.
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
    let parsed: any;
    try { parsed = JSON.parse(jsonStr); } catch { throw new Error('No se pudo parsear la respuesta de IA'); }

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
    const retriable = isRetriableNetworkError(err);
    const message = retriable ? LAB_NETWORK_ERROR_MSG : (err?.message ?? 'Error al procesar el archivo');
    await supabase.from('lab_uploads').update({ status: 'failed', error_message: message }).eq('id', uploadId);
    return { error: message, retriable };
  }
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

    const result = await withNetworkRetry(async () => {
      const fileRes = await fetch(upload.file_url);
      const blob = await fileRes.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      return callAnthropic(
        [{ role: 'user', content: [
          { type: contentType, source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: PARSER_V2_PROMPT },
        ]}],
        8000, undefined, undefined, meta,
      );
    });

    const rawText = result.content?.map((c: any) => c.text || '').join('\n') || '';
    // Misma estrategia que el flujo v1: limpia backticks + extrae primer {...}.
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
    let parsed: any;
    try { parsed = JSON.parse(jsonStr); } catch { throw new Error('No se pudo parsear la respuesta de IA'); }

    const rawItems = normalizeParserValues(parsed.values);
    const { items, derived } = processParserItems(rawItems);

    // Guardar crudo para auditoría. status sigue 'processing' hasta que el usuario confirme.
    await supabase.from('lab_uploads').update({ extracted_data: parsed, ai_raw_response: rawText }).eq('id', uploadId);

    if (items.length === 0) {
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
    const retriable = isRetriableNetworkError(err);
    const message = retriable ? LAB_NETWORK_ERROR_MSG : (err?.message ?? 'Error al procesar el archivo');
    await supabase.from('lab_uploads').update({ status: 'failed', error_message: message }).eq('id', uploadId);
    return { error: message, retriable };
  }
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
