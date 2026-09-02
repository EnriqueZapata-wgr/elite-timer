/**
 * MB-30B Pieza 2 — acciones de notificación (la parte nativa de MB-24).
 *
 * Registra las categorías (botones en el aviso: "Ya medité", "Ya tomé agua",
 * "Recordar en 15 min") y despacha las respuestas.
 *
 * ⚠️ LEDGER — REGLA DURA: lo registrado desde una acción entra por el MISMO
 * camino que el registro normal. Aquí NO se toca supabase directo:
 *   - agua      → addWater (hydration-service, el writer de la card de HOY)
 *   - meditar   → registrarExperiencia (tarea-actions, el writer de
 *                 "Ya medité" del módulo Mente)
 *   - respirar  → registrarExperiencia (mismo writer, source breathwork)
 *   - sol       → persistBooleanToggle (tarea-actions, el writer del palomeo
 *                 de HOY; atómico desde MB-32 P0, por eso ya cabe aquí)
 * Todos los writers emiten sus DeviceEventEmitter y premian electrones por su
 * propia puerta. Una ruta paralela aquí = ledger roto (test de mutación).
 *
 * ⚠️ SNOOZE — EL MAESTRO MANDA: "Recordar en 15" pasa por canSnoozeAt
 * (prefs ilegibles o modo silent = NO reprograma nada; horas de silencio
 * aplican a la hora a la que caería). El id agendado vive en su propio mapa
 * (LANDMINE #28: cada sistema cancela SOLO sus identifiers — jamás
 * cancelAllScheduledNotificationsAsync).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { warn as logWarn } from '@/src/lib/logger';
import { addWater } from '@/src/services/hydration-service';
import { registrarExperiencia, persistBooleanToggle } from '@/src/services/hoy/tarea-actions';
import { getNotificationPrefs } from '@/src/services/notification-prefs-service';
import {
  NOTIFICATION_CATEGORIES, SNOOZE_MINUTES,
  resolveNotificationAction, canSnoozeAt,
} from '@/src/services/notification-actions-core';

const KEY_SNOOZE_IDS = '@atp/notif_action_snooze_ids';
const KEY_LAST_HANDLED = '@atp/notif_action_last_handled';

/**
 * Registra el catálogo de categorías en el sistema. Idempotente (el SO
 * reemplaza por identifier). Se llama una vez al montar el bridge.
 */
export async function registerNotificationCategories(): Promise<void> {
  try {
    for (const cat of NOTIFICATION_CATEGORIES) {
      await Notifications.setNotificationCategoryAsync(
        cat.identifier,
        cat.actions.map((a) => ({
          identifier: a.identifier,
          buttonTitle: a.buttonTitle,
          options: { opensAppToForeground: a.opensApp },
        })),
      );
    }
  } catch (e) {
    logWarn('[notif-actions] register categories failed', e);
  }
}

// ── Snooze (ids namespaced propios) ─────────────────────────────────────────

async function readSnoozeIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SNOOZE_IDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function snoozeFromResponse(
  userId: string,
  response: Notifications.NotificationResponse,
): Promise<void> {
  const target = new Date(Date.now() + SNOOZE_MINUTES * 60_000);
  const targetMinutes = target.getHours() * 60 + target.getMinutes();
  // EL MAESTRO MANDA: prefs ilegibles, modo silent o silencio a esa hora →
  // ninguna acción reprograma nada.
  const prefs = await getNotificationPrefs(userId);
  if (!canSnoozeAt(prefs, targetMinutes)) return;

  const content = response.notification.request.content;
  const categoryId = content.categoryIdentifier ?? 'sin_categoria';
  const ids = await readSnoozeIds();
  // Un snooze vivo por categoría: el anterior se cancela (solo el propio).
  const prev = ids[categoryId];
  if (prev) {
    try { await Notifications.cancelScheduledNotificationAsync(prev); } catch { /* ya no existe */ }
  }
  ids[categoryId] = await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title ?? 'ATP',
      body: content.body ?? '',
      sound: true,
      ...(content.categoryIdentifier ? { categoryIdentifier: content.categoryIdentifier } : {}),
      data: (content.data as Record<string, unknown>) ?? {},
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
  await AsyncStorage.setItem(KEY_SNOOZE_IDS, JSON.stringify(ids));
}

// ── Despacho ────────────────────────────────────────────────────────────────

/**
 * Maneja UNA respuesta de notificación. Devuelve la ruta a abrir si la
 * acción lo pide (la navegación la hace el bridge, que vive en React).
 */
export async function handleNotificationResponse(
  userId: string,
  response: Notifications.NotificationResponse,
): Promise<{ openRoute: string | null }> {
  const intent = resolveNotificationAction(response.actionIdentifier);
  try {
    switch (intent.kind) {
      case 'log_water': {
        // MISMO camino que la card de agua de HOY (writer único de
        // hydration_logs; emite day_changed + electrons_changed él mismo).
        const total = await addWater(userId, intent.ml);
        if (total == null) logWarn('[notif-actions] addWater desde acción falló');
        break;
      }
      case 'log_meditation': {
        // MISMO camino que "Ya medité" del módulo (mind_sessions vía
        // registrarExperiencia; electrón por awardPracticeElectron).
        const res = await registrarExperiencia(userId, 'meditation', intent.minutes);
        if (!res.ok) logWarn('[notif-actions] registrarExperiencia meditation falló', res.error);
        break;
      }
      case 'log_breathwork': {
        const res = await registrarExperiencia(userId, 'breathwork', intent.minutes);
        if (!res.ok) logWarn('[notif-actions] registrarExperiencia breathwork falló', res.error);
        break;
      }
      case 'log_boolean': {
        // MISMO camino que el palomeo de la fila de HOY. El mapa vacío es solo
        // el respaldo de la primera escritura del día: el writer lee el blob
        // fresco bajo candado y mezcla sobre él.
        await persistBooleanToggle(userId, intent.source, true, {});
        break;
      }
      case 'snooze':
        await snoozeFromResponse(userId, response);
        break;
      case 'open_route':
        return { openRoute: intent.route };
      case 'none':
        break;
    }
  } catch (e) {
    logWarn('[notif-actions] handle response failed', e);
  }
  return { openRoute: null };
}

// ── Cold start (la acción llegó con la app muerta) ──────────────────────────

function responseKey(response: Notifications.NotificationResponse): string {
  return `${response.notification.request.identifier}::${response.actionIdentifier}`;
}

/** Marca una respuesta como atendida (dedup del cold start). */
export async function markResponseHandled(
  response: Notifications.NotificationResponse,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LAST_HANDLED, responseKey(response));
  } catch { /* dedup best-effort */ }
}

/**
 * Al arrancar: si el SO guardó una respuesta de acción que nadie atendió
 * (app muerta al tocar el botón), se procesa UNA vez. El registro llega
 * tarde pero por el mismo camino — mejor tarde que por ruta paralela.
 */
export async function handleInitialNotificationResponse(
  userId: string,
): Promise<{ openRoute: string | null }> {
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (!last || last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return { openRoute: null };
    }
    const handled = await AsyncStorage.getItem(KEY_LAST_HANDLED);
    if (handled === responseKey(last)) return { openRoute: null };
    await markResponseHandled(last);
    return handleNotificationResponse(userId, last);
  } catch (e) {
    logWarn('[notif-actions] initial response failed', e);
    return { openRoute: null };
  }
}
