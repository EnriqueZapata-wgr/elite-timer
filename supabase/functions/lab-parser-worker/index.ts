/**
 * lab-parser-worker — Capa 9: procesa labs ASYNC server-side, SIN el cap de 60s del request
 * (corre en background con EdgeRuntime.waitUntil). Lo dispara el Database Webhook/trigger 076
 * cuando un lab_uploads pasa a 'pending'.
 *
 * Flujo: marca processing → descarga → (Capa 3) split PDF en chunks de 3 páginas con pdf-lib →
 * llama Anthropic por chunk EN PARALELO → mergea (doctrina: 1ª ocurrencia gana) → UPDATE a
 * 'extracted' (con extracted_data {values,...}) o 'failed'. Supabase Realtime notifica al cliente.
 *
 * Doctrina worker (no negociable):
 *  - Idempotente: si el upload ya está extracted/confirmed, no reprocesa.
 *  - No rompe estado previo: ante error, status → 'failed' con error_message claro.
 *  - Un chunk con timeout NO tumba a los demás (Promise.allSettled).
 *
 * ⚠️ NO TESTEADO en runtime aquí (no hay Deno). Validar en deploy. Ver COWORK_REPORT.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_MAX_TOKENS = 8000;
const PAGES_PER_CHUNK = 3;
const SPLIT_THRESHOLD = 5;
const CHUNK_TIMEOUT_MS = 55000;

const PROMPT = `Analiza este estudio de laboratorio (español/México) y extrae TODOS los valores.
Mapea sinónimos a estos keys exactos (usa other_values para lo no listado):
glucose, hba1c, insulin, homa_ir, cholesterol_total, hdl, ldl, triglycerides, vldl, apo_b, non_hdl_cholesterol, lp_a,
tsh, t3_free, t4_free, total_t3, total_t4, testosterone, testosterone_free, estradiol, cortisol, dhea, progesterone, fsh, lh, prolactin, shbg, igf1,
vitamin_d, vitamin_b12, iron, ferritin, magnesium, zinc, folate, calcium, phosphorus,
pcr, homocysteine, rheumatoid_factor, ldh, cpk, aso, esr, fibrinogen, complement_c3, complement_c4,
alt, ast, ggt, bilirubin, bilirubin_direct, bilirubin_indirect, alp, albumin, total_protein, globulin, ag_ratio,
creatinine, uric_acid, bun, urea, sodium, potassium, chloride, co2, gfr,
hemoglobin, hematocrit, platelets, wbc, rbc, mcv, mch, mchc, rdw, mpv,
lymphocyte_pct, neutrophils_pct, monocytes_pct, eosinophils_pct, basophils_pct,
iron_binding, iron_saturation, transferrin, fructosamine, c_peptide, pt, ptt, inr
Responde SOLO JSON válido (sin backticks):
{"lab_name":"...","lab_date":"YYYY-MM-DD o null","values":{"glucose":{"value":95,"unit":"mg/dL"}},"other_values":[{"name":"...","value":123,"unit":"mg/dL"}]}
Solo valores encontrados. No mapeados→other_values.`;

/** Extrae el primer objeto JSON balanceado (mismo algoritmo que el cliente). */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.substring(start, i + 1); }
  }
  return null;
}

type Chunk = { base64: string; mediaType: string; contentType: 'document' | 'image' };

