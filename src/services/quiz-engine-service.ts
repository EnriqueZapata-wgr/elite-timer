/**
 * Quiz Engine Service — Cargar quizzes, calcular scores, recomendar protocolos.
 */
import { supabase } from '@/src/lib/supabase';
import { assignProtocol, generateDailyPlan } from './protocol-builder-service';

// === TYPES ===

export interface QuizQuestion {
  question_id: number;
  question_text: string;
  question_type: 'single_select' | 'multi_select';
  options: { text: string; scores: Record<string, number> }[];
}

export interface QuizData {
  quiz_id: string;
  name: string;
  description: string;
  type: string;
  estimated_time_min: number;
  domains: string[];
  max_recommendations: number;
  questions: QuizQuestion[];
  protocol_mapping: { condition: string; protocol_id: string; priority: number }[];
}

export interface QuizRecommendation {
  protocol_key: string;
  template_id: string | null;
  template_name: string | null;
  priority: number;
  reason: string;
}

// === CARGAR QUIZ ===

export async function getQuiz(quizId: string): Promise<QuizData | null> {
  const { data } = await supabase
    .from('quizzes').select('*')
    .eq('quiz_id', quizId).eq('is_active', true).single();
  return data as QuizData | null;
}

export async function getAvailableQuizzes(): Promise<QuizData[]> {
  const { data } = await supabase
    .from('quizzes').select('quiz_id, name, description, type, estimated_time_min, domains, max_recommendations')
    .eq('is_active', true).order('quiz_id');
  return (data ?? []) as QuizData[];
}

// === CALCULAR SCORES ===

export function calculateDomainScores(
  questions: QuizQuestion[],
  answers: Record<number, number | number[]>,
): Record<string, number> {
  const domainTotals: Record<string, number[]> = {};

  for (const q of questions) {
    const answer = answers[q.question_id];
    if (answer === undefined) continue;

    const indices = Array.isArray(answer) ? answer : [answer];
    for (const idx of indices) {
      const option = q.options[idx];
      if (!option?.scores) continue;
      for (const [domain, score] of Object.entries(option.scores)) {
        if (!domainTotals[domain]) domainTotals[domain] = [];
        domainTotals[domain].push(score);
      }
    }
  }

  const scores: Record<string, number> = {};
  for (const [domain, values] of Object.entries(domainTotals)) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    scores[domain] = Math.round(Math.max(0, Math.min(100, avg)));
  }
  return scores;
}

// === EVALUAR RECOMENDACIONES ===

export async function evaluateRecommendations(
  domainScores: Record<string, number>,
  mapping: { condition: string; protocol_id: string; priority: number }[],
  maxRecs: number,
): Promise<QuizRecommendation[]> {
  const matches: { key: string; priority: number; reason: string }[] = [];

  for (const rule of mapping) {
    if (evalCondition(rule.condition, domainScores)) {
      matches.push({ key: rule.protocol_id, priority: rule.priority, reason: rule.condition });
    }
  }

  matches.sort((a, b) => a.priority - b.priority);
  const top = matches.slice(0, maxRecs);

  // Resolver template_id por protocol_key
  const recs: QuizRecommendation[] = [];
  for (const m of top) {
    const { data } = await supabase
      .from('protocol_templates').select('id, name')
      .eq('protocol_key', m.key).limit(1).single();
    recs.push({
      protocol_key: m.key,
      template_id: data?.id ?? null,
      template_name: data?.name ?? m.key.replace(/_/g, ' '),
      priority: m.priority,
      reason: m.reason,
    });
  }
  return recs;
}

function evalCondition(cond: string, scores: Record<string, number>): boolean {
  if (cond.includes(' AND ')) return cond.split(' AND ').every(c => evalCondition(c.trim(), scores));
  if (cond.includes(' OR ')) return cond.split(' OR ').some(c => evalCondition(c.trim(), scores));
  const m = cond.match(/^(\w+)\s*([<>]=?)\s*(\d+)$/);
  if (!m) return false;
  const val = scores[m[1]];
  if (val === undefined) return false;
  const t = parseInt(m[3]);
  switch (m[2]) {
    case '<': return val < t;
    case '<=': return val <= t;
    case '>': return val > t;
    case '>=': return val >= t;
    default: return false;
  }
}

// === GUARDAR RESPUESTA ===

export async function saveQuizResponse(
  userId: string,
  quizId: string,
  answers: Record<number, number | number[]>,
  domainScores: Record<string, number>,
  recommendedKeys: string[],
  acceptedKeys: string[],
) {
  return supabase.from('quiz_responses').insert({
    user_id: userId, quiz_id: quizId, answers, domain_scores: domainScores,
    recommended_protocols: recommendedKeys, accepted_protocols: acceptedKeys,
  });
}

// === ACTIVAR PROTOCOLOS RECOMENDADOS ===

export async function activateRecommendedProtocols(
  userId: string,
  recommendations: QuizRecommendation[],
): Promise<number> {
  const { count } = await supabase
    .from('user_protocols').select('*', { count: 'exact' })
    .eq('user_id', userId).eq('status', 'active');

  const available = 5 - (count || 0);
  let activated = 0;

  for (const rec of recommendations.slice(0, available)) {
    if (!rec.template_id) continue;
    try {
      await assignProtocol(userId, rec.template_id, null, 'quiz');
      activated++;
    } catch { /* ya activo o error */ }
  }

  if (activated > 0) {
    await generateDailyPlan(userId, undefined, true);
  }

  return activated;
}

// === ÚLTIMA RESPUESTA ===

export async function getLastQuizResponse(userId: string, quizId: string) {
  const { data } = await supabase
    .from('quiz_responses').select('*')
    .eq('user_id', userId).eq('quiz_id', quizId)
    .order('completed_at', { ascending: false }).limit(1).single();
  return data;
}
