// Coach Engine — Detector de Banderas Rojas
// Brief §8 — categoriza + persiste red_flag_events con flag_index + ciclo de vida.
// System prompt Bloque 11: 5 categorías clínico-colindantes, flag acumulado
// (índice 1,2,3…) y ciclo de vida active → en_seguimiento → silente.

import { supabase } from '@/src/lib/supabase';
import type { RedFlagCategory, RedFlagLifecyclePhase } from './types';

export type RedFlagSeverity = 'emergencia' | 'alta' | 'media' | 'baja';

export interface DetectedRedFlag {
  category: RedFlagCategory;
  severity: RedFlagSeverity;
  evidenceText: string;
}

/** Tabla heurística categoría → keywords + severidad base (Bloque 11). Refinable post-Mariana. */
const RED_FLAG_RULES: { category: RedFlagCategory; severity: RedFlagSeverity; keywords: string[] }[] = [
  {
    category: 'sistemica_aguda',
    severity: 'emergencia',
    keywords: [
      'fiebre', 'infección', 'infeccion', 'dolor de pecho', 'dolor torácico', 'dolor toracico',
      'mareo persistente', 'pérdida de conciencia', 'perdida de conciencia',
      'asimetría facial', 'asimetria facial', 'dolor abdominal agudo',
    ],
  },
  {
    category: 'dolor_alarma',
    severity: 'alta',
    keywords: ['dolor articular agudo', 'dolor óseo', 'dolor oseo', 'dolor que despierta', 'dolor radicular'],
  },
  {
    category: 'cronico_degenerativa',
    severity: 'media',
    keywords: ['síntoma recurrente', 'sintoma recurrente', 'no mejora desde hace semanas', 'pérdida funcional', 'perdida funcional'],
  },
  {
    category: 'marcador_fisiologico_clinico',
    severity: 'alta',
    keywords: ['hrv bajo', 'fc reposo elevada', 'amenorrea', 'pérdida de peso no planeada', 'perdida de peso no planeada', 'fatiga sistémica', 'fatiga sistemica'],
  },
  {
    category: 'salud_mental',
    severity: 'media',
    keywords: ['apatía persistente', 'apatia persistente', 'no quiero levantarme', 'sin sentido', 'sobreentrenamiento'],
  },
];

/**
 * Detecta banderas rojas en el input del cliente (Bloque 11).
 * Heurística por categoría + keywords; una DetectedRedFlag por categoría con match.
 * evidenceText = primera keyword disparada.
 */
export function detectRedFlags(userInput: string): DetectedRedFlag[] {
  const haystack = userInput.toLowerCase();
  const detected: DetectedRedFlag[] = [];

  for (const rule of RED_FLAG_RULES) {
    const match = rule.keywords.find((kw) => haystack.includes(kw));
    if (match) {
      detected.push({ category: rule.category, severity: rule.severity, evidenceText: match });
    }
  }
  return detected;
}

/**
 * Persiste una bandera roja con acumulación de flag_index (Bloque 11).
 * Tras migración 069, el match de recurrencia usa `signal_description` (ILIKE) y
 * cada recurrencia refresca `last_recurrence_at`. En el insert se escribe tanto
 * `signal_description` como `evidence_text` (retrocompat: mismo valor por ahora).
 */
