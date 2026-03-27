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

    const prompt = `Analiza este estudio de laboratorio y extrae TODOS los valores. Responde SOLAMENTE con un JSON válido (sin backticks) con: {"lab_name": "...", "lab_date": "YYYY-MM-DD o null", "values": {"glucose": {"value": 95, "unit": "mg/dL"}, ...}, "other_values": [...]}. Incluye todos los biomarcadores que encuentres. Solo valores numéricos. Si no encuentras un valor, no lo incluyas.`;

    const result = await callAnthropic(
      [{ role: 'user', content: [
        { type: contentType, source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: prompt },
      ]}],
      4000,
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

    const { data: labResult, error: labError } = await supabase
      .from('lab_results')
      .insert(labData)
      .select('id')
      .single();

    if (labError) throw labError;

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
  const { error } = await supabase.from('lab_results').delete().eq('id', labId);
  if (error) throw error;
}
