// Coach Engine — Modulador de Voz
// Brief §11.4 — inyecta coach_voice_config en el system prompt antes de cada llamada.
// Voice config dinámico (reemplaza la capa transicional del prompt).
// Step COACH 4/N: implementado. Lee coach_voice_config y produce el bloque
// que se concatena al system prompt de ARGOS (tono/formalidad/vocabulario/
// idioma + los tres niveles que modulan las dos preguntas rectoras — Bloque 7).

import type { CoachVoiceConfig } from './types';
import { supabase } from '@/src/lib/supabase';

export async function getVoiceConfig(userId: string): Promise<CoachVoiceConfig | null> {
  const { data } = await supabase
    .from('coach_voice_config')
    .select('user_id, tone, formality_level, emotional_distance, vocabulary_preference, commitment_level, experience_level, self_assessment_capacity, language_default')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as CoachVoiceConfig) ?? null;
}

const TONE_LABELS: Record<string, string> = {
  motivador: 'energético / motivacional',
  clinico: 'sereno / clínico, basado en datos',
  cercano: 'cómplice, estamos juntos en esto',
  exigente: 'riguroso, exigente, te empuja',
};

export function buildVoiceInjection(config: CoachVoiceConfig | null): string {
  // Usuario sin voice_config aún (entró antes de este flujo): sin modulación.
  if (!config) return '';

  const lines: string[] = [];
  if (config.language_default) {
    lines.push(`- Idioma default: ${config.language_default}`);
  }
  if (config.tone) {
    lines.push(`- Tono predominante: ${config.tone} (${TONE_LABELS[config.tone] ?? config.tone})`);
  }
  if (typeof config.formality_level === 'number') {
    lines.push(`- Formalidad: ${config.formality_level}/10 (1=casual sin filtros, 5=tú profesional, 9=usted formal)`);
  }
  if (typeof config.emotional_distance === 'number') {
    lines.push(`- Distancia emocional: ${config.emotional_distance}/10 (1=empático y cuidadoso, 9=directo sin endulzar)`);
  }
  if (config.vocabulary_preference) {
    lines.push(`- Registro de vocabulario: ${config.vocabulary_preference}`);
  }
  if (typeof config.experience_level === 'number') {
    lines.push(`- Experience level del cliente: ${config.experience_level}/10 (modula profundidad técnica permitida — ver Bloque 7 P1)`);
  }
  if (typeof config.self_assessment_capacity === 'number') {
    lines.push(`- Self-assessment capacity: ${config.self_assessment_capacity}/10 (modula cuánto confiar en su reporte subjetivo — ver Bloque 7 P1)`);
  }
  if (typeof config.commitment_level === 'number') {
    lines.push(`- Commitment level: ${config.commitment_level}/10 (modula qué tan exigentes son tus recomendaciones)`);
  }

  if (lines.length === 0) return '';

  return `\n\n## VOICE CONFIG DEL CLIENTE\n\n${lines.join('\n')}\n\nAplica estos parámetros AHORA al modular voz y profundidad de cada respuesta a este cliente.`;
}
