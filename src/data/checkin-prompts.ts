/**
 * Check-in emocional — prompts del día (T4 Sprint MENTE Ecosystem).
 *
 * 10 prompts rotativos, tono editorial ATP (directo, sin empalago).
 * COPY tentativo — Enrique revisa post-sprint.
 *
 * PURO (sin imports RN/supabase) — rotación determinista testeable.
 */

export const CHECKIN_PROMPTS: readonly string[] = [
  '¿Qué te está pesando hoy?',
  '¿Qué te dio energía en las últimas 24h?',
  'Una cosa que sí y una que no.',
  '¿Cómo está tu cuerpo ahora mismo?',
  '¿Qué conversación estás evitando?',
  '¿Qué harías hoy si nadie te viera?',
  '¿A qué le dijiste que sí por compromiso?',
  '¿Qué te sorprendió de ti esta semana?',
  '¿Qué necesitas soltar antes de dormir?',
  '¿Por quién estás agradecido hoy — y ya se lo dijiste?',
] as const;

/**
 * Prompt del día: rotación determinista por fecha (YYYY-MM-DD). El mismo día
 * siempre devuelve el mismo prompt (en cualquier pantalla) y días
 * consecutivos avanzan por la lista.
 */
export function promptForDate(dateStr: string): string {
  // Días desde epoch (UTC) — estable por fecha, independiente de la hora.
  const t = Date.parse(`${dateStr}T00:00:00Z`);
  if (!Number.isFinite(t)) return CHECKIN_PROMPTS[0];
  const dayNumber = Math.floor(t / 86_400_000);
  return CHECKIN_PROMPTS[((dayNumber % CHECKIN_PROMPTS.length) + CHECKIN_PROMPTS.length) % CHECKIN_PROMPTS.length];
}

export interface CheckinJournalInput {
  userId: string;
  date: string;         // YYYY-MM-DD
  quadrant: string;
  emotionLabels: string[];
  note: string;
  prompt: string;
}

/**
 * Row para journal_entries cuando el check-in trae nota (mini journal).
 * Devuelve null si la nota está vacía — un check-in sin texto no genera
 * entrada de journal.
 */
export function buildCheckinJournalEntry(input: CheckinJournalInput): Record<string, unknown> | null {
  const content = input.note.trim();
  if (!content) return null;
  return {
    user_id: input.userId,
    date: input.date,
    journal_type: 'checkin',
    prompt: input.prompt,
    content,
    tags: ['checkin', input.quadrant, ...input.emotionLabels.slice(0, 2)],
  };
}
