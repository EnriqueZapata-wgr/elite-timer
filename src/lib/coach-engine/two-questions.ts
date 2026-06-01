// Coach Engine — Dos Preguntas Rectoras
// Brief §6.2 — P1 (¿el cliente sabe?) + P2 (¿la señal afecta hoy?).
// System prompt Bloque 7. Corre ANTES de la llamada al LLM.
// TODO (sub-session COACH 5/N): implementar evaluateQ1/evaluateQ2 leyendo
// coach_voice_config (experience_level, self_assessment_capacity) + señales.

import type { TrafficLight } from './types';

export type Q1Result = 'sabe' | 'no_sabe';

export function evaluateQ1_DoesUserKnow(_userId: string): Promise<Q1Result> {
  // TODO: combinar experience_level + self_assessment_capacity del voice_config.
  throw new Error('TODO: implement evaluateQ1_DoesUserKnow');
}

export function evaluateQ2_TrafficLight(_userId: string, _signal: { metric: string; value: number }): Promise<TrafficLight> {
  // TODO: clasificar afectación de la señal sobre la decisión de hoy.
  throw new Error('TODO: implement evaluateQ2_TrafficLight');
}
