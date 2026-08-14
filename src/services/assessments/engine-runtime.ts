/**
 * OLA 4 · Runtime del motor único de cuestionarios (Anexo C, pieza 3b).
 *
 * La capa pura vive en adapters.ts: normaliza los 4 bancos a UnifiedQuestion y
 * puntúa. Este módulo es la capa SUCIA: resuelve el banco contra la base,
 * retoma el avance guardado y ejecuta los efectos al terminar.
 *
 * REGLA que ordena todo el archivo: cada familia conserva EXACTAMENTE la
 * persistencia y los efectos que tiene hoy. No se inventa una tabla, no se
 * renombra una columna y no se mueve el momento en que se escribe:
 *
 *  - funcional  → functional_quiz_results (parcial cada 10 y al salir; completo
 *                 al final) + electrón functional_quiz + electrons_changed.
 *  - db-quiz    → quiz_responses SOLO cuando la persona acepta, porque activar
 *                 protocolos es decisión explícita (B-5 MB-12). No se adelanta.
 *  - cronotipo  → quiz_results + user_chronotype SOLO al activar, igual que hoy.
 *  - maestro    → user_master_quiz, una fila por respuesta, al momento.
 *
 * Lo único nuevo es el borrador local: las dos familias que hoy NO tienen dónde
 * guardar avance parcial (db-quiz y cronotipo) lo dejan en AsyncStorage. Es
 * estado de captura, no dato de salud, y por eso no toca ninguna tabla.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { getQuizById, type FunctionalQuiz, type ResultInsight } from '@/src/constants/functional-quizzes';
import { awardBooleanElectron } from '@/src/services/electron-service';
import {
  getQuiz, evaluateRecommendations, saveQuizResponse, activateRecommendedProtocols,
  type QuizData, type QuizRecommendation,
} from '@/src/services/quiz-engine-service';
import {
  getQuizTemplate, submitQuizResult, saveUserChronotype,
  type QuizTemplate, type QuizQuestion, type Chronotype, type ChronotypeInfo,
} from '@/src/services/quiz-service';
import { loadMasterQuiz, saveAnswer, skipQuestion } from '@/src/services/salud/master-quiz-service';
import {
  nextQuestion, computeProgress, orderedVisible,
  type QuizContext, type QuizAnswers,
} from '@/src/services/salud/master-quiz-core';
import type { Assessment } from '@/src/constants/assessments';
import {
  fromFunctionalQuiz, fromDbQuiz, fromChronotypeQuiz, fromMasterQuiz,
  scoreFunctional, scoreAvgClamp, scoreSumMax,
  type UnifiedQuestion, type DbQuizQuestion, type ChronoQuestion,
} from './adapters';

// ─────────────────────────────────────────────────────────────────────────────
// Qué familia de motor le toca a cada evaluación
// ─────────────────────────────────────────────────────────────────────────────

export type EngineFamily = 'functional' | 'db-quiz' | 'chronotype' | 'master';

/**
 * Se deduce del banco declarado en el registry, no de una lista aparte: si
 * mañana entra un quiz funcional nuevo, el motor lo reconoce solo.
 * Devuelve null para lo que el motor todavía no cubre (historia clínica y los
 * cuestionarios de Edad ATP), y entonces el hub sigue abriendo su ruta vieja.
 */
export function engineFamily(a: Assessment): EngineFamily | null {
  if (a.kind !== 'quiz') return null;
  if (a.bank.kind === 'const') {
    if (a.bank.module === 'functional-quizzes') return 'functional';
    if (a.bank.module === 'master-quiz-bank') return 'master';
    return null;
  }
  if (a.bank.kind === 'db') {
    if (a.bank.table === 'quizzes') return 'db-quiz';
    if (a.bank.table === 'quiz_templates') return 'chronotype';
  }
  return null;
}

/**
 * Saltar una pregunta es honesto donde la respuesta ausente simplemente no
 * suma, y es mentira donde el resultado es categórico: el cronotipo reparte
 * puntos entre cuatro animales y una pregunta menos cambia el animal. Por eso
 * ahí no se ofrece.
 */
