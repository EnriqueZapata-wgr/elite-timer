/**
 * Coach Voice Config Service — Step COACH 4/N.
 *
 * Traduce las 16 respuestas del onboarding de voz (ver
 * `voice-config-questions.ts`) a los parámetros de `coach_voice_config`
 * y los persiste. El bloque que ARGOS inyecta al system prompt lo construye
 * `voice-modulator.ts` a partir de esta config.
 */
import { supabase } from '@/src/lib/supabase';
import type { CoachVoiceConfig } from '@/src/lib/coach-engine/types';
import { VOICE_CONFIG_QUESTIONS } from '@/src/constants/voice-config-questions';

/** Config derivada de las respuestas. `user_id` se inyecta al guardar. */
export type DerivedVoiceConfig = Omit<CoachVoiceConfig, 'user_id'>;

// === HELPERS ===

function findOption(questionId: string, optionId: string | undefined) {
  if (!optionId) return undefined;
  const q = VOICE_CONFIG_QUESTIONS.find(qq => qq.id === questionId);
  return q?.options.find(o => o.id === optionId);
}

/** Promedio (redondeado) de los pts de varias preguntas, en escala 1-10. */
function avgPts(answers: Record<string, string>, questionIds: string[]): number {
  const values = questionIds.map(qid => findOption(qid, answers[qid])?.pts ?? 0);
  const sum = values.reduce((s, v) => s + v, 0);
  return Math.round(sum / questionIds.length);
}

/** Combina Q13 (base) + Q14 (modulador) en vocabulary_preference. */
function combineVocabulary(
  q13?: 'conciso' | 'tecnico' | 'equilibrado' | 'cotidiano',
  q14?: 'conciso' | 'tecnico' | 'equilibrado' | 'cotidiano',
): string {
  if (q13 === 'tecnico') return 'profundo_tecnico';
  if (q13 === 'equilibrado') return 'equilibrado';
  if (q13 === 'conciso') {
    if (q14 === 'cotidiano') return 'conciso_cotidiano';
    if (q14 === 'tecnico') return 'conciso_tecnico';
    return 'conciso'; // q14 'equilibrado' o ausente
  }
  return 'equilibrado'; // fallback defensivo
}

// === CÓMPUTO ===

export function computeVoiceConfigFromAnswers(
  answers: Record<string, string>,
): DerivedVoiceConfig {
  const q13Vocab = findOption('Q13', answers['Q13'])?.vocab;
  const q14Vocab = findOption('Q14', answers['Q14'])?.vocab;

  return {
    experience_level: avgPts(answers, ['Q1', 'Q2', 'Q3', 'Q3b']),
    self_assessment_capacity: avgPts(answers, ['Q4', 'Q5', 'Q6']),
    commitment_level: avgPts(answers, ['Q7', 'Q8', 'Q9']),
    formality_level: findOption('Q10', answers['Q10'])?.pts,
    emotional_distance: findOption('Q11', answers['Q11'])?.pts,
    tone: findOption('Q12', answers['Q12'])?.tone,
    vocabulary_preference: combineVocabulary(q13Vocab, q14Vocab),
    language_default: findOption('Q15', answers['Q15'])?.language ?? 'es',
  };
}

// === PERSISTENCIA ===

export async function saveVoiceConfig(
  userId: string,
  config: DerivedVoiceConfig,
): Promise<void> {
  await supabase
    .from('coach_voice_config')
    .upsert(
      {
        user_id: userId,
        ...config,
        derived_from_onboarding: true,
        last_recalibrated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
}

export async function getVoiceConfig(userId: string): Promise<CoachVoiceConfig | null> {
  const { data } = await supabase
    .from('coach_voice_config')
    .select('user_id, tone, formality_level, emotional_distance, vocabulary_preference, commitment_level, experience_level, self_assessment_capacity, language_default')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as CoachVoiceConfig) ?? null;
}
