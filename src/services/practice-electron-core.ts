/**
 * Delta economía meditación/respiración (2026-07-23) — lógica PURA compartida
 * por timers (meditation.tsx / breathing.tsx) y audio (mente-audio-service).
 *
 * Regla de Enrique: meditación y respiración otorgan SOLO e- (electron_logs),
 * atado a duración comprobada (≥80% real), con cap 3/día por source y ≥3h
 * entre awards del mismo source. El cap/espaciado se ENFORCEA server-side
 * (trigger de la migración 213) — estos tokens son el contrato de error que
 * el cliente clasifica para fallar-suave.
 */

export const PRACTICE_ELECTRON_SOURCES = ['meditation', 'breathwork'] as const;
export type PracticeElectronSource = (typeof PRACTICE_ELECTRON_SOURCES)[number];

export const PRACTICE_DAILY_CAP = 3;
export const PRACTICE_SPACING_HOURS = 3;
export const PRACTICE_MIN_COMPLETION_RATIO = 0.8;

/** Tokens que emite el trigger 213 en el mensaje de la excepción. */
export const PRACTICE_CAP_TOKEN = 'ATP_PRACTICE_CAP';
export const PRACTICE_SPACING_TOKEN = 'ATP_PRACTICE_SPACING';

/**
 * ¿La práctica cuenta para el electrón? Tiempo REAL practicado ≥ 80% del
 * objetivo de la pieza/sesión. Duración objetivo inválida → no califica.
 */
export function qualifiesForPracticeElectron(effectiveSeconds: number, targetSeconds: number): boolean {
  if (!Number.isFinite(effectiveSeconds) || !Number.isFinite(targetSeconds)) return false;
  if (targetSeconds <= 0 || effectiveSeconds <= 0) return false;
  return effectiveSeconds >= targetSeconds * PRACTICE_MIN_COMPLETION_RATIO;
}

/**
 * Clasifica el rechazo del trigger server-side (cap/espaciado) a partir del
 * mensaje del error de Postgres. Cualquier otro error → null (error real).
 */
export function classifyPracticeAwardError(message: string | null | undefined): 'cap_reached' | 'spacing' | null {
  if (!message) return null;
  if (message.includes(PRACTICE_CAP_TOKEN)) return 'cap_reached';
  if (message.includes(PRACTICE_SPACING_TOKEN)) return 'spacing';
  return null;
}

/**
 * Key de idempotencia del 2º/3º award del día. El 1º usa la determinística
 * `user:source:día` (marca la card de HOY / racha); los extra llevan nonce —
 * el dedup real de un doble-tap lo da el espaciado de 3h del trigger.
 */
export function extraPracticeIdempotencyKey(
  userId: string,
  source: PracticeElectronSource,
  localDate: string,
  nonce: string,
): string {
  return `${userId}:${source}:${localDate}:${nonce}`;
}
