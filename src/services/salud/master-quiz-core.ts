/**
 * master-quiz-core — motor PURO del Cuestionario Maestro (Mega-Sprint D · D1+D5).
 * Sin react-native/supabase → testeable node-only.
 *
 *  · Ramificación dinámica: SKIP (por género + skipWhen) + DEEP-DIVE (follow-ups
 *    que aparecen según la respuesta). `nextQuestion` + `orderedVisible` + progreso.
 *  · Scoring → fenotipo: convierte las respuestas en dx_levels + roots +
 *    contraindicaciones + goals, en el MISMO vocabulario que consume el motor
 *    (personalize-interventions, que NO se toca). El cuestionario lo alimenta.
 *
 * C1 (padecimientos): una contraindicación SOLO se dispara si la condición está
 * ACTIVA (historia ≠ estado actual). remisión/resuelto → contexto histórico.
 * C2 (embarazo/lactancia): la pregunta de estado ACTUAL (D9.4b) dispara los flags.
 */
import {
  MASTER_QUIZ_QUESTIONS, MASTER_QUIZ_BY_CODE, MASTER_QUIZ_SECTIONS,
  type MasterQuizQuestion, type SectionId, type ConditionStatus,
} from '@/src/constants/master-quiz-bank';
import type { UserPhenotype } from '@/src/services/interventions/personalize-types';

export type Gender = 'male' | 'female' | 'non_binary';

export interface QuizContext {
  gender: Gender;
  age?: number;
}

/** Respuestas por código de pregunta. Valor según tipo (number, string, string[], …). */
export type QuizAnswers = Record<string, unknown>;

/** Un padecimiento con estado (respuesta de D9.2 · C1). */
export interface ConditionAnswer {
  condition: string;
  status: ConditionStatus;
  year?: number | null;
}

// ── Ramificación (SKIP + DEEP-DIVE) ──────────────────────────────────────────

/** ¿La pregunta base es visible para este contexto? (género + skipWhen). */
export function isVisible(q: MasterQuizQuestion, answers: QuizAnswers, ctx: QuizContext): boolean {
  if (q.femaleOnly && ctx.gender !== 'female') return false;
  if (q.maleOnly && ctx.gender !== 'male') return false;
  if (q.skipWhen && q.skipWhen(answers)) return false;
  return true;
}

/** Códigos de follow-up activados por las respuestas actuales (deep-dive). */
export function activatedFollowUps(answers: QuizAnswers): Set<string> {
  const activated = new Set<string>();
  for (const q of MASTER_QUIZ_QUESTIONS) {
    if (!q.deepDive) continue;
    if (!(q.code in answers)) continue;
    if (q.deepDive.when(answers[q.code])) {
      for (const f of q.deepDive.followUps) activated.add(f);
    }
  }
  return activated;
}

/**
 * Lista ORDENADA de preguntas visibles para este user/estado. Los follow-ups
 * (deep-dive) sólo aparecen si su padre disparó la condición. El total varía por
 * user → el progreso es dinámico.
 */
export function orderedVisible(answers: QuizAnswers, ctx: QuizContext): MasterQuizQuestion[] {
  const activated = activatedFollowUps(answers);
  return MASTER_QUIZ_QUESTIONS.filter((q) => {
    if (q.isFollowUp && !activated.has(q.code)) return false;
    return isVisible(q, answers, ctx);
  });
}

/**
 * Siguiente pregunta a mostrar tras `currentCode` (o la primera si es null).
 * Salta las ya respondidas/omitidas. Devuelve null cuando el cuestionario terminó.
 */
export function nextQuestion(
  answers: QuizAnswers, currentCode: string | null, ctx: QuizContext,
  skipped: Set<string> = new Set(),
): MasterQuizQuestion | null {
  const visible = orderedVisible(answers, ctx);
  const startIdx = currentCode ? visible.findIndex((q) => q.code === currentCode) + 1 : 0;
  for (let i = Math.max(0, startIdx); i < visible.length; i++) {
    const q = visible[i];
    if (q.code in answers || skipped.has(q.code)) continue;
    return q;
  }
  return null;
}

export interface QuizProgress {
  sectionIndex: number;      // 0-based dentro de las secciones visibles
  sectionTotal: number;      // nº de secciones que este user verá
  questionInSection: number; // 1-based
  questionsInSection: number;
  answeredCount: number;
  totalVisible: number;
  ratio: number;             // 0-1
  currentSection: SectionId | null;
}

/** Progreso dinámico ("Sección X de Y · Pregunta N de M"). */
export function computeProgress(
  answers: QuizAnswers, ctx: QuizContext, currentCode: string | null,
): QuizProgress {
  const visible = orderedVisible(answers, ctx);
  const sectionsVisible = MASTER_QUIZ_SECTIONS.filter((s) => visible.some((q) => q.section === s.id));
  const answeredCount = visible.filter((q) => q.code in answers).length;

  const current = currentCode ? MASTER_QUIZ_BY_CODE[currentCode] : (visible[0] ?? null);
  const currentSection = current?.section ?? null;
  const sectionIndex = currentSection ? sectionsVisible.findIndex((s) => s.id === currentSection) : 0;
  const inSection = currentSection ? visible.filter((q) => q.section === currentSection) : [];
  const questionInSection = current ? Math.max(1, inSection.findIndex((q) => q.code === current.code) + 1) : 1;

  return {
    sectionIndex: Math.max(0, sectionIndex),
    sectionTotal: sectionsVisible.length,
    questionInSection,
    questionsInSection: inSection.length,
    answeredCount,
    totalVisible: visible.length,
    ratio: visible.length ? answeredCount / visible.length : 0,
    currentSection,
  };
}

