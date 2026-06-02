// Coach Engine — Explicador de Auditoría
// Brief §7.2.9 — a pedido del usuario ("¿por qué me dijiste eso?"), el coach
// reconstruye desde los logs qué pregunta rectora, qué nivel de cascada, qué
// principio y qué freno aplicaron en una intervención.
// System prompt: obligación "audita tu propia decisión".

import { supabase } from '@/src/lib/supabase';
import type { BrakeType, CascadeLevel, Principle, TrafficLight } from './types';
import type { Q1Result } from './two-questions';
import { describePrinciple } from './principles-map';

export interface AuditExplanation {
  interventionLogId: string;
  /** Narrativa breve reconstruida desde los logs. */
  summary: string;
  q1: Q1Result | null;
  q2: TrafficLight | null;
  cascadeLevel: CascadeLevel | null;
  principleInvoked: Principle | null;
  principleRationale: string;
  dominantBrake: BrakeType | null;
  signalSnapshot?: string;
  recommendation: string;
}

/** Devuelve la descripción del principio, o '' si no es un principio conocido. */
function safeDescribePrinciple(principle: Principle | null): string {
  if (!principle) return '';
  try {
    return describePrinciple(principle);
  } catch {
    return '';
  }
}

/**
 * Reconstruye la explicación auditada de una intervención (§7.2.9).
 * Tras migración 069 hace JOINS reales:
 *   1. intervention_logs por id (q1/q2/cascada/recomendación).
 *   2. principle_invocations WHERE intervention_log_id (principio + rationale real).
 *   3. frenos_log WHERE intervention_log_id (freno dominante real).
 * Para filas legacy (pre-069, sin FK) cae a los campos inline de intervention_logs
 * (principle_invoked, brake_detected, audit_explanation) y al catálogo de principios.
 */
export async function explainIntervention(interventionLogId: string): Promise<AuditExplanation> {
  const { data, error } = await supabase
    .from('intervention_logs')
    .select('id, question_1_result, question_2_result, cascade_level, principle_invoked, brake_detected, intervention_text, audit_explanation')
    .eq('id', interventionLogId)
    .single();

  if (error) {
    throw new Error(`audit-explainer: explainIntervention failed — ${error.message}`);
  }

  // Join real: principio invocado para esta intervención (069).
  const { data: principleRow, error: pErr } = await supabase
    .from('principle_invocations')
    .select('principle, rationale, context_text')
    .eq('intervention_log_id', interventionLogId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pErr) {
    throw new Error(`audit-explainer: explainIntervention principle join failed — ${pErr.message}`);
  }

  // Join real: freno registrado para esta intervención (069).
  const { data: brakeRow, error: bErr } = await supabase
    .from('frenos_log')
    .select('brake_type')
    .eq('intervention_log_id', interventionLogId)
    .order('detected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (bErr) {
    throw new Error(`audit-explainer: explainIntervention brake join failed — ${bErr.message}`);
  }

  const q1 = (data.question_1_result as Q1Result | null) ?? null;
  const q2 = (data.question_2_result as TrafficLight | null) ?? null;
  const cascadeLevel = (data.cascade_level as CascadeLevel | null) ?? null;
  const recommendation = data.intervention_text ?? '';

  // Principio: join real primero, fallback al campo inline de intervention_logs.
  const principleInvoked =
    (principleRow?.principle as Principle | null) ?? (data.principle_invoked as Principle | null) ?? null;
  // Rationale: real (069) → audit_explanation inline → context_text legacy → catálogo.
  const principleRationale =
    principleRow?.rationale ||
    data.audit_explanation ||
    principleRow?.context_text ||
    safeDescribePrinciple(principleInvoked);
  // Freno: join real primero, fallback al campo inline.
  const dominantBrake =
    (brakeRow?.brake_type as BrakeType | null) ?? (data.brake_detected as BrakeType | null) ?? null;

  const summary =
    `Tu pregunta entró como ${q1 ?? 'sin clasificar'} / señal ${q2 ?? 'sin señal'}. ` +
    `Apliqué nivel ${cascadeLevel ?? '—'} de la cascada. ` +
    `El principio invocado fue ${principleInvoked ?? 'ninguno'}` +
    (principleRationale ? `: ${principleRationale}` : '.');

  return {
    interventionLogId,
    summary,
    q1,
    q2,
    cascadeLevel,
    principleInvoked,
    principleRationale,
    dominantBrake,
    recommendation,
  };
}

// INTEGRATION TEST: explainIntervention(id) con fixture intervention_logs →
//   summary contiene el principio, el nivel de cascada y la palabra 'cascada'
// INTEGRATION TEST: explainIntervention(id-inexistente) → throws con mensaje claro