export function allowsSkip(family: EngineFamily): boolean {
  return family !== 'chronotype';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sesión
// ─────────────────────────────────────────────────────────────────────────────

export interface EngineSession {
  family: EngineFamily;
  assessment: Assessment;
  /** Banco normalizado. En el maestro es la foto inicial: ahí manda el core. */
  questions: UnifiedQuestion[];
  answers: Record<string, unknown>;
  skipped: Set<string>;
  /** Dónde retoma. null cuando ya no queda pregunta pendiente. */
  startCode: string | null;
  /** Ya lo había terminado antes: se entra directo al resultado. */
  completed: boolean;
  ctx: QuizContext;
  /** Fila en progreso de functional_quiz_results. */
  rowId: string | null;
  raw: {
    functional?: FunctionalQuiz;
    db?: QuizData;
    chrono?: QuizTemplate;
  };
}

export class AssessmentLoadError extends Error {}

export async function loadSession(assessment: Assessment, userId: string): Promise<EngineSession> {
  const family = engineFamily(assessment);
  if (!family) throw new AssessmentLoadError('Esta evaluación todavía no corre en el motor único.');

  switch (family) {
    case 'functional': return loadFunctional(assessment, userId);
    case 'db-quiz': return loadDbQuiz(assessment, userId);
    case 'chronotype': return loadChronotype(assessment, userId);
    case 'master': return loadMaster(assessment, userId);
  }
}

// ── funcional ────────────────────────────────────────────────────────────────

async function loadFunctional(assessment: Assessment, userId: string): Promise<EngineSession> {
  const key = assessment.bank.kind === 'const' ? assessment.bank.key : undefined;
  const quiz = getQuizById(key ?? assessment.id);
  if (!quiz) throw new AssessmentLoadError('Evaluación no encontrada.');
  const questions = fromFunctionalQuiz(quiz);

  // Mismo orden de lectura que la pantalla vieja: primero si ya lo terminó,
  // luego si lo dejó a medias.
  const { data: done } = await supabase
    .from('functional_quiz_results')
    .select('*')
    .eq('user_id', userId).eq('quiz_id', quiz.id).eq('is_complete', true)
    .order('completed_at', { ascending: false }).limit(1).maybeSingle();

  if (done) {
    return {
      family: 'functional', assessment, questions,
      answers: normalizeBooleans(done.responses ?? {}),
      skipped: new Set(), startCode: null, completed: true,
      ctx: { gender: 'non_binary' }, rowId: done.id, raw: { functional: quiz },
    };
  }

  const { data: partial } = await supabase
    .from('functional_quiz_results')
    .select('*')
    .eq('user_id', userId).eq('quiz_id', quiz.id).eq('is_complete', false)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  const index = Math.min(partial?.current_question ?? 0, questions.length - 1);
  return {
    family: 'functional', assessment, questions,
    answers: normalizeBooleans(partial?.responses ?? {}),
    skipped: new Set(), startCode: questions[index]?.code ?? questions[0]?.code ?? null,
    completed: false, ctx: { gender: 'non_binary' },
    rowId: partial?.id ?? null, raw: { functional: quiz },
  };
}

/** En la tabla el booleano es booleano; en el motor viaja como valor de opción. */
function normalizeBooleans(stored: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(stored)) out[k] = v === true ? 'true' : 'false';
  return out;
}

function toBooleanAnswers(answers: Record<string, unknown>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (v === undefined || v === null) continue;
    out[k] = v === true || v === 'true';
  }
  return out;
}

// ── quiz de base de datos ────────────────────────────────────────────────────

async function loadDbQuiz(assessment: Assessment, userId: string): Promise<EngineSession> {
  const quizId = assessment.bank.kind === 'db' ? assessment.bank.value : assessment.id;
  const quiz = await getQuiz(quizId);
  if (!quiz) throw new AssessmentLoadError('Cuestionario no encontrado.');
  const questions = fromDbQuiz(quiz.questions as unknown as DbQuizQuestion[]);
  const draft = await readDraft(userId, assessment.id);
  return {
    family: 'db-quiz', assessment, questions,
    answers: draft?.answers ?? {}, skipped: new Set(draft?.skipped ?? []),
    startCode: draft?.code ?? questions[0]?.code ?? null,
    completed: false, ctx: { gender: 'non_binary' }, rowId: null,
    raw: { db: quiz },
  };
}