/** ¿Terminó el cuestionario? (no queda pregunta visible sin responder/omitir). */
export function isComplete(answers: QuizAnswers, ctx: QuizContext, skipped: Set<string> = new Set()): boolean {
  return nextQuestion(answers, null, ctx, skipped) === null;
}

// ── Scoring → fenotipo (D5) ──────────────────────────────────────────────────

export interface QuizPhenotype {
  /** dx_levels por sistema (vocabulario del catálogo · 1=roto, 5=óptimo). */
  dxLevels: { system: string; level: 1 | 2 | 3 | 4 | 5 }[];
  /** roots del catálogo con señal (deduplicados). */
  activatedRoots: string[];
  /** flags de contraindicación (SOLO condiciones ACTIVAS + estado reproductivo). */
  contraindications: string[];
  /** objetivos declarados (B.1) en el vocabulario del motor. */
  goals: string[];
  /** contexto histórico (remisión/resuelto) para ARGOS — NO dispara exclusiones. */
  historicalConditions: { condition: string; status: ConditionStatus }[];
}

const clamp = (n: number): 1 | 2 | 3 | 4 | 5 => Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');
const asNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') as string[] : []);

/** Convierte las respuestas en el fenotipo epigenético que consume el motor. */
export function scoreToPhenotype(answers: QuizAnswers): QuizPhenotype {
  const dx: Record<string, number> = {};
  const roots = new Set<string>();
  const contra = new Set<string>();
  const historical: { condition: string; status: ConditionStatus }[] = [];

  // ── dx_levels + roots ──
  // Energía (D1.1 escala directa).
  const d11 = asNum(answers['D1.1']);
  if (d11 != null) { dx.energia = d11; if (d11 <= 2) roots.add('cortisol_matutino_bajo'); }

  // Sueño + circadiano (D1.2).
  const d12 = asStr(answers['D1.2']);
  const sleepLevel: Record<string, number> = { profundo: 5, poco_funciono: 3, no_descanso: 3, mantenimiento: 2, conciliacion: 2 };
  if (d12) {
    dx.sueno = sleepLevel[d12] ?? 3;
    if (d12 === 'mantenimiento') roots.add('adrenalina_nocturna');
    if (d12 === 'mantenimiento' || d12 === 'conciliacion') roots.add('deficit_sueno_profundo');
    if (d12 !== 'profundo') dx.circadiano = Math.min(dx.circadiano ?? 5, 3);
  }

  // Digestión (D1.3 chips — más señales malas baja el nivel).
  const d13 = asArr(answers['D1.3']);
  if (d13.length) {
    const bad = d13.filter((c) => c !== 'regular' && c !== 'perfecto').length;
    dx.digestion = clamp(5 - bad);
    if (d13.includes('hinchazon') || d13.includes('gases')) roots.add('disbiosis');
    if (d13.includes('reflujo')) roots.add('reflujo_funcional');
    if (d13.includes('estrenimiento') || d13.includes('diarrea')) roots.add('digestion_estres_autonomico');
  }

  // Inflamación (D1.4 dolores + D3.1 piel + D4.1 encías).
  const d14 = asArr(answers['D1.4']);
  const inflamSignals = d14.filter((c) => c !== 'ninguno').length
    + (asArr(answers['D3.1']).some((c) => ['acne', 'rosacea', 'eczema', 'psoriasis'].includes(c)) ? 1 : 0)
    + (['casi_siempre', 'periodontitis'].includes(asStr(answers['D4.1'])) ? 1 : 0);
  if (inflamSignals > 0) { dx.inflamacion = clamp(5 - inflamSignals); roots.add('inflamacion_silenciosa'); }

  // Estrés (D1.6 escala + D11.1 escala 1-10).
  const d16 = asNum(answers['D1.6']);
  const d111 = asNum(answers['D11.1']);
  if (d16 != null || d111 != null) {
    const stress = Math.max(d16 ?? 0, d111 != null ? d111 / 2 : 0); // 1-10 → 1-5
    dx.estres = clamp(6 - stress);
    if (stress >= 3.5) { roots.add('estres_cronico'); roots.add('cortisol_elevado_sostenido'); }
  }

  // Metabolismo (D2.5 peso + D5.1 alimentación + D1.7 estimulantes).
  const d25 = asStr(answers['D2.5']);
  const d51 = asStr(answers['D5.1']);
  const d17 = asNum(answers['D1.7']);
  let metabScore = 5;
  if (d25 === 'subi_mas5' || d25 === 'fluctua') { metabScore -= 1; roots.add('hiperinsulinemia'); }
  if (d51 === 'procesados' || d51 === 'fast_food') { metabScore -= 1; roots.add('sobrecarga_procesados'); }
  if (d17 != null && d17 > 3) { metabScore -= 1; roots.add('hipotiroidismo_funcional'); }
  if (d25 || d51 || d17 != null) dx.metabolismo = clamp(metabScore);

  // Circadiano extra: cafeína tarde/noche + luz azul + turnos + poco sol.
  const d55 = asStr(answers['D5.5']);
  if (d55 === 'tarde' || d55 === 'noche') { dx.circadiano = clamp((dx.circadiano ?? 5) - 1); roots.add('cortisol_elevado_sostenido'); }
  const d104 = asStr(answers['D10.4']);
  if (d104 === '8_12' || d104 === 'mas12') roots.add('sobreexposicion_luz_azul');
  const d105 = asStr(answers['D10.5']);
  if (d105 === 'menos30') roots.add('deficit_exposicion_solar');
  if (asStr(answers['D11.2']) === 'si') { dx.circadiano = clamp((dx.circadiano ?? 5) - 1); roots.add('ritmo_circadiano_desregulado'); }
  if (['trimestral', 'mensual'].includes(asStr(answers['D11.5']))) roots.add('ritmo_circadiano_desregulado');

  // Cognitivo (D1.5 ánimo + D13.1 propósito).
  const d15 = asNum(answers['D1.5']);
  const d131 = asNum(answers['D13.1']);
  if (d15 != null || d131 != null) {
    dx.cognitivo = clamp(((d15 ?? 3) + (d131 ?? 3)) / 2);
    if ((d15 ?? 5) <= 2) roots.add('deficit_neurotransmisores');
  }

  // Hormonal (D2.5 + D12.1 libido + anticonceptivos).
  const d121 = asNum(answers['D12.1']);
  if (d121 != null) { dx.hormonal = clamp(d121); if (d121 <= 2) roots.add('baja_testosterona'); }
  // [PEND-MARIANA #3] anticonceptivos → depleciones (contexto, no contraindicación dura).
  if (asStr(answers['D6.4']) && asStr(answers['D6.4']) !== 'no') roots.add('dominancia_estrogenica');

  // ── C1 · Padecimientos con estado (contraindicación SOLO si activo) ──
  const conditions = answers['D9.2'];
  if (Array.isArray(conditions)) {
    for (const raw of conditions as ConditionAnswer[]) {
      if (!raw || typeof raw.condition !== 'string') continue;
      if (raw.status === 'activo') {
        contra.add(raw.condition); // solo lo activo excluye
        if (raw.condition === 'diabetes_tipo_1') contra.add('diabetes_tipo_1');
      } else {
        historical.push({ condition: raw.condition, status: raw.status }); // contexto ARGOS
      }
    }
  }

  // ── C2 · Estado reproductivo actual (D9.4b) → flags ──
  const repro = asStr(answers['D9.4b']);
  if (repro === 'embarazada') contra.add('embarazo');
  if (repro === 'lactando') contra.add('lactancia');

  // ── Goals (B.1) ──
  const goals = asArr(answers['B.1']);

  const dxLevels = Object.entries(dx).map(([system, level]) => ({ system, level: clamp(level) }));

  return {
    dxLevels,
    activatedRoots: [...roots],
    contraindications: [...contra],
    goals,
    historicalConditions: historical,
  };
}

