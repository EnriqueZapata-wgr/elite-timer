// Coach Engine — Gate Orchestrator (Step COACH 7/N)
// Corre ANTES de cada llamada al LLM de ARGOS: evalúa las dos preguntas
// rectoras, la cascada, el freno dominante y las banderas rojas, y produce
// (a) inyecciones para el system prompt y (b) un payload de auditoría.
// Defensa graceful: el caller envuelve todo en try/catch — si el gate revienta,
// el chat continúa sin gate.

import type { CascadeLevel, Principle, TrafficLight } from './types';
import { evaluateQ1_DoesUserKnow, evaluateQ2_TrafficLight, type Q1Result, type Q2Signal } from './two-questions';
import { selectCascadeLevel } from './cascade';
import { detectBrakes, selectDominantBrake, type DetectedBrake } from './brake-detector';
import { detectRedFlags, type DetectedRedFlag } from './red-flags-detector';
import { warn as logWarn } from '@/src/lib/logger';

export interface CoachGateResult {
  q1: Q1Result;
  q2: TrafficLight | null;
  cascadeLevel: CascadeLevel | null;
  dominantBrake: DetectedBrake | null;
  redFlags: DetectedRedFlag[];
  shouldEscalateToProfessional: boolean;
  // Inyecciones para el system prompt
  promptInjections: {
    voiceLevel: string;
    cascade: string;
    brake: string;
    redFlag: string;
  };
  // Para persistencia posterior (intervention_logs)
  auditPayload: {
    question_1_result: Q1Result;
    question_2_result: TrafficLight | null;
    cascade_level: CascadeLevel | null;
    principle_invoked: Principle | null;
    brake_detected: DetectedBrake['type'] | null;
    signal_description: string | null;
  };
}

const VOICE_LEVEL_TEMPLATES: Record<Q1Result, string> = {
  sabe: 'El cliente es experimentado en salud funcional. Puedes usar vocabulario técnico (HOMA-IR, eje HHG, AMPK), profundizar mecanismos, dar opciones avanzadas.',
  no_sabe: 'El cliente NO es experimentado. Simplifica lenguaje, explica conceptos antes de usarlos, da UNA recomendación clara a la vez. Si la decisión excede tu ámbito, deriva.',
};

const CASCADE_TEMPLATES: Record<CascadeLevel, string> = {
  1: '', // verde, sin override
  2: 'Cascada nivel 2: la señal está amarilla — sugiere ajuste de dosis/intensidad pero NO canceles el plan.',
  3: 'Cascada nivel 3: la señal afecta primariamente — ajusta el plan del día. Documenta la decisión.',
  4: 'Cascada nivel 4: la señal recurre y afecta — propón tests de autoevaluación específicos.',
  5: 'Cascada nivel 5: deriva a profesional especializado. Documenta.',
};

const BRAKE_TEMPLATES: Record<DetectedBrake['type'], string> = {
  no_saber: 'Freno dominante detectado: NO SABER QUÉ HACER. Da conocimiento concreto, no motivación.',
  miedo: 'Freno dominante detectado: MIEDO. Refuerza con evidencia de progreso del cliente, no presiones.',
  energia_biologica: 'Freno dominante detectado: ENERGÍA BIOLÓGICA BAJA. Atiende causa biológica antes de cualquier sugerencia de acción.',
  apatia: 'Freno dominante detectado: APATÍA. Regresa al Acelerador (estándar/sistema/identidad). No ataques la flojera directamente.',
};

const RED_FLAG_TEMPLATE = (flag: DetectedRedFlag): string =>
  `BANDERA ROJA ACTIVA — categoría ${flag.category}. Descripción: "${flag.evidenceText}". OBLIGATORIO: deriva con respeto, NO recomiendes continuar sin atención profesional. Si es categoría sistemica_aguda, prioriza 911 MX.`;

/**
 * Corre el gate del coach-engine para un turno (Step COACH 7/N).
 * Orden: voice/Q1 → Q2 → cascada → frenos → banderas rojas → inyecciones.
 * Cada sub-evaluación es defensiva: si Q1 no tiene voice_config, cae a 'no_sabe'.
 */