function toDbAnswers(answers: Record<string, unknown>): Record<number, number | number[]> {
  const out: Record<number, number | number[]> = {};
  for (const [code, v] of Object.entries(answers)) {
    const id = Number(code);
    if (!Number.isFinite(id) || v === undefined || v === null) continue;
    out[id] = Array.isArray(v) ? v.map(Number) : Number(v);
  }
  return out;
}

// ── cronotipo ────────────────────────────────────────────────────────────────

async function loadChronotype(assessment: Assessment, userId: string): Promise<EngineSession> {
  const slug = assessment.bank.kind === 'db' ? assessment.bank.value : 'chronotype';
  const template = await getQuizTemplate(slug);
  if (!template) throw new AssessmentLoadError('El test no está disponible ahora.');
  const questions = fromChronotypeQuiz(template.questions as unknown as ChronoQuestion[]);
  const draft = await readDraft(userId, assessment.id);
  return {
    family: 'chronotype', assessment, questions,
    answers: draft?.answers ?? {}, skipped: new Set(),
    startCode: draft?.code ?? questions[0]?.code ?? null,
    completed: false, ctx: { gender: 'non_binary' }, rowId: null,
    raw: { chrono: template },
  };
}

// ── maestro ──────────────────────────────────────────────────────────────────

async function loadMaster(assessment: Assessment, userId: string): Promise<EngineSession> {
  const [{ answers, skipped }, profile] = await Promise.all([
    loadMasterQuiz(userId),
    supabase.from('client_profiles').select('biological_sex').eq('user_id', userId).maybeSingle()
      .then((r) => (r.data as { biological_sex?: string } | null) ?? null, () => null),
  ]);
  const sex = profile?.biological_sex;
  const ctx: QuizContext = { gender: sex === 'female' ? 'female' : sex === 'male' ? 'male' : 'non_binary' };
  const first = nextQuestion(answers, null, ctx, skipped);
  return {
    family: 'master', assessment,
    questions: fromMasterQuiz(orderedVisible(answers, ctx)),
    answers, skipped, startCode: first?.code ?? null,
    completed: first === null, ctx, rowId: null, raw: {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Navegación: el motor camina por CÓDIGO, no por índice
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El maestro ramifica: una respuesta puede insertar sub-preguntas. Por eso la
 * lista visible se recalcula con el core en vez de congelarse al cargar.
 */
export function visibleQuestions(session: EngineSession, answers: Record<string, unknown>): UnifiedQuestion[] {
  if (session.family !== 'master') return session.questions;
  return fromMasterQuiz(orderedVisible(answers as QuizAnswers, session.ctx));
}

export function questionByCode(
  session: EngineSession, answers: Record<string, unknown>, code: string | null,
): UnifiedQuestion | null {
  if (!code) return null;
  return visibleQuestions(session, answers).find((q) => q.code === code) ?? null;
}

export function nextCode(
  session: EngineSession, answers: Record<string, unknown>, skipped: Set<string>, current: string | null,
): string | null {
  if (session.family === 'master') {
    return nextQuestion(answers as QuizAnswers, current, session.ctx, skipped)?.code ?? null;
  }
  const list = session.questions;
  const i = list.findIndex((q) => q.code === current);
  return list[i + 1]?.code ?? null;
}

export function prevCode(
  session: EngineSession, answers: Record<string, unknown>, current: string | null,
): string | null {
  const list = visibleQuestions(session, answers);
  const i = list.findIndex((q) => q.code === current);
  return i > 0 ? list[i - 1].code : null;
}

export interface EngineProgress { ratio: number; label: string }

export function progressOf(
  session: EngineSession, answers: Record<string, unknown>, current: string | null,
): EngineProgress {
  if (session.family === 'master') {
    const p = computeProgress(answers as QuizAnswers, session.ctx, current);
    return {
      ratio: p.ratio,
      label: `Sección ${p.sectionIndex + 1} de ${p.sectionTotal} · Pregunta ${p.questionInSection} de ${p.questionsInSection}`,
    };
  }
  const list = session.questions;
  const i = Math.max(0, list.findIndex((q) => q.code === current));
  return { ratio: list.length ? (i + 1) / list.length : 0, label: `${i + 1} de ${list.length}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardado de avance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Se llama en cada respuesta. Solo el maestro escribe una fila por respuesta:
 * es lo que hace hoy y es lo que hace que su resume no dependa de salir bien.
 */
export async function persistAnswer(
  session: EngineSession, userId: string, code: string, value: unknown, wasSkipped: boolean,
): Promise<void> {
  if (session.family !== 'master') return;
  if (wasSkipped) await skipQuestion(userId, code).catch(() => false);
  else await saveAnswer(userId, code, value).catch(() => false);
}

/**
 * Guardar y salir, universal. Cada familia guarda donde puede guardar:
 * el funcional en su fila incompleta, el maestro ya guardó respuesta a
 * respuesta, y las dos que no tienen columna de avance dejan borrador local.
 */
export async function saveProgress(
  session: EngineSession, userId: string,
  answers: Record<string, unknown>, skipped: Set<string>, current: string | null,
): Promise<EngineSession> {
  if (session.family === 'master') return session;

  if (session.family === 'functional') {
    const quiz = session.raw.functional;
    if (!quiz) return session;
    const index = Math.max(0, session.questions.findIndex((q) => q.code === current));
    const payload = {
      user_id: userId,
      quiz_id: quiz.id,
      responses: toBooleanAnswers(answers),
      current_question: index,
      updated_at: new Date().toISOString(),
    };
    if (session.rowId) {
      await supabase.from('functional_quiz_results').update(payload).eq('id', session.rowId);
      return session;
    }
    const { data } = await supabase.from('functional_quiz_results').insert(payload).select('id').single();
    return data ? { ...session, rowId: data.id } : session;
  }

  await writeDraft(userId, session.assessment.id, answers, skipped, current);
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// Terminar: puntuación y efectos
// ─────────────────────────────────────────────────────────────────────────────

export type EngineOutcome =
  | { kind: 'functional'; quiz: FunctionalQuiz; domainScores: Record<string, number>; activeInsights: ResultInsight[] }
  | { kind: 'db-quiz'; quiz: QuizData; domainScores: Record<string, number>; recommendations: QuizRecommendation[] }
  | { kind: 'chronotype'; template: QuizTemplate; scores: Record<string, number>; result: Chronotype; schedule?: ChronotypeInfo }
  | { kind: 'master' };

/**
 * Cierra la captura. Ojo con el reparto de responsabilidades:
 * el funcional SÍ escribe aquí (terminar es el hecho); el db-quiz y el
 * cronotipo NO, porque su escritura depende de una decisión que la persona
 * todavía no toma. Ese orden es el de hoy y se respeta.
 */
export async function finish(
  session: EngineSession, userId: string, answers: Record<string, unknown>,
): Promise<EngineOutcome> {
  switch (session.family) {
    case 'functional': {
      const quiz = session.raw.functional!;
      const responses = toBooleanAnswers(answers);
      const { domainScores, activeInsights } = scoreFunctional(quiz, responses);

      const payload = {
        domain_scores: domainScores,
        active_insights: activeInsights,
        responses,
        current_question: session.questions.length,
        is_complete: true,
        completed_at: new Date().toISOString(),
      };
      if (session.rowId) {
        await supabase.from('functional_quiz_results').update(payload).eq('id', session.rowId);
      } else {
        await supabase.from('functional_quiz_results').insert({ user_id: userId, quiz_id: quiz.id, ...payload });
      }

      try {
        await awardBooleanElectron(userId, 'functional_quiz' as never);
        DeviceEventEmitter.emit('electrons_changed');
      } catch { /* el electrón es premio, no requisito */ }

      return { kind: 'functional', quiz, domainScores, activeInsights };
    }

    case 'db-quiz': {
      const quiz = session.raw.db!;
      const questions = quiz.questions as unknown as DbQuizQuestion[];
      const domainScores = scoreAvgClamp(questions, toDbAnswers(answers));
      const recommendations = await evaluateRecommendations(
        domainScores, quiz.protocol_mapping, quiz.max_recommendations,
      );
      return { kind: 'db-quiz', quiz, domainScores, recommendations };
    }

    case 'chronotype': {
      const template = session.raw.chrono!;
      const questions = template.questions as unknown as ChronoQuestion[];
      const tieBreak = session.assessment.score.kind === 'sum-max'
        ? session.assessment.score.tieBreak
        : ['bear', 'lion', 'wolf', 'dolphin'];
      const { scores, result } = scoreSumMax(questions, answers as Record<string, string>, tieBreak);
      const schedule = template.scoring_logic?.chronotype_schedules?.[result] as ChronotypeInfo | undefined;
      return { kind: 'chronotype', template, scores, result: result as Chronotype, schedule };
    }

    case 'master':
      return { kind: 'master' };
  }
}

/**
 * Segundo tiempo del db-quiz: guardar la respuesta y activar SOLO lo que la
 * persona marcó. Nada preseleccionado, igual que hoy (B-5 MB-12).
 */
export async function acceptProtocols(
  userId: string, quiz: QuizData,
  answers: Record<string, unknown>, domainScores: Record<string, number>,
  recommendations: QuizRecommendation[], acceptedKeys: Set<string>,
): Promise<number> {
  const accepted = recommendations.filter((r) => acceptedKeys.has(r.protocol_key));
  await saveQuizResponse(
    userId, quiz.quiz_id, toDbAnswers(answers), domainScores,
    recommendations.map((r) => r.protocol_key),
    accepted.map((r) => r.protocol_key),
  );
  if (accepted.length === 0) return 0;
  return activateRecommendedProtocols(userId, accepted);
}

/**
 * Segundo tiempo del cronotipo: sin horarios NO se guarda nada, porque activar
 * un cronotipo que nunca aterrizó en la base es peor que no activarlo (E-9).
 * saveUserChronotype emite chronotype_changed por dentro.
 */
export async function activateChronotype(
  template: QuizTemplate, answers: Record<string, unknown>,
  scores: Record<string, number>, result: Chronotype, schedule: ChronotypeInfo,
): Promise<void> {
  await submitQuizResult(template.id, answers as Record<string, string>, scores, result, { schedule });
  await saveUserChronotype(result, schedule, scores);
}

// ─────────────────────────────────────────────────────────────────────────────
// Borrador local (solo donde no hay columna de avance)
// ─────────────────────────────────────────────────────────────────────────────

interface Draft {
  answers: Record<string, unknown>;
  skipped: string[];
  code: string | null;
}

const draftKey = (userId: string, assessmentId: string) => `atp.assessment.draft.${userId}.${assessmentId}`;

export async function readDraft(userId: string, assessmentId: string): Promise<Draft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(userId, assessmentId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch { return null; }
}

export async function writeDraft(
  userId: string, assessmentId: string,
  answers: Record<string, unknown>, skipped: Set<string>, code: string | null,
): Promise<void> {
  try {
    const draft: Draft = { answers, skipped: [...skipped], code };
    await AsyncStorage.setItem(draftKey(userId, assessmentId), JSON.stringify(draft));
  } catch { /* el borrador es comodidad, no dato */ }
}

export async function clearDraft(userId: string, assessmentId: string): Promise<void> {
  try { await AsyncStorage.removeItem(draftKey(userId, assessmentId)); } catch { /* idem */ }
}

/** Solo para que el motor sepa si ofrecer el atajo de "prefiero no responder". */
export type { UnifiedQuestion, QuizRecommendation, QuizData, QuizTemplate, QuizQuestion, ChronotypeInfo, Chronotype };
