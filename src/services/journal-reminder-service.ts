/**
 * Recordatorio de journal — servicio único (MB-22 Pieza 3).
 *
 * La lógica vivía inline en app/journal.tsx (F31.8 + #28); la ficha de
 * Journal del Centro edita EL MISMO recordatorio, así que se extrajo aquí.
 * Mismas llaves de AsyncStorage, mismo identifier namespaced: cancelar solo
 * borra la notificación propia, nunca las de agenda (#28).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const KEY_ENABLED = '@atp/journal_reminder';
const KEY_TIME = '@atp/journal_reminder_time';
const KEY_NOTIF_ID = '@atp/journal_notif_id';

export const JOURNAL_REMINDER_DEFAULT_TIME = '21:00';

export interface JournalReminder {
  enabled: boolean;
  /** 'HH:MM' */
  time: string;
}

export async function getJournalReminder(): Promise<JournalReminder> {
  const [enabled, time] = await Promise.all([
    AsyncStorage.getItem(KEY_ENABLED),
    AsyncStorage.getItem(KEY_TIME),
  ]);
  return {
    enabled: enabled === 'true',
    time: time || JOURNAL_REMINDER_DEFAULT_TIME,
  };
}

/** #28: cancela SOLO el recordatorio propio (identifier namespaced). */
export async function cancelJournalReminder(): Promise<void> {
  const prevId = await AsyncStorage.getItem(KEY_NOTIF_ID);
  if (prevId) {
    try { await Notifications.cancelScheduledNotificationAsync(prevId); } catch { /* ya no existe */ }
    await AsyncStorage.removeItem(KEY_NOTIF_ID);
  }
}

export async function scheduleJournalReminder(timeStr: string): Promise<void> {
  await cancelJournalReminder();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ATP — Descarga mental',
      body: '¿Cómo estuvo tu día? Tómate 5 minutos para escribir.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parseInt(timeStr.split(':')[0]),
      minute: parseInt(timeStr.split(':')[1]),
    },
  });
  await AsyncStorage.setItem(KEY_NOTIF_ID, identifier);
}

/**
 * Prende/apaga el recordatorio. Si falta el permiso de notificaciones lo
 * pide; sin permiso devuelve { ok: false, reason: 'permission' } y NO deja
 * el toggle prendido a medias (el caller decide el aviso).
 */
export async function setJournalReminderEnabled(
  enabled: boolean,
  time: string,
): Promise<{ ok: boolean; reason?: 'permission' }> {
  if (!enabled) {
    await AsyncStorage.setItem(KEY_ENABLED, 'false');
    await cancelJournalReminder();
    return { ok: true };
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    await AsyncStorage.setItem(KEY_ENABLED, 'false');
    return { ok: false, reason: 'permission' };
  }
  await AsyncStorage.setItem(KEY_ENABLED, 'true');
  await scheduleJournalReminder(time);
  return { ok: true };
}

/** Cambia la hora y reagenda solo si el recordatorio está activo. */
export async function setJournalReminderTime(timeStr: string, enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_TIME, timeStr);
  if (enabled) await scheduleJournalReminder(timeStr);
}
