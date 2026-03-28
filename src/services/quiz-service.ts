/**
 * Quiz Service — Gestión de quizzes y cronotipo.
 */
import { supabase } from '@/src/lib/supabase';

// === TYPES ===

export interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string; scores: Record<string, number> }[];
}

export interface QuizTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  questions: QuizQuestion[];
  scoring_logic: any;
  is_required: boolean;
}

export type Chronotype = 'lion' | 'bear' | 'wolf' | 'dolphin';

export interface ChronotypeData {
  chronotype: Chronotype;
  wake_time: string;
  sleep_time: string;
  peak_focus_start: string;
  peak_focus_end: string;
  peak_physical_start: string;
  peak_physical_end: string;
  wind_down_time: string;
  raw_scores: Record<string, number>;
}

export interface ChronotypeInfo {
  name: string;
  emoji: string;
  description: string;
  wake_time: string;
  sleep_time: string;
  peak_focus_start: string;
  peak_focus_end: string;
  peak_physical_start: string;
  peak_physical_end: string;
  wind_down_time: string;
}

// === AUTH ===

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user.id;
}

// === QUIZ TEMPLATES ===

export async function getQuizTemplate(slug: string): Promise<QuizTemplate | null> {
  const { data } = await supabase
    .from('quiz_templates')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

// === QUIZ RESULTS ===

export async function submitQuizResult(
  quizId: string,
  answers: Record<string, string>,
  scores: Record<string, number>,
  result: string,
  resultData: any,
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from('quiz_results').insert({
    user_id: userId,
    quiz_id: quizId,
    answers,
    scores,
    result,
    result_data: resultData,
  });
  if (error) throw error;
}

export async function hasCompletedQuiz(slug: string): Promise<boolean> {
  const userId = await getUserId();
  const { data } = await supabase
    .from('quiz_results')
    .select('id, quiz_id!inner(slug)')
    .eq('user_id', userId)
    .eq('quiz_id.slug', slug)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// === USER CHRONOTYPE ===

export async function getUserChronotype(): Promise<ChronotypeData | null> {
  const userId = await getUserId();
  const { data } = await supabase
    .from('user_chronotype')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function saveUserChronotype(
  chronotype: Chronotype,
  schedule: ChronotypeInfo,
  rawScores: Record<string, number>,
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from('user_chronotype').upsert({
    user_id: userId,
    chronotype,
    wake_time: schedule.wake_time,
    sleep_time: schedule.sleep_time,
    peak_focus_start: schedule.peak_focus_start,
    peak_focus_end: schedule.peak_focus_end,
    peak_physical_start: schedule.peak_physical_start,
    peak_physical_end: schedule.peak_physical_end,
    wind_down_time: schedule.wind_down_time,
    raw_scores: rawScores,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

// === SCORING ===

export function calculateChronotypeScores(
  questions: QuizQuestion[],
  answers: Record<string, string>,
): Record<string, number> {
  const scores: Record<string, number> = { lion: 0, bear: 0, wolf: 0, dolphin: 0 };

  for (const q of questions) {
    const selectedId = answers[q.id];
    if (!selectedId) continue;
    const option = q.options.find(o => o.id === selectedId);
    if (!option) continue;
    for (const [animal, score] of Object.entries(option.scores)) {
      scores[animal] = (scores[animal] || 0) + score;
    }
  }

  return scores;
}

export function determineChronotype(scores: Record<string, number>): Chronotype {
  // Preferencia en empate: bear > lion > wolf > dolphin
  const priority: Chronotype[] = ['bear', 'lion', 'wolf', 'dolphin'];
  let maxScore = -1;
  let winner: Chronotype = 'bear';

  for (const animal of priority) {
    if ((scores[animal] ?? 0) > maxScore) {
      maxScore = scores[animal] ?? 0;
      winner = animal;
    }
  }

  return winner;
}
