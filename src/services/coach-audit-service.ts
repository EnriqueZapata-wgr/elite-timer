/**
 * Coach Audit Service (Step COACH 7/N) — persistencia fire-and-forget de la
 * auditoría de cada turno de ARGOS. Se llama con `void` desde chatWithArgosEx:
 * la respuesta al usuario NUNCA espera estos INSERT. Si algo falla, log + sigue.
 */
import { supabase } from '@/src/lib/supabase';
import {
  BrakeDetector,
  RedFlagsDetector,
  PrinciplesMap,
  InsightRouter,
  type CoachGateResult,
  type Principle,
} from '@/src/lib/coach-engine';
import { error as logError } from '@/src/lib/logger';

/**
 * Heurística v1 (Step COACH 7/N): detecta si el LLM mencionó un principio
 * canónico en su respuesta. Débil por diseño — refinar con Mariana (flag).
 */
export function detectPrincipleInResponse(text: string): Principle | null {
  const lower = text.toLowerCase();
  if (lower.includes('identidad')) return 'identidad';
  if (lower.includes('estándar') || lower.includes('estandar')) return 'estandar';
  if (lower.includes('propósito') || lower.includes('proposito')) return 'proposito';
  if (lower.includes('filosofía') || lower.includes('filosofia')) return 'filosofia';
  if (lower.includes('fisiología') || lower.includes('fisiologia')) return 'fisiologia';
  if (lower.includes('biomecánica') || lower.includes('biomecanica')) return 'biomecanica';
  if (lower.includes('mecanismo') || lower.includes('mitocondria')) return 'mecanismos_biologicos';
  return null;
}

/**
 * Persiste la auditoría del turno: intervention_logs (principal) + freno +
 * banderas rojas + principio invocado + insights. Fire-and-forget.
 * NOTA: intervention_logs NO tiene columnas user_message ni signal_description
 * (068); se omiten del INSERT (ver flag COWORK_REPORT).
 */
export async function persistTurnAudit(
  userId: string,
  conversationId: string | null,
  gate: CoachGateResult,
  response: string,
): Promise<void> {
  try {
    // 1. INSERT intervention_log principal.
    const { data: log, error: logErr } = await supabase
      .from('intervention_logs')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        intervention_text: response,
        question_1_result: gate.auditPayload.question_1_result,
        question_2_result: gate.auditPayload.question_2_result,
        cascade_level: gate.auditPayload.cascade_level,
        principle_invoked: gate.auditPayload.principle_invoked,
        brake_detected: gate.auditPayload.brake_detected,
        audit_explanation: null, // se rellena bajo demanda con audit-explainer
      })
      .select('id')
      .single();

    if (logErr || !log) {
      logError('[ARGOS] persistTurnAudit: intervention_log insert failed:', logErr);
      return;
    }

    const interventionLogId = (log as { id: string }).id;

    // 2. Persistir freno dominante (si hay).
    if (gate.dominantBrake) {
      await BrakeDetector.logBrake({ userId, brake: gate.dominantBrake, interventionLogId });
    }

    // 3. Persistir banderas rojas (si hay) + emitir alerta por cada una.
    for (const flag of gate.redFlags) {
      await RedFlagsDetector.persistRedFlag(userId, flag);
      await InsightRouter.emitInsight(userId, {
        type: 'red_flag_alert',
        content: `Bandera roja: ${flag.category} — ${flag.evidenceText}`,
        payload: { interventionLogId, flag },
      });
    }

    // 4. Invocar principio si el LLM lo mencionó (heurística simple).
    const principleMatch = detectPrincipleInResponse(response);
    if (principleMatch) {
      await PrinciplesMap.invokePrinciple({
        userId,
        principle: principleMatch,
        rationale: `Detectado en respuesta de ARGOS (turno auditado)`,
        interventionLogId,
      });
    }

    // 5. Emit insight de chat (siempre).
    await InsightRouter.emitInsight(userId, {
      type: 'chat_response',
      content: response.slice(0, 200),
      payload: { interventionLogId },
    });
  } catch (err) {
    logError('[ARGOS] persistTurnAudit failed:', err);
  }
}
