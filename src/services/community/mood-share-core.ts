/**
 * Mood Share Core — lógica PURA de la capa social de ánimo (MB-4 · Bloque 4).
 *
 * Doctrina: acompañamiento, no competencia. Compartir es opt-in explícito y
 * granular POR check-in (el share existe = el consentimiento existe); la
 * reacción es cálida y única por persona (no likes, no contadores públicos,
 * no ranking de ánimo).
 */

export type MoodReactionKind = 'te_leo' | 'un_abrazo' | 'aqui_estoy';

export interface MoodReactionDef {
  kind: MoodReactionKind;
  label: string;
  icon: string; // Ionicons
}

/** Reacciones cálidas — responder a un estado, no calificarlo. */
export const MOOD_REACTIONS: MoodReactionDef[] = [
  { kind: 'te_leo', label: 'Te leo', icon: 'eye-outline' },
  { kind: 'un_abrazo', label: 'Un abrazo', icon: 'heart-outline' },
  { kind: 'aqui_estoy', label: 'Aquí estoy', icon: 'hand-left-outline' },
];

export function isValidReactionKind(kind: string): kind is MoodReactionKind {
  return MOOD_REACTIONS.some((r) => r.kind === kind);
}

export interface SharePayloadInput {
  checkinId: string | null;
  quadrant: string;
  emotionLabel: string | null;
  /** Granularidad: false → se comparte solo la zona (cuadrante), sin emoción. */
  includeEmotion: boolean;
}

export interface SharePayload {
  checkin_id: string | null;
  quadrant: string;
  emotion_label: string | null;
}

/** Arma la copia MÍNIMA que se comparte. Nada más sale del check-in. */
export function buildSharePayload(input: SharePayloadInput): SharePayload {
  return {
    checkin_id: input.checkinId,
    quadrant: input.quadrant,
    emotion_label: input.includeEmotion && input.emotionLabel ? input.emotionLabel : null,
  };
}

/** "hace 5 min" · "hace 3 h" · "ayer" · "hace 4 días" — es-MX, sin librerías. */
export function timeAgoEs(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const mins = Math.max(0, Math.floor((now.getTime() - then) / 60000));
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}
