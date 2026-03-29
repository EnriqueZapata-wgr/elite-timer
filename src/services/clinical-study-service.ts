/**
 * Clinical Study Service — CRUD, upload, IA interpretation.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from './anthropic-client';
import { getStudyType } from '@/src/data/study-types';

// === TYPES ===

export interface StudyFile {
  url: string;
  type: 'image' | 'pdf';
  name: string;
  uploaded_at: string;
  storage_path?: string;
}

export interface ClinicalStudy {
  id: string;
  user_id: string;
  study_type: string;
  study_name: string;
  study_date: string;
  ordering_physician: string | null;
  performing_lab: string | null;
  files: StudyFile[];
  original_interpretation: string | null;
  patient_summary: string | null;
  findings: string[];
  status: 'uploaded' | 'processing' | 'interpreted' | 'reviewed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  coach_notes: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// === AUTH ===

async function getAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

// === CRUD ===

export async function createStudy(data: {
  user_id: string;
  study_type: string;
  study_name: string;
  study_date: string;
  ordering_physician?: string;
  performing_lab?: string;
}): Promise<ClinicalStudy> {
  const user = await getAuth();
  const { data: study, error } = await supabase
    .from('clinical_studies')
    .insert({ ...data, uploaded_by: user.id })
    .select('*')
    .single();
  if (error) throw error;
  return study;
}

export async function getStudies(userId: string, limit = 20): Promise<ClinicalStudy[]> {
  const { data } = await supabase
    .from('clinical_studies')
    .select('*')
    .eq('user_id', userId)
    .order('study_date', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getStudy(studyId: string): Promise<ClinicalStudy | null> {
  const { data } = await supabase
    .from('clinical_studies')
    .select('*')
    .eq('id', studyId)
    .single();
  return data;
}

export async function updateStudy(studyId: string, updates: Partial<ClinicalStudy>): Promise<void> {
  const { error } = await supabase
    .from('clinical_studies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', studyId);
  if (error) throw error;
}

export async function deleteStudy(studyId: string): Promise<void> {
  // Borrar archivos del storage primero
  const study = await getStudy(studyId);
  if (study?.files) {
    for (const f of study.files) {
      if (f.storage_path) {
        await supabase.storage.from('clinical-studies').remove([f.storage_path]);
      }
    }
  }
  const { error } = await supabase.from('clinical_studies').delete().eq('id', studyId);
  if (error) throw error;
}

export async function getStudiesByType(userId: string, studyType: string): Promise<ClinicalStudy[]> {
  const { data } = await supabase
    .from('clinical_studies')
    .select('*')
    .eq('user_id', userId)
    .eq('study_type', studyType)
    .order('study_date', { ascending: false });
  return data ?? [];
}

// === UPLOAD ===

export async function addFileToStudy(
  studyId: string,
  userId: string,
  base64Data: string,
  fileType: 'image' | 'pdf',
  fileName?: string,
): Promise<StudyFile> {
  const ext = fileType === 'pdf' ? 'pdf' : 'jpg';
  const storagePath = `${userId}/${studyId}/${Date.now()}.${ext}`;

  // Decode base64
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const { error: uploadError } = await supabase.storage
    .from('clinical-studies')
    .upload(storagePath, bytes, {
      contentType: fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
    });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = await supabase.storage
    .from('clinical-studies')
    .createSignedUrl(storagePath, 365 * 24 * 60 * 60);

  const fileUrl = urlData?.signedUrl ?? '';
  const newFile: StudyFile = {
    url: fileUrl,
    type: fileType,
    name: fileName ?? `study_${Date.now()}.${ext}`,
    uploaded_at: new Date().toISOString(),
    storage_path: storagePath,
  };

  // Agregar al array files del estudio
  const study = await getStudy(studyId);
  const currentFiles = study?.files ?? [];
  await updateStudy(studyId, { files: [...currentFiles, newFile] as any });

  return newFile;
}

// === INTERPRETACIÓN CON IA ===

function parseStudyInterpretation(text: string) {
  const sections = {
    clinical: '',
    patient: '',
    findings: [] as string[],
  };

  const clinicalMatch = text.match(/## INTERPRETACI[ÓO]N CL[ÍI]NICA\s*\n([\s\S]*?)(?=## RESUMEN|$)/i);
  if (clinicalMatch) sections.clinical = clinicalMatch[1].trim();

  const patientMatch = text.match(/## RESUMEN PARA EL PACIENTE\s*\n([\s\S]*?)(?=## HALLAZGOS|$)/i);
  if (patientMatch) sections.patient = patientMatch[1].trim();

  const findingsMatch = text.match(/## HALLAZGOS CLAVE\s*\n([\s\S]*?)$/i);
  if (findingsMatch) {
    sections.findings = findingsMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  return sections;
}

export async function interpretStudy(studyId: string): Promise<ClinicalStudy> {
  const study = await getStudy(studyId);
  if (!study) throw new Error('Estudio no encontrado');

  await updateStudy(studyId, { status: 'processing' } as any);

  const studyTypeInfo = getStudyType(study.study_type);

  // Preparar contenido para la IA
  const content: any[] = [];

  // Incluir archivos como imágenes (solo los de tipo imagen por ahora)
  for (const f of (study.files ?? [])) {
    if (f.type === 'image' && f.url) {
      try {
        const response = await fetch(f.url);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
          };
          reader.readAsDataURL(blob);
        });
        if (base64) {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          });
        }
      } catch { /* skip unloadable files */ }
    }
  }

  content.push({
    type: 'text',
    text: `Analiza este estudio médico: ${study.study_name} (${studyTypeInfo.label}).
Fecha: ${study.study_date}
${study.ordering_physician ? `Médico: ${study.ordering_physician}` : ''}

GENERA TRES SECCIONES:

## INTERPRETACIÓN CLÍNICA
Extrae y resume la interpretación médica del documento. Incluye:
- Tipo de estudio y área evaluada
- Hallazgos principales (lista)
- Diagnósticos o impresiones diagnósticas
- Recomendaciones del médico (si las hay)
Usa terminología médica correcta. Esto es para el profesional de salud.

## RESUMEN PARA EL PACIENTE
Explica los resultados en lenguaje simple y coloquial, como si le explicaras a un amigo inteligente pero sin conocimiento médico. Evita tecnicismos. Usa analogías si ayudan. El tono debe ser tranquilizador pero honesto — no minimizar hallazgos importantes.
Máximo 4-5 oraciones.

## HALLAZGOS CLAVE
Lista de diagnósticos/hallazgos como tags cortos, uno por línea. Ejemplo:
- Hernia hiatal
- Esofagitis grado B

Responde en español.`,
  });

  try {
    const aiResponse = await callAnthropic(
      [{ role: 'user', content }],
      3000,
      'claude-sonnet-4-20250514',
    );

    const responseText = aiResponse?.content?.[0]?.text ?? '';
    const parsed = parseStudyInterpretation(responseText);

    await updateStudy(studyId, {
      original_interpretation: parsed.clinical || responseText,
      patient_summary: parsed.patient || null,
      findings: parsed.findings as any,
      status: 'interpreted',
    } as any);
  } catch (err: any) {
    // Si la IA falla, marcar como uploaded (no processing)
    await updateStudy(studyId, { status: 'uploaded' } as any);
    throw new Error(`Interpretación IA falló: ${err.message}`);
  }

  return (await getStudy(studyId))!;
}

export async function markAsReviewed(studyId: string): Promise<void> {
  const user = await getAuth();
  await updateStudy(studyId, {
    status: 'reviewed',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  } as any);
}