export async function runCoachEngineGate(params: {
  userId: string;
  userMessage: string;
  conversationId?: string | null;
  signal?: Q2Signal;
}): Promise<CoachGateResult> {
  // Q1 — ¿el cliente sabe? Si no hay voice_config, evaluateQ1 lanza → default no_sabe.
  // Instrumentamos el fallback para que la causa de un no_sabe sea diagnosticable
  // (bug 7.1 #2): distinguir "config ausente" de "valores por debajo del umbral".
  let q1: Q1Result = 'no_sabe';
  try {
    const r = await evaluateQ1_DoesUserKnow(params.userId);
    q1 = r.result;
    if (r.result === 'no_sabe') {
      logWarn(
        `[coach-gate] q1=no_sabe con voice_config presente (experience=${r.experienceLevel}, ` +
          `self_assessment=${r.selfAssessmentCapacity}); el umbral exige ambos >= 7.`,
      );
    }
  } catch (err) {
    // Causa típica: el usuario (founder temprano) no tiene fila en coach_voice_config
    // porque completó el onboarding antes de que existiera el paso de voz (COACH 4/N).
    // El default conservador 'no_sabe' es correcto; lo dejamos visible para diagnóstico.
    logWarn('[coach-gate] q1=no_sabe — voice_config ausente para el usuario; default conservador.', err);
    q1 = 'no_sabe';
  }

  // Q2 — ¿la señal afecta hoy? (solo si hay señal)
  const q2: TrafficLight | null = params.signal ? evaluateQ2_TrafficLight(params.signal) : null;

  // Cascada — solo si hay semáforo. TODO: recurrence detection (hardcoded false).
  const cascadeLevel: CascadeLevel | null = q2 ? selectCascadeLevel(q2, false) : null;

  // Frenos — heurística sobre el mensaje. TODO: enriquecer context con energía del día.
  const brakes = detectBrakes(params.userMessage, {});
  const dominantBrake = selectDominantBrake(brakes);

  // Banderas rojas — heurística sobre el mensaje.
  const redFlags = detectRedFlags(params.userMessage);
  const shouldEscalateToProfessional =
    redFlags.length > 0 && redFlags.some((f) => f.category === 'sistemica_aguda');

  // Bandera prioritaria para la inyección: la sistémica aguda si existe, sino la primera.
  const primaryFlag = redFlags.find((f) => f.category === 'sistemica_aguda') ?? redFlags[0] ?? null;

  const promptInjections = {
    voiceLevel: VOICE_LEVEL_TEMPLATES[q1],
    cascade: cascadeLevel ? CASCADE_TEMPLATES[cascadeLevel] : '',
    brake: dominantBrake ? BRAKE_TEMPLATES[dominantBrake.type] : '',
    redFlag: primaryFlag ? RED_FLAG_TEMPLATE(primaryFlag) : '',
  };

  return {
    q1,
    q2,
    cascadeLevel,
    dominantBrake,
    redFlags,
    shouldEscalateToProfessional,
    promptInjections,
    auditPayload: {
      question_1_result: q1,
      question_2_result: q2,
      cascade_level: cascadeLevel,
      principle_invoked: null, // se determina post-LLM (detectPrincipleInResponse)
      brake_detected: dominantBrake?.type ?? null,
      signal_description: params.signal ? `${params.signal.type}=${params.signal.value}` : null,
    },
  };
}

/**
 * Construye el bloque de texto que se concatena al system prompt de ARGOS con
 * el resultado del gate del turno actual. Pure — testeable sin Supabase.
 */
export function buildCoachGateInjection(g: CoachGateResult): string {
  const blocks: string[] = ['\n\n=== COACH ENGINE GATE — TURNO ACTUAL ==='];

  blocks.push(g.promptInjections.voiceLevel);
  if (g.promptInjections.cascade) blocks.push(g.promptInjections.cascade);
  if (g.promptInjections.brake) blocks.push(g.promptInjections.brake);
  if (g.promptInjections.redFlag) blocks.push(g.promptInjections.redFlag);

  if (g.shouldEscalateToProfessional) {
    blocks.push('⚠️ ESCALACIÓN A PROFESIONAL OBLIGATORIA EN ESTE TURNO. Deriva con respeto. Si emergencia, 911 MX.');
  }

  blocks.push('=== FIN COACH ENGINE GATE ===\n');
  return blocks.join('\n\n');
}
