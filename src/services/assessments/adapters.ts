/**
 * OLA 4 · Adapters del motor único (Anexo C, pieza 3, capa pura).
 *
 * El hallazgo que sostiene todo el colapso de rutas: InputType de
 * master-quiz-bank ya cubre el 100% de las formas de pregunta de los otros
 * tres motores. El booleano de los funcionales es un toggle, el single_select
 * del de base de datos es un single, el del cronotipo también.
 *
 * Aquí se demuestra: cada motor se normaliza a UnifiedQuestion, que reusa
 * InputType y QuizOption tal cual. Lo único que cambiaba entre motores era el
 * scorer, y los tres viven abajo como funciones puras.
 *
 * Módulo PURO: sin supabase, sin react. Los scorers de quiz-engine-service y
 * quiz-service hoy no tienen ninguna prueba; estos sí.
 */
import type { InputType, QuizOption, MasterQuizQuestion } from '@/src/constants/master-quiz-bank';
import type { FunctionalQuiz, ResultInsight } from '@/src/constants/functional-quizzes';

/**
 * La forma única de pregunta que consume el motor.
 * Reusa InputType y QuizOption del banco maestro: esa es la prueba de que un
 * solo widget de captura sirve para los cuatro motores.
 */
export interface UnifiedQuestion {
  /** Llave con la que se guarda la respuesta. */
  code: string;
  text: string;
  type: InputType;
  options?: QuizOption[];
  /** El flash "por qué importa" de los funcionales. */
  why?: string;
  allowPreferNot?: boolean;
  /**
   * Lo que QuestionInput necesita para pintar escala, número y multi.
   * Viajan aquí porque son de RENDER, no de contenido: sin ellos el banco
   * maestro perdía sus escalas visuales al pasar por el adapter.
   */
  min?: number;
  max?: number;
  unit?: string;
  scaleLabels?: [string, string];
  multiHelper?: boolean;
  placeholder?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter 1 · cuestionarios funcionales (banco const, cierto o falso)
// ─────────────────────────────────────────────────────────────────────────────

const SI_NO: QuizOption[] = [
  { value: 'true', label: 'Cierto' },
  { value: 'false', label: 'Falso' },
];

/** El booleano de los funcionales es, exactamente, un toggle. */
export function fromFunctionalQuiz(quiz: FunctionalQuiz): UnifiedQuestion[] {
  return quiz.questions.map((q) => ({
    code: q.id,
    text: q.text,
    type: 'toggle' as InputType,
    options: SI_NO,
    // Se conserva el flash "POR QUÉ IMPORTA" como capacidad del motor.
    why: q.rootCause,
  }));
}

/** Cada "cierto" suma su peso al dominio; los insights se activan por umbral. */
export function scoreFunctional(
  quiz: FunctionalQuiz,
  answers: Record<string, boolean>,
): { domainScores: Record<string, number>; activeInsights: ResultInsight[] } {
  const domainScores: Record<string, number> = {};
  for (const d of quiz.domains) domainScores[d.id] = 0;

  for (const q of quiz.questions) {
    if (answers[q.id] !== true) continue;
    domainScores[q.domain] = (domainScores[q.domain] ?? 0) + q.weight;
  }

  const activeInsights = quiz.resultInsights.filter(
    (i) => (domainScores[i.domain] ?? 0) >= i.threshold,
  );
  return { domainScores, activeInsights };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter 2 · quizzes de base de datos (single y multi)
// ─────────────────────────────────────────────────────────────────────────────

export interface DbQuizQuestion {
  question_id: number;
  question_text: string;
  question_type: 'single_select' | 'multi_select';
  options: { text: string; scores: Record<string, number> }[];
}

/**
 * single_select es single y multi_select es multi. El valor de la opción es su
 * índice, que es como ya se guardan las respuestas en quiz_responses.
 */
export function fromDbQuiz(questions: DbQuizQuestion[]): UnifiedQuestion[] {
  return questions.map((q) => ({
    code: String(q.question_id),
    text: q.question_text,
    type: (q.question_type === 'multi_select' ? 'multi' : 'single') as InputType,
    options: q.options.map((o, idx) => ({ value: String(idx), label: o.text })),
  }));
}

/**
 * Promedio por dominio de los scores de las opciones elegidas, redondeado y
 * acotado. Réplica exacta de calculateDomainScores, que hoy no tiene pruebas.
 */
export function scoreAvgClamp(
  questions: DbQuizQuestion[],
  answers: Record<number, number | number[]>,
  min = 0,
  max = 100,
): Record<string, number> {
  const totals: Record<string, number[]> = {};

  for (const q of questions) {
    const answer = answers[q.question_id];
    if (answer === undefined) continue;
    const indices = Array.isArray(answer) ? answer : [answer];
    for (const idx of indices) {
      const option = q.options[idx];
      if (!option?.scores) continue;
      for (const [domain, score] of Object.entries(option.scores)) {
        (totals[domain] ??= []).push(score);
      }
    }
  }

  const scores: Record<string, number> = {};
  for (const [domain, values] of Object.entries(totals)) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    scores[domain] = Math.round(Math.min(max, Math.max(min, avg)));
  }
  return scores;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter 3 · cronotipo (banco en quiz_templates)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChronoQuestion {
  id: string;
  text: string;
  options: { id: string; text: string; scores: Record<string, number> }[];
}

export function fromChronotypeQuiz(questions: ChronoQuestion[]): UnifiedQuestion[] {
  return questions.map((q) => ({
    code: q.id,
    text: q.text,
    type: 'single' as InputType,
    options: q.options.map((o) => ({ value: o.id, label: o.text })),
  }));
}

/**
 * Suma por animal y gana el mayor. El desempate es declarado, no accidental:
 * sin él, dos animales empatados dependerían del orden de las llaves.
 */
export function scoreSumMax(
  questions: ChronoQuestion[],
  answers: Record<string, string>,
  tieBreak: string[],
): { scores: Record<string, number>; result: string } {
  const scores: Record<string, number> = {};
  for (const key of tieBreak) scores[key] = 0;

  for (const q of questions) {
    const chosen = answers[q.id];
    if (chosen === undefined) continue;
    const option = q.options.find((o) => o.id === chosen);
    if (!option) continue;
    for (const [key, value] of Object.entries(option.scores)) {
      scores[key] = (scores[key] ?? 0) + value;
    }
  }

  let result = tieBreak[0];
  let best = -Infinity;
  // Se recorre en el orden del desempate: el primero en la lista gana empates.
  for (const key of tieBreak) {
    const v = scores[key] ?? 0;
    if (v > best) { best = v; result = key; }
  }
  return { scores, result };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter 4 · cuestionario maestro
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El Maestro no necesita adapter de forma: su banco YA está en InputType y su
 * core (master-quiz-core) ya es puro y ramifica por género, deep dives y
 * skipWhen. El motor lo consume tal cual; esta función solo estrecha la vista
 * a lo que el widget de captura necesita.
 */
export function fromMasterQuiz(questions: MasterQuizQuestion[]): UnifiedQuestion[] {
  return questions.map((q) => ({
    code: q.code,
    text: q.text,
    type: q.type,
    options: q.options,
    why: q.why,
    allowPreferNot: q.allowPreferNot,
    min: q.min,
    max: q.max,
    unit: q.unit,
    scaleLabels: q.scaleLabels,
    multiHelper: q.multiHelper,
    placeholder: q.placeholder,
  }));
}
