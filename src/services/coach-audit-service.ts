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
 * Heurística v2 (Step COACH 7.1/N): detecta el principio invocado por el LLM con
 * patrones de FRASE (no palabras sueltas, que el LLM rara vez usa explícitas).
 * Sigue siendo imperfecta — si un mensaje toca varios principios, solo persiste el
 * primero que matchea. Upgrade, no perfección. TODO Mariana: clasificador semántico.
 */
const PRINCIPLE_PATTERNS: { principle: Principle; patterns: RegExp[] }[] = [
  {
    principle: 'identidad',
    patterns: [
      /\b(qui[eé]n\s+eres|qui[eé]n\s+crees\s+ser|tu\s+identidad|c[oó]mo\s+te\s+ves)\b/i,
      /\b(no\s+es\s+lo\s+que\s+haces|es\s+lo\s+que\s+eres)\b/i,
    ],
  },
  {
    principle: 'estandar',
    patterns: [
      /\b(tu\s+est[aá]ndar|sube\s+(el|tu)\s+est[aá]ndar|nivel\s+de\s+exigencia)\b/i,
      /\b(piso\s+no\s+negociable|m[ií]nimo\s+no\s+negociable)\b/i,
    ],
  },
  {
    principle: 'proposito',
    patterns: [/\b(tu\s+prop[oó]sito|para\s+qu[eé]\s+lo\s+haces|motivaci[oó]n\s+ra[ií]z)\b/i],
  },
  {
    principle: 'filosofia',
    patterns: [
      /\b(tu\s+(filosof[ií]a|cosmovisi[oó]n)|c[oó]mo\s+ves\s+(el|tu)\s+mundo)\b/i,
      /\b(el\s+lenguaje\s+construye|c[oó]mo\s+lo\s+nombras)\b/i,
    ],
  },
  {
    principle: 'fisiologia',
    patterns: [
      /\b(eje\s+(hormonal|HHG|HHS|HHT)|ritmo\s+circadiano|regulaci[oó]n\s+gluc[eé]mica)\b/i,
      /\b(sistema\s+inmune|sistema\s+nervioso\s+aut[oó]nomo)\b/i,
    ],
  },
  {
    principle: 'biomecanica',
    patterns: [/\b(biomec[aá]nica|palanca|vector\s+de\s+fuerza|integridad\s+articular|postura)\b/i],
  },
  {
    principle: 'mecanismos_biologicos',
    patterns: [
      /\b(mitocondria|aut[oó]fagia|AMPK|mTOR|v[ií]a\s+metab[oó]lica|cadena\s+de\s+transporte)\b/i,
      /\b(se[nñ]alizaci[oó]n\s+celular|metilaci[oó]n|HOMA-?IR)\b/i,
    ],
  },
];

export function detectPrincipleInResponse(text: string): Principle | null {
  for (const { principle, patterns } of PRINCIPLE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return principle;
    }
  }
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