// ── Puente al motor (PURO · sin supabase → testeable) ───────────────────────

/**
 * Convierte el fenotipo del cuestionario en el UserPhenotype que consume el motor
 * (personalize-interventions). Sólo las contraindicaciones ACTIVAS entran a
 * `profile.conditions`; embarazo/lactancia van a sus flags. El motor NO se toca.
 */
export function quizPhenotypeToMotorPhenotype(
  quiz: QuizPhenotype, userId: string, gender: Gender, age?: number,
): UserPhenotype {
  const now = new Date();
  const pregnancy = quiz.contraindications.includes('embarazo');
  const lactancia = quiz.contraindications.includes('lactancia');
  const conditions = quiz.contraindications.filter((c) => c !== 'embarazo' && c !== 'lactancia');

  return {
    userId,
    dxLevels: quiz.dxLevels.map((d) => ({ system: d.system, level: d.level, computedAt: now, confidence: 'high' as const })),
    braverman: null,
    labs: [],
    quizAnswers: [],
    chronotype: null,
    cyclePhase: null,
    profile: {
      age: age ?? 35, gender, pregnancy, lactancia, conditions,
      medications: [], goals: quiz.goals, feverViralActive: false,
    },
    fetchedAt: now,
  };
}

/** Score + puente en un paso (para el resumen final). */
export function buildMotorPhenotypeFromAnswers(
  answers: QuizAnswers, userId: string, gender: Gender, age?: number,
): { quiz: QuizPhenotype; motor: UserPhenotype } {
  const quiz = scoreToPhenotype(answers);
  return { quiz, motor: quizPhenotypeToMotorPhenotype(quiz, userId, gender, age) };
}
