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
 * Lee intervention_logs por id y compone un AuditExplanation con la pregunta
 * rectora, el semáforo, el nivel de cascada, el principio (+rationale del
 * catálogo) y el freno dominante.
 * NOTA: el schema no tiene columnas signal_description/principle rationale ni
 * FK a principle_invocations; rationale se deriva del catálogo de principios y
 * signalSnapshot queda indefinido (ver flag COWORK_REPORT).
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

  const q1 = (data.question_1_result as Q1Result | null) ?? null;
  const q2 = (data.question_2_result as TrafficLight | null) ?? null;
  const cascadeLevel = (data.cascade_level as CascadeLevel | null) ?? null;
  const principleInvoked = (data.principle_invoked as Principle | null) ?? null;
  const dominantBrake = (data.brake_detected as BrakeType | null) ?? null;
  const recommendation = data.intervention_text ?? '';
  const principleRationale = data.audit_explanation || safeDescribePrinciple(principleInvoked);

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
