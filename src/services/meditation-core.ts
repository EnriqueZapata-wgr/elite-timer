/**
 * Meditación — lógica pura del player (T3 Sprint MENTE Ecosystem).
 *
 * Scheduling de prompts textuales cronometrados + validación de templates.
 * Separada de app/meditation.tsx para testear sin RN.
 */
import type { MeditationPhase, MeditationTemplate } from '@/src/data/meditation-library';

/**
 * Índice de la fase activa para un tiempo transcurrido: la última fase cuyo
 * startSeconds ya pasó. Antes del primer prompt → 0.
 */
export function phaseIndexAt(elapsedSeconds: number, phases: MeditationPhase[]): number {
  let idx = 0;
  for (let i = phases.length - 1; i >= 0; i--) {
    if (elapsedSeconds >= phases[i].startSeconds) { idx = i; break; }
  }
  return idx;
}

/** Segundos hasta el próximo prompt (null si ya no hay más). */
export function secondsToNextPrompt(elapsedSeconds: number, phases: MeditationPhase[]): number | null {
  for (const p of phases) {
    if (p.startSeconds > elapsedSeconds) return p.startSeconds - elapsedSeconds;
  }
  return null;
}

/**
 * Validación estructural: duración > 0, fases no vacías, cronológicamente
 * ordenadas, ninguna fuera de la duración, textos presentes.
 */
export function validateMeditationTemplate(t: Pick<MeditationTemplate, 'durationMinutes' | 'phases'>): boolean {
  if (!Number.isFinite(t.durationMinutes) || t.durationMinutes <= 0) return false;
  if (!Array.isArray(t.phases) || t.phases.length === 0) return false;
  const total = t.durationMinutes * 60;
  let prev = -1;
  for (const p of t.phases) {
    if (!Number.isFinite(p.startSeconds) || p.startSeconds < 0) return false;
    if (p.startSeconds <= prev && prev !== -1) return false; // orden estricto
    if (p.startSeconds >= total) return false;               // prompt fuera del timer
    if (!p.text || p.text.length === 0) return false;
    prev = p.startSeconds;
  }
  return true;
}

/** ¿Es sesión free-form de silencio? (solo campanas de inicio/cierre). */
export function isSilenceSession(t: Pick<MeditationTemplate, 'type'>): boolean {
  return t.type === 'silence';
}
