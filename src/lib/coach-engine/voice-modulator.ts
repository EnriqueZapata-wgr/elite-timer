// Coach Engine — Modulador de Voz
// Brief §11.4 — inyecta coach_voice_config en el system prompt antes de cada llamada.
// Voice config dinámico (reemplaza la capa transicional del prompt).
// TODO (sub-session COACH 6/N): implementar buildVoiceInjection() que traduzca
// coach_voice_config a instrucciones de tono/formalidad/vocabulario/idioma.

import type { CoachVoiceConfig } from './types';

export async function getVoiceConfig(_userId: string): Promise<CoachVoiceConfig | null> {
  // TODO: leer coach_voice_config del usuario.
  throw new Error('TODO: implement getVoiceConfig');
}

export function buildVoiceInjection(_config: CoachVoiceConfig): string {
  // TODO: producir el bloque de voz que se concatena al system prompt.
  throw new Error('TODO: implement buildVoiceInjection');
}
