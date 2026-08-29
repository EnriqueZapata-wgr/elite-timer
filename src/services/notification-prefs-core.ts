/**
 * Notification prefs (#61) — núcleo PURO (sin supabase/RN), testeable.
 * El I/O vive en notification-prefs-service.ts; el enforcement server-side
 * replica esta misma lógica en dispatch-agenda-notifications.
 */

export type NotificationMode = 'standard' | 'adaptive_argos' | 'silent';

export type NotificationChannel = 'agenda' | 'argos' | 'streak' | 'community' | 'system';

export interface NotificationPrefs {
  mode: NotificationMode;
  agenda_enabled: boolean;
  argos_enabled: boolean;
  streak_enabled: boolean;
  community_enabled: boolean;
  system_enabled: boolean;
  quiet_hours_start: string | null; // 'HH:MM' o 'HH:MM:SS'
  quiet_hours_end: string | null;
  dnd_during_consultation: boolean;
}

export const NOTIFICATION_PREFS_DEFAULTS: NotificationPrefs = {
  mode: 'standard',
  agenda_enabled: true,
  argos_enabled: true,
  streak_enabled: true,
  community_enabled: true,
  system_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  dnd_during_consultation: true,
};

// SIMPLE (17-ago-2026): la bandera `pro` se fue. Solo pintaba un badge "PRO" en
// Adaptive ARGOS sobre un modo que nunca estuvo gateado, y con una sola membresía
// no queda nada que etiquetar.
export const MODE_META: { value: NotificationMode; title: string; description: string }[] = [
  { value: 'standard', title: 'Standard', description: 'Notificaciones normales según tus toggles.' },
  { value: 'adaptive_argos', title: 'Adaptive ARGOS', description: 'ARGOS decide cuándo notificar, menos ruido y más relevancia.' },
  { value: 'silent', title: 'Silent', description: 'Solo notificaciones críticas del sistema.' },
];

export const CHANNEL_META: { key: NotificationChannel; column: keyof NotificationPrefs; title: string; description: string }[] = [
  { key: 'agenda', column: 'agenda_enabled', title: 'Agenda', description: 'Próximo evento y recordatorios de tu día.' },
  { key: 'argos', column: 'argos_enabled', title: 'ARGOS', description: 'Insights y mensajes proactivos.' },
  { key: 'streak', column: 'streak_enabled', title: 'Rachas', description: 'Un recordatorio para mantener tu constancia.' },
  { key: 'community', column: 'community_enabled', title: 'Community', description: 'Challenges, referidos y tu clínico.' },
  { key: 'system', column: 'system_enabled', title: 'Sistema', description: 'Renovaciones y actualizaciones importantes.' },
];

/** 'HH:MM[:SS]' → minutos del día, o null si inválido. */
export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * ¿`minutesNow` cae dentro de la ventana quiet hours? Soporta ventanas que
 * cruzan medianoche (22:00 → 07:00). Ventana incompleta (solo start o solo
 * end) = sin quiet hours.
 */
export function isInQuietHours(prefs: Pick<NotificationPrefs, 'quiet_hours_start' | 'quiet_hours_end'>, minutesNow: number): boolean {
  const start = timeToMinutes(prefs.quiet_hours_start);
  const end = timeToMinutes(prefs.quiet_hours_end);
  if (start == null || end == null || start === end) return false;
  if (start < end) return minutesNow >= start && minutesNow < end;
  // Cruza medianoche
  return minutesNow >= start || minutesNow < end;
}

/**
 * Decisión central de enforcement: ¿se manda una notificación de `channel`
 * a un usuario con `prefs` a la hora `minutesNow`?
 *   - silent: solo system
 *   - quiet hours: silencia todo menos system
 *   - toggle del canal
 *   - adaptive_argos: por ahora se comporta como standard (la heurística de
 *     ARGOS llega con el backend Pro) — el canal argos sigue gateado por toggle
 */
export function shouldNotify(prefs: NotificationPrefs, channel: NotificationChannel, minutesNow: number): boolean {
  if (channel === 'system') return prefs.system_enabled;
  if (prefs.mode === 'silent') return false;
  if (isInQuietHours(prefs, minutesNow)) return false;
  switch (channel) {
    case 'agenda': return prefs.agenda_enabled;
    case 'argos': return prefs.argos_enabled;
    case 'streak': return prefs.streak_enabled;
    case 'community': return prefs.community_enabled;
    default: return true;
  }
}

// ── MB-23 P3 · Avisos por app (modelo mixto) ──

export type AppAvisoCondition = 'not_done_today' | 'always';

export interface AppAvisoPref {
  enabled: boolean;
  /** 'HH:MM' — hora fija del aviso. */
  time: string;
  condition: AppAvisoCondition;
}

/** Parse estricto de la condición (basura en DB → default seguro). */
export function parseAvisoCondition(v: unknown): AppAvisoCondition {
  return v === 'always' ? 'always' : 'not_done_today';
}

/**
 * ¿Cuándo se agenda el próximo aviso de una app? La hora del aviso es FIJA,
 * así que toda la decisión se toma al agendar (los avisos son notificaciones
 * locales: no hay código corriendo al disparar).
 *
 * ⚠️ EL MAESTRO MANDA: con el modo silent ninguna app avisa, diga lo que
 * diga su ficha. Y las horas de silencio aplican a todo: una hora de aviso
 * que cae dentro de la ventana de silencio no suena nunca.
 *
 *   'today'    → agenda hoy a aviso.time (la hora aún no pasa y la condición
 *                lo permite)
 *   'tomorrow' → agenda mañana (hoy ya pasó la hora, o ya lo hiciste hoy y
 *                la condición es 'solo si no lo has hecho')
 *   null       → no se agenda nada (maestro apagado, ficha apagada, hora en
 *                silencio o inválida)
 */
export function planAppAviso(
  prefs: NotificationPrefs,
  aviso: AppAvisoPref,
  minutesNow: number,
  doneToday: boolean,
): 'today' | 'tomorrow' | null {
  if (prefs.mode === 'silent') return null;
  if (!aviso.enabled) return null;
  const t = timeToMinutes(aviso.time);
  if (t == null) return null;
  if (isInQuietHours(prefs, t)) return null;
  if (t > minutesNow && !(aviso.condition === 'not_done_today' && doneToday)) return 'today';
  return 'tomorrow';
}
