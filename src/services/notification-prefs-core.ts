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

export const MODE_META: { value: NotificationMode; title: string; description: string; pro?: boolean }[] = [
  { value: 'standard', title: 'Standard', description: 'Notificaciones normales según tus toggles.' },
  { value: 'adaptive_argos', title: 'Adaptive ARGOS', description: 'ARGOS decide cuándo notificar — menos ruido, más relevancia.', pro: true },
  { value: 'silent', title: 'Silent', description: 'Solo notificaciones críticas del sistema.' },
];

export const CHANNEL_META: { key: NotificationChannel; column: keyof NotificationPrefs; title: string; description: string }[] = [
  { key: 'agenda', column: 'agenda_enabled', title: 'Agenda', description: 'Próximo evento y recordatorios de tu día.' },
  { key: 'argos', column: 'argos_enabled', title: 'ARGOS', description: 'Insights y mensajes proactivos.' },
  { key: 'streak', column: 'streak_enabled', title: 'Rachas', description: 'Avisos para no perder tu racha.' },
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
