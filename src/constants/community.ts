/**
 * Constantes de Comunidad (estilo Strava · mapa v1, decisiones aprobadas 2026-07-11).
 *
 * Doctrina cerrada: cero chat privado. Amigos + perfil público + feed + kudos +
 * ranking. La conversación humana sale a Skool (ver SKOOL_URL en brand.ts).
 *
 * ⚠️ Este archivo concentra los CONTRATOS anti-fuga clínica:
 *   - PUBLIC_PROFILE_FIELDS: única lista de campos que pueden ser públicos.
 *   - FEED_EVENT_TYPES: whitelist de eventos del feed (los clínicos no existen aquí
 *     y el CHECK de la migración los rechaza a nivel DB).
 *   - FORBIDDEN_PUBLIC_FIELDS: nombres de campo clínicos que NUNCA deben aparecer
 *     en una proyección pública (usado por el test de regresión anti-leak).
 */

// ── Kudos (decisión #2: 3 emojis) ────────────────────────────────────────────

export const KUDOS_EMOJIS = [
  { key: 'fire', emoji: '🔥', label: 'Fuego' },
  { key: 'clap', emoji: '👏', label: 'Aplauso' },
  { key: 'strength', emoji: '💪', label: 'Fuerza' },
] as const;

export type KudosKey = (typeof KUDOS_EMOJIS)[number]['key'];
export const KUDOS_KEYS: KudosKey[] = KUDOS_EMOJIS.map(k => k.key);

// ── Feed: whitelist de eventos (SOLO no-clínico) ─────────────────────────────
// day_complete queda FUERA de v1 (decisión #4): se agrega post-DX-F4 cuando
// adherence-service sea la fuente estable. NO incluir aquí hasta entonces.

export const FEED_EVENT_TYPES = [
  'badge_earned',
  'streak_milestone',
  'rank_up',
  'fitness_pr',
] as const;

export type FeedEventType = (typeof FEED_EVENT_TYPES)[number];
export const FEED_EVENT_TYPE_SET = new Set<string>(FEED_EVENT_TYPES);

// Eventos clínicos que NUNCA pueden entrar al feed (defensa en profundidad;
// el emisor tipado ya los excluye, esto documenta la intención + alimenta tests).
export const FORBIDDEN_FEED_EVENTS = [
  'intervention_completed', 'symptom_logged', 'lab_uploaded', 'journal_entry',
  'mood_logged', 'cycle_logged', 'padecimiento_added', 'dx_updated', 'supplement_logged',
] as const;

// ── Perfil público: whitelist de campos ──────────────────────────────────────

export const PUBLIC_PROFILE_FIELDS = [
  'user_id', 'username', 'display_name', 'avatar_url', 'country',
  'chronotype', 'streak_days', 'lifetime_electrons', 'current_rank', 'friend_count',
] as const;

export type PublicProfileField = (typeof PUBLIC_PROFILE_FIELDS)[number];
export const PUBLIC_PROFILE_FIELD_SET = new Set<string>(PUBLIC_PROFILE_FIELDS);

// Campos clínicos/privados que jamás deben aparecer en una proyección pública.
// El test de regresión anti-leak verifica que la salida no contenga ninguno.
export const FORBIDDEN_PUBLIC_FIELDS = [
  'dx', 'roots_detected', 'interventions', 'intervention_key', 'symptoms',
  'padecimientos', 'labs', 'lab_values', 'supplements', 'cycle', 'menstrual',
  'journal', 'mood', 'braverman', 'quiz', 'red_flags', 'coach_notes',
  'date_of_birth', 'biological_sex', 'email', 'phone', 'medical', 'consent',
] as const;

// ── Flags de visibilidad (defaults del brief §C) ─────────────────────────────

export interface VisibilityFlags {
  discoverable: boolean;
  allow_friend_requests: boolean;
  show_streak: boolean;
  show_electrons: boolean;
  show_badges: boolean;
  show_activity: boolean;
  show_country: boolean;
  show_chronotype: boolean;
  show_photo: boolean;
}

export const DEFAULT_VISIBILITY: VisibilityFlags = {
  discoverable: true,
  allow_friend_requests: true,
  show_streak: true,
  show_electrons: true,
  show_badges: true,
  show_activity: true,
  show_country: false,     // off por default (brief)
  show_chronotype: false,  // off por default (brief)
  show_photo: true,
};

// ── Moderación (decisión #3) ─────────────────────────────────────────────────

/**
 * Reports distintos que auto-ocultan un perfil (discoverable=false) hasta revisión.
 * Beta = 3. Subir a 5-10 post-scale cuando el volumen de usuarios crezca.
 */
export const REPORT_AUTOHIDE_THRESHOLD = 3;

/**
 * Razones de report. Las keys son EXACTAMENTE los valores del CHECK de
 * user_reports.reason (mig 183) — el label es el copy visible en español.
 * (Foto/nombre ofensivo del borrador original caen en 'inappropriate'.)
 */
export const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Acoso' },
  { key: 'impersonation', label: 'Suplantación de identidad' },
  { key: 'inappropriate', label: 'Foto o nombre inapropiado' },
  { key: 'other', label: 'Otro' },
] as const;

export type ReportReasonKey = (typeof REPORT_REASONS)[number]['key'];
export const REPORT_REASON_KEYS: ReportReasonKey[] = REPORT_REASONS.map(r => r.key);

// ── Username (validación) ────────────────────────────────────────────────────

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
/** Solo minúsculas, dígitos y guion bajo; sin guion bajo al inicio/fin. */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_]{1,18}[a-z0-9])$/;
