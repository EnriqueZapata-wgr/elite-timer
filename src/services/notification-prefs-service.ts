/**
 * Notification prefs (#61) — I/O contra user_notification_prefs (migración 157).
 * Lógica pura (defaults, quiet hours, shouldNotify) en notification-prefs-core.ts.
 */
import { supabase } from '@/src/lib/supabase';
import {
  NOTIFICATION_PREFS_DEFAULTS,
  type NotificationPrefs,
} from './notification-prefs-core';

export {
  NOTIFICATION_PREFS_DEFAULTS,
  MODE_META,
  CHANNEL_META,
  shouldNotify,
  isInQuietHours,
  type NotificationPrefs,
  type NotificationMode,
  type NotificationChannel,
} from './notification-prefs-core';

/** Prefs del usuario (defaults del schema si no hay fila). */
export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('user_notification_prefs')
    .select('mode, agenda_enabled, argos_enabled, streak_enabled, community_enabled, system_enabled, quiet_hours_start, quiet_hours_end, dnd_during_consultation')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return { ...NOTIFICATION_PREFS_DEFAULTS };
  return data as NotificationPrefs;
}

/** Actualiza prefs (upsert — la fila se crea on-demand). */
export async function updateNotificationPrefs(userId: string, patch: Partial<NotificationPrefs>): Promise<boolean> {
  const current = await getNotificationPrefs(userId);
  const { error } = await supabase.from('user_notification_prefs').upsert({
    user_id: userId,
    ...current,
    ...patch,
  }, { onConflict: 'user_id' });
  if (error) {
    console.warn('[notif-prefs] update:', error.message);
    return false;
  }
  return true;
}