export async function persistRedFlag(
  userId: string,
  flag: DetectedRedFlag,
): Promise<{ id: string; flag_index: number; lifecycle_phase: RedFlagLifecyclePhase }> {
  const { data: existing, error: selErr } = await supabase
    .from('red_flag_events')
    .select('id, flag_index, lifecycle_phase')
    .eq('category', flag.category)
    .eq('lifecycle_phase', 'active')
    .ilike('signal_description', `%${flag.evidenceText}%`)
    .limit(1)
    .maybeSingle();

  if (selErr) {
    throw new Error(`red-flags-detector: persistRedFlag lookup failed — ${selErr.message}`);
  }

  if (existing) {
    const nextIndex = (existing.flag_index ?? 1) + 1;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('red_flag_events')
      .update({ flag_index: nextIndex, updated_at: now, last_recurrence_at: now })
      .eq('id', existing.id)
      .select('id, flag_index, lifecycle_phase')
      .single();
    if (error) {
      throw new Error(`red-flags-detector: persistRedFlag update failed — ${error.message}`);
    }
    return data as { id: string; flag_index: number; lifecycle_phase: RedFlagLifecyclePhase };
  }

  const { data, error } = await supabase
    .from('red_flag_events')
    .insert({
      user_id: userId,
      category: flag.category,
      severity: flag.severity,
      // Retrocompat: signal_description (069) + evidence_text (068) con el mismo valor.
      signal_description: flag.evidenceText,
      evidence_text: flag.evidenceText,
      flag_index: 1,
      lifecycle_phase: 'active',
    })
    .select('id, flag_index, lifecycle_phase')
    .single();
  if (error) {
    throw new Error(`red-flags-detector: persistRedFlag insert failed — ${error.message}`);
  }
  return data as { id: string; flag_index: number; lifecycle_phase: RedFlagLifecyclePhase };
}

/**
 * Calcula la siguiente fase del ciclo de vida del flag (Bloque 11).
 * - Cualquier recurrencia (daysSinceLastRecurrence === 0) regresa a 'active'.
 * - active → en_seguimiento: derivación atendida + >= 30 días sin recurrencia.
 * - en_seguimiento → silente: derivación + resolución documentada + >= 90 días.
 */
export function nextLifecyclePhase(
  currentPhase: RedFlagLifecyclePhase,
  daysSinceLastRecurrence: number,
  derivationAcknowledged: boolean,
  resolutionDocumented: boolean,
): RedFlagLifecyclePhase {
  if (daysSinceLastRecurrence === 0) return 'active';

  if (currentPhase === 'active' && derivationAcknowledged && daysSinceLastRecurrence >= 30) {
    return 'en_seguimiento';
  }
  if (
    currentPhase === 'en_seguimiento' &&
    derivationAcknowledged &&
    resolutionDocumented &&
    daysSinceLastRecurrence >= 90
  ) {
    return 'silente';
  }
  return currentPhase;
}

/** Flag activo con metadatos de ciclo de vida (para que el caller calcule recurrencia). */
export interface ActiveRedFlag extends DetectedRedFlag {
  id: string;
  flagIndex: number;
  lastRecurrenceAt: string | null;
}

/**
 * Devuelve los flags activos del usuario, ordenados por índice acumulado desc.
 * Bloque 11: cada interacción incluye la mención visible de las banderas activas.
 * Tras 069 incluye `last_recurrence_at` para que el caller calcule
 * daysSinceLastRecurrence sin una query extra.
 */
export async function getActiveFlags(userId: string): Promise<ActiveRedFlag[]> {
  const { data, error } = await supabase
    .from('red_flag_events')
    .select('id, category, severity, evidence_text, signal_description, flag_index, last_recurrence_at')
    .eq('user_id', userId)
    .eq('lifecycle_phase', 'active')
    .order('flag_index', { ascending: false });

  if (error) {
    throw new Error(`red-flags-detector: getActiveFlags failed — ${error.message}`);
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    category: row.category,
    severity: row.severity,
    // signal_description (069) es la fuente preferida; evidence_text (068) es fallback.
    evidenceText: row.signal_description ?? row.evidence_text ?? '',
    flagIndex: row.flag_index ?? 1,
    lastRecurrenceAt: row.last_recurrence_at ?? null,
  }));
}

// TEST: detectRedFlags('tengo dolor de pecho desde ayer') → categoría 'sistemica_aguda', severity 'emergencia'
// TEST: detectRedFlags('todo bien') → []
// TEST: nextLifecyclePhase('active', 35, true, false) === 'en_seguimiento'
// TEST: nextLifecyclePhase('en_seguimiento', 100, true, true) === 'silente'
// TEST: nextLifecyclePhase('silente', 0, true, true) === 'active' (recurrencia)
// TEST: nextLifecyclePhase('active', 10, true, false) === 'active' (no cumple 30 días)
// INTEGRATION TEST: persistRedFlag inserta nuevo / incrementa flag_index si recurre
// INTEGRATION TEST: getActiveFlags(userId) ordena por flag_index desc
