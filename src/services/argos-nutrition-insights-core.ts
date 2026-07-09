/**
 * ARGOS post-meal insights — lógica pura (T6 Sprint NUTRICIÓN).
 *
 * Opt-in (default OFF) + throttle: máximo un insight cada MIN_GAP tras
 * registrar comida — presencia, no spam. PURO para tests node.
 */

export const INSIGHT_MIN_GAP_MINUTES = 20;

export interface InsightGateInput {
  /** Toggle de Settings (default false). */
  enabled: boolean;
  /** Epoch ms del último insight generado (null = nunca). */
  lastGeneratedAt: number | null;
  now: number;
  minGapMinutes?: number;
}

/** ¿Generar insight tras esta comida? */
export function shouldGenerateInsight(input: InsightGateInput): boolean {
  if (!input.enabled) return false;
  if (input.lastGeneratedAt === null) return true;
  const gapMs = (input.minGapMinutes ?? INSIGHT_MIN_GAP_MINUTES) * 60_000;
  return input.now - input.lastGeneratedAt >= gapMs;
}

export interface PostMealSummary {
  description: string;
  proteinG: number;
  proteinTargetG: number;
  scoreToday: number | null;
  mealsToday: number;
}

/**
 * Prompt breve del insight (1-2 oraciones, editorial, accionable).
 * COPY del system para review de Enrique/Mariana.
 */
export function buildPostMealPrompt(s: PostMealSummary): { system: string; user: string } {
  return {
    system:
      'Eres ARGOS, inteligencia de salud funcional de ATP. El usuario acaba de registrar una comida. ' +
      'Responde con UN insight de máximo 2 oraciones en español: reconoce lo bueno si lo hay y da UNA sugerencia concreta para la siguiente comida de hoy. ' +
      'Directo, sin emojis, sin saludar, sin sermones. Filosofía ATP: proteína suficiente, grasas buenas, pocos carbos, comida real.',
    user:
      `Comida registrada: ${s.description || 'sin descripción'}. ` +
      `Proteína del día: ${Math.round(s.proteinG)}/${s.proteinTargetG}g. ` +
      `Comidas hoy: ${s.mealsToday}. ` +
      (s.scoreToday !== null ? `Score nutricional actual: ${s.scoreToday}/100.` : ''),
  };
}

/** Valida/normaliza el texto del LLM (recorta, descarta vacío o demasiado largo). */
export function sanitizeInsightText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (text.length < 10) return null;
  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}
