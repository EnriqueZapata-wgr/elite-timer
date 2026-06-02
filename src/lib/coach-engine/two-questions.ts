// Coach Engine — Dos Preguntas Rectoras
// Brief §6.2 — P1 (¿el cliente sabe?) + P2 (¿la señal afecta hoy?).
// System prompt Bloque 7. Corren ANTES de la llamada al LLM: son el filtro
// previo a cada respuesta sustantiva ("Antes de decidir, dos preguntas").

import type { TrafficLight } from './types';
import { getVoiceConfig } from './voice-modulator';

export type Q1Result = 'sabe' | 'no_sabe';

/** Umbral (1-10) a partir del cual experience_level y self_assessment se consideran "altos". */
const KNOWS_THRESHOLD = 7;

/** Señal observable que entra a P2 (HRV, glucosa, sueño, etc.) con sus umbrales. */
export interface Q2Signal {
  type: string;
  value: number;
  thresholds: { yellow: number; red: number };
}

/**
 * Pregunta 1 — ¿El cliente sabe lo que hace? (Bloque 7 P1)
 * Combina experience_level + self_assessment_capacity del voice_config:
 * ambos >= 7 → 'sabe'; uno o ambos bajos → 'no_sabe'. Throw si no hay config.
 */
export async function evaluateQ1_DoesUserKnow(userId: string): Promise<{
  result: Q1Result;
  experienceLevel: number;
  selfAssessmentCapacity: number;
}> {
  const config = await getVoiceConfig(userId);
  if (!config) {
    throw new Error('two-questions: voice_config not found for user');
  }
  const experienceLevel = config.experience_level ?? 0;
  const selfAssessmentCapacity = config.self_assessment_capacity ?? 0;
  const result: Q1Result =
    experienceLevel >= KNOWS_THRESHOLD && selfAssessmentCapacity >= KNOWS_THRESHOLD
      ? 'sabe'
      : 'no_sabe';
  return { result, experienceLevel, selfAssessmentCapacity };
}

/**
 * Pregunta 2 — ¿La señal afecta la decisión de hoy? (Bloque 7 P2)
 * Clasifica con semáforo. Infiere la dirección por el orden de los thresholds:
 * - "más es peor" (red >= yellow, ej. glucosa): >= red → rojo, >= yellow → amarillo.
 * - "menos es peor" (red < yellow, ej. HRV): <= red → rojo, <= yellow → amarillo.
 * El caller pasa thresholds en el sentido correcto y la dirección se deduce sola.
 */
export function evaluateQ2_TrafficLight(signal: Q2Signal): TrafficLight {
  const { value, thresholds } = signal;
  const higherIsWorse = thresholds.red >= thresholds.yellow;

  if (higherIsWorse) {
    if (value >= thresholds.red) return 'rojo';
    if (value >= thresholds.yellow) return 'amarillo';
    return 'verde';
  }

  // "menos es peor" (ej. HRV): valores bajos escalan a amarillo/rojo.
  if (value <= thresholds.red) return 'rojo';
  if (value <= thresholds.yellow) return 'amarillo';
  return 'verde';
}

/**
 * Compone las dos preguntas rectoras. Q2 es opcional: si no hay señal, retorna
 * null (no toda interacción trae una señal observable). Bloque 7.
 */
export async function answerTwoQuestions(
  userId: string,
  signal?: Q2Signal,
): Promise<{ q1: Q1Result; q2: TrafficLight | null }> {
  const { result: q1 } = await evaluateQ1_DoesUserKnow(userId);
  const q2 = signal ? evaluateQ2_TrafficLight(signal) : null;
  return { q1, q2 };
}

// INTEGRATION TEST: evaluateQ1_DoesUserKnow(userId) con voice_config exp=8,sac=8 → 'sabe'
// INTEGRATION TEST: evaluateQ1_DoesUserKnow(userId) sin config → throws 'voice_config not found'
// TEST: evaluateQ2_TrafficLight({ type: 'glucosa', value: 180, thresholds: { yellow: 140, red: 200 } }) === 'amarillo'
// TEST: evaluateQ2_TrafficLight({ type: 'glucosa', value: 220, thresholds: { yellow: 140, red: 200 } }) === 'rojo'
// TEST: evaluateQ2_TrafficLight({ type: 'glucosa', value: 100, thresholds: { yellow: 140, red: 200 } }) === 'verde'
// TEST: evaluateQ2_TrafficLight({ type: 'hrv', value: 30, thresholds: { yellow: 50, red: 35 } }) === 'rojo' ("menos es peor")
