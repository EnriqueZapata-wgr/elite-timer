/**
 * user-notifications-service (AGENDA-COMPLETE F3) — inbox in-app.
 *
 * Tabla user_notifications (migración 150): la Edge Function dispatch-agenda-notifications
 * inserta una row por recordatorio procesado (tenga o no push token el usuario) además del
 * push a Expo. Aquí vive la lectura + marcar leídas para la campana del HOY y /notifications.
 * Al marcar leídas se emite 'notifications_changed' (la campana lo escucha).
 *
 * Defensivo: lecturas caen a []/0 si falla; nunca rompe la pantalla.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';

export interface UserNotification {
  id: string;
  type: string;            // 'agenda_reminder' | 'insight' | 'lab_ready' | ...
  title: string;
  body: string;
  data: Record<string, any>; // eventId, route, etc.
  readAt: string | null;
  createdAt: string;
}

/** Últimas notificaciones del usuario (DESC por fecha). */
export async function listNotifications(userId: string, limit = 50): Promise<UserNotification[]> {
  try {
    const { data } = await supabase
      .from('user_notifications')
      .select('id, type, title, body, data, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return ((data ?? []) as any[]).map((n) => ({
      id: n.id, type: n.type, title: n.title, body: n.body,
      data: (n.data as Record<string, any>) ?? {},
      readAt: n.read_at, createdAt: n.created_at,
    }));
  } catch (e) {
    logWarn('[notif-inbox] listNotifications failed', e);
    return [];
  }
}

/** Conteo de no leídas (badge de la campana). */
export async function countUnreadInbox(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Marca una notificación como leída. */
export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  try {
    await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);
    DeviceEventEmitter.emit('notifications_changed');
  } catch (e) {
    logWarn('[notif-inbox] markNotificationRead failed', e);
  }
}

/** Marca todas las no leídas como leídas. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    DeviceEventEmitter.emit('notifications_changed');
  } catch (e) {
    logWarn('[notif-inbox] markAllNotificationsRead failed', e);
  }
}
