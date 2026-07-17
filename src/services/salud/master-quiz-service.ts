/**
 * master-quiz-service — persistencia del Cuestionario Maestro (Mega-Sprint D · D6).
 * Auto-save por respuesta + resume. Defensivo: lecturas fail-soft.
 *
 * También arma el PUENTE al motor: convierte el fenotipo del cuestionario en un
 * UserPhenotype consumible por personalize-interventions (que NO se toca) para el
 * resumen final "ATP te prescribe estas 5".
 */
import { supabase } from '@/src/lib/supabase';
import { generateUUID } from '@/src/services/routine-service';
import { warn as logWarn } from '@/src/lib/logger';
import { MASTER_QUIZ_BY_CODE } from '@/src/constants/master-quiz-bank';
import { type QuizAnswers } from './master-quiz-core';
// El puente al motor es PURO y vive en core (testeable sin supabase); se re-exporta.
export { quizPhenotypeToMotorPhenotype, buildMotorPhenotypeFromAnswers } from './master-quiz-core';

export const MASTER_QUIZ_CHANGED_EVENT = 'master_quiz_changed';

export interface LoadedQuiz {
  answers: QuizAnswers;
  skipped: Set<string>;
}

/** Carga todas las respuestas del user (para resume). */
export async function loadMasterQuiz(userId: string): Promise<LoadedQuiz> {
  try {
    const { data } = await supabase
      .from('user_master_quiz')
      .select('question_code, answer, skipped')
      .eq('user_id', userId);
    const answers: QuizAnswers = {};
    const skipped = new Set<string>();
    for (const row of (data ?? []) as any[]) {
      if (row.skipped) skipped.add(row.question_code);
      else answers[row.question_code] = row.answer;
    }
    return { answers, skipped };
  } catch (e) {
    logWarn('[master-quiz] load failed', e);
    return { answers: {}, skipped: new Set() };
  }
}

/** Guarda (upsert) una respuesta. Auto-save no bloqueante. */
export async function saveAnswer(
  userId: string, questionCode: string, answer: unknown, skipped = false,
): Promise<boolean> {
  const section = MASTER_QUIZ_BY_CODE[questionCode]?.section ?? 'unknown';
  try {
    const { error } = await supabase.from('user_master_quiz').upsert({
      id: generateUUID(),
      user_id: userId,
      question_code: questionCode,
      section,
      answer: answer ?? null,
      skipped,
      answered_at: new Date().toISOString(),
    }, { onConflict: 'user_id,question_code' });
    if (error) { logWarn('[master-quiz] save failed', error); return false; }
    return true;
  } catch (e) {
    logWarn('[master-quiz] save threw', e);
    return false;
  }
}

/** Marca una sección/pregunta como omitida (flag incompleta). */
export async function skipQuestion(userId: string, questionCode: string): Promise<boolean> {
  return saveAnswer(userId, questionCode, null, true);
}