/** Capa 3: divide el PDF en chunks de N páginas. ≤5 páginas o no-PDF → 1 chunk con todo. */
async function buildChunks(bytes: Uint8Array, fileType: string): Promise<Chunk[]> {
  if (fileType !== 'pdf') {
    return [{ base64: base64Encode(bytes), mediaType: 'image/jpeg', contentType: 'image' }];
  }
  let src: any;
  try {
    src = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch {
    // PDF que pdf-lib no puede cargar → mandar entero (1 chunk).
    return [{ base64: base64Encode(bytes), mediaType: 'application/pdf', contentType: 'document' }];
  }
  const total = src.getPageCount();
  if (total <= SPLIT_THRESHOLD) {
    return [{ base64: base64Encode(bytes), mediaType: 'application/pdf', contentType: 'document' }];
  }
  const chunks: Chunk[] = [];
  for (let start = 0; start < total; start += PAGES_PER_CHUNK) {
    const sub = await PDFDocument.create();
    const idxs: number[] = [];
    for (let p = start; p < Math.min(start + PAGES_PER_CHUNK, total); p++) idxs.push(p);
    const copied = await sub.copyPages(src, idxs);
    copied.forEach((pg: any) => sub.addPage(pg));
    const subBytes = await sub.save();
    chunks.push({ base64: base64Encode(subBytes), mediaType: 'application/pdf', contentType: 'document' });
  }
  return chunks;
}

async function callAnthropicChunk(chunk: Chunk): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHUNK_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        messages: [{ role: 'user', content: [
          { type: chunk.contentType, source: { type: 'base64', media_type: chunk.mediaType, data: chunk.base64 } },
          { type: 'text', text: PROMPT },
        ]}],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${JSON.stringify(data?.error)}`);
  const rawText = (data?.content ?? []).map((c: any) => c.text || '').join('\n');
  const jsonStr = extractJsonObject(rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  if (!jsonStr) throw new Error('no_json_in_response');
  return JSON.parse(jsonStr);
}

/** Merge (doctrina: 1ª ocurrencia gana). Réplica de src/services/lab-chunked-parser.ts. */
function mergeChunkResults(settled: PromiseSettledResult<any>[]) {
  const values: Record<string, any> = {};
  const otherValues: any[] = [];
  const errors: Array<{ chunkIndex: number; reason: string }> = [];
  let labName: string | null = null;
  let labDate: string | null = null;
  let successCount = 0;
  settled.forEach((r, i) => {
    if (r.status === 'rejected') { errors.push({ chunkIndex: i, reason: String(r.reason?.message ?? r.reason) }); return; }
    successCount++;
    const data = r.value ?? {};
    if (data.lab_name && !labName) labName = data.lab_name;
    if (data.lab_date && !labDate) labDate = data.lab_date;
    if (Array.isArray(data.other_values)) otherValues.push(...data.other_values);
    for (const [key, v] of Object.entries(data.values ?? {})) {
      if (v && typeof (v as any).value === 'number' && values[key] === undefined) {
        values[key] = { ...(v as any), chunkIndex: i };
      }
    }
  });
  return { values, other_values: otherValues, lab_name: labName, lab_date: labDate, errors, successCount, totalChunks: settled.length };
}

async function processLabUpload(supabase: any, uploadId: string): Promise<void> {
  try {
    const { data: upload } = await supabase.from('lab_uploads').select('*').eq('id', uploadId).single();
    if (!upload) return;
    // Idempotencia: no reprocesar lo ya terminado/confirmado.
    if (upload.status === 'extracted' || upload.status === 'confirmed') return;

    await supabase.from('lab_uploads').update({ status: 'processing' }).eq('id', uploadId);

    const fileRes = await fetch(upload.file_url);
    if (!fileRes.ok) throw new Error(`download ${fileRes.status}`);
    const bytes = new Uint8Array(await fileRes.arrayBuffer());

    const chunks = await buildChunks(bytes, upload.file_type);
    const settled = await Promise.allSettled(chunks.map((c) => callAnthropicChunk(c)));
    const merged = mergeChunkResults(settled);

    if (Object.keys(merged.values).length === 0) {
      const reason = merged.errors.map((e) => e.reason).join('; ') || 'No biomarkers extracted';
      await supabase.from('lab_uploads').update({ status: 'failed', error_message: reason }).eq('id', uploadId);
      return;
    }

    await supabase.from('lab_uploads').update({
      status: 'extracted',
      extracted_data: { values: merged.values, other_values: merged.other_values, lab_name: merged.lab_name, lab_date: merged.lab_date },
      ai_raw_response: JSON.stringify(merged).substring(0, 50000),
    }).eq('id', uploadId);
  } catch (e: any) {
    try {
      await supabase.from('lab_uploads').update({ status: 'failed', error_message: `Worker error: ${e?.message ?? e}` }).eq('id', uploadId);
    } catch { /* última red de seguridad */ }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');
  let uploadId: string | undefined;
  try {
    const body = await req.json();
    // El webhook de Supabase envía { record: {...} }; el trigger 076 envía { uploadId }.
    uploadId = body?.uploadId ?? body?.record?.id;
  } catch { /* */ }
  if (!uploadId) return new Response(JSON.stringify({ error: 'missing uploadId' }), { status: 400 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // @ts-ignore EdgeRuntime existe en Supabase Edge Functions (Deno Deploy).
  EdgeRuntime.waitUntil(processLabUpload(supabase, uploadId));

  return new Response(JSON.stringify({ accepted: true, uploadId }), {
    status: 202, headers: { 'Content-Type': 'application/json' },
  });
});
