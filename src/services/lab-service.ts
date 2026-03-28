/**
 * Lab Service — Upload, extracción IA, CRUD de resultados de laboratorio.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from '@/src/services/anthropic-client';

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

export async function extractLabValues(uploadId: string): Promise<{
  labResultId: string; extractedCount: number; otherValues: any[];
} | { error: string }> {
  // Get upload info
  const { data: upload } = await supabase.from('lab_uploads').select('*').eq('id', uploadId).single();
  if (!upload) return { error: 'Upload no encontrado' };

  await supabase.from('lab_uploads').update({ status: 'processing' }).eq('id', uploadId);

  try {
    // Download file as base64
    const fileRes = await fetch(upload.file_url);
    const blob = await fileRes.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });

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

    const result = await callAnthropic(
      [{ role: 'user', content: [
        { type: contentType, source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: prompt },
      ]}],
      8000,
    );

    const rawText = result.content?.map((c: any) => c.text || '').join('\n') || '';

    // Parse JSON (clean backticks if present)
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let parsed: any;
    try { parsed = JSON.parse(cleaned); } catch { throw new Error('No se pudo parsear la respuesta de IA'); }

    const values = parsed.values || {};
    const otherValues = parsed.other_values || [];

    // Create lab_result
    const labData: Record<string, any> = {
      user_id: upload.user_id,
      lab_date: parsed.lab_date || new Date().toISOString().split('T')[0],
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

    const { data: labResult, error: labError } = await supabase
      .from('lab_results')
      .insert(labData)
      .select('id')
      .single();

    if (labError) throw new Error(labError.message || JSON.stringify(labError));

    // Update upload
    await supabase.from('lab_uploads').update({
      status: 'extracted',
      extracted_data: parsed,
      ai_raw_response: rawText,
      lab_result_id: labResult.id,
    }).eq('id', uploadId);

    const extractedCount = Object.values(values).filter((v: any) => v?.value != null).length;
    return { labResultId: labResult.id, extractedCount, otherValues };

  } catch (err: any) {
    await supabase.from('lab_uploads').update({ status: 'failed', error_message: err.message }).eq('id', uploadId);
    return { error: err.message };
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
