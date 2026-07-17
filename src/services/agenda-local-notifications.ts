/**
 * Notificaciones LOCALES de agenda (#28) — el mecanismo que SÍ funciona.
 *
 * El path push server (edge dispatch-agenda-notifications) depende de token +
 * cron + notify_at; cualquier eslabón faltante = no llega. Aquí replicamos el
 * mecanismo del recordatorio de journal (Notifications.scheduleNotificationAsync
 * on-device, sin infra) por evento de agenda con recordatorio configurado.
 *
 * LANDMINE (documentado en delivery): NUNCA usar
 * `cancelAllScheduledNotificationsAsync` — borraría el recordatorio de journal
 * (y viceversa). Cancelamos SOLO por identifier propio, guardado namespaced en
 * AsyncStorage. El push server queda como refuerzo (no se toca).
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAgendaForDate } from '@/src/services/agenda-service';
import { warn as logWarn } from '@/src/lib/logger';

/** Mapa {logId → notificationIdentifier} de las notifs de agenda ya programadas. */
const AGENDA_NOTIF_IDS_KEY = '@atp/agenda_notif_ids';

async function readScheduledIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(AGENDA_NOTIF_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

/**
 * (Re)programa las notificaciones locales de los eventos de HOY con recordatorio.
 * Idempotente y barata de re-llamar (entrada a /agenda, crear/editar evento):
 * cancela SOLO sus identifiers previos y re-agenda lo vigente.
 */
export async function syncAgendaLocalNotifications(userId: string, date?: string): Promise<void> {
  try {
    // Sin permiso no hay nada que agendar (no pedimos aquí — lo pide el flujo de UI).
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;

    // 1) Cancelar SOLO lo nuestro (identifiers namespaced, nada de cancelAll).
    const prev = await readScheduledIds();
    for (const identifier of Object.values(prev)) {
      try { await Notifications.cancelScheduledNotificationAsync(identifier); } catch { /* ya disparó */ }
    }

    // 2) Re-agendar lo vigente: pendientes con recordatorio > 0 y hora futura.
    const events = await getAgendaForDate(userId, date);
    const next: Record<string, string> = {};
    const now = Date.now();
    for (const ev of events) {
      if (ev.status !== 'pending' && ev.status !== 'snoozed') continue;
      if (!ev.notifyMinutesBefore || ev.notifyMinutesBefore <= 0) continue;
      const fireAt = new Date(new Date(ev.scheduledAt).getTime() - ev.notifyMinutesBefore * 60000);
      if (fireAt.getTime() <= now) continue;
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `ATP — ${ev.name}`,
          body: `En ${ev.notifyMinutesBefore} min: ${ev.name} (${ev.time}).`,
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
      next[ev.id] = identifier;
    }
    await AsyncStorage.setItem(AGENDA_NOTIF_IDS_KEY, JSON.stringify(next));
  } catch (err) {
    logWarn('[agenda-local-notifications] sync failed', err);
  }
}
