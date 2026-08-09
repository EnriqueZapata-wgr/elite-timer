/**
 * Avisos por app (MB-23 Pieza 3) — el modelo mixto.
 *
 * Ajustes general conserva el maestro, las categorías y las horas de
 * silencio; la ficha de cada app decide si avisa, a qué hora y bajo qué
 * condición. ⚠️ EL MAESTRO MANDA: la decisión vive en planAppAviso
 * (notification-prefs-core, puro y con test) y se aplica al AGENDAR —
 * son notificaciones locales de hora fija, no hay código corriendo al
 * disparar, así que silent/quiet-hours se evalúan contra esa hora y la
 * condición "solo si no lo has hecho hoy" se re-evalúa en cada resync
 * (el compile de HOY llama syncAppAvisos con el estado real del día;
 * electrons_changed recompila → resync).
 *
 * V1: hora fija + 'solo si no lo has hecho hoy', SOLO para apps cuyo
 * hecho/no-hecho es un electrón booleano conocido en el cliente (meditar,
 * respirar, journal, sol). Las condicionales que necesitan datos AL
 * DISPARAR (agua atrasada, ventana UV, periodo cerca) son del despachador
 * server-side — quedan fuera de esta V1, reportadas.
 *
 * El aviso agendado es un one-shot (DATE): cada resync cancela y re-agenda
 * la próxima ocurrencia. Sin abrir la app no hay re-agendado — un usuario
 * que abandona recibe a lo más un aviso pendiente y silencio después.
 *
 * ⚠️ #28: JAMÁS cancelAllScheduledNotificationsAsync — agenda, journal
 * legacy y esto conviven; cada sistema cancela SOLO sus identifiers.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getNotificationPrefs } from '@/src/services/notification-prefs-service';
import {
  planAppAviso, parseAvisoCondition,
  type AppAvisoPref, type NotificationPrefs,
} from '@/src/services/notification-prefs-core';
// MB-30B P2: cada aviso lleva su categoría con botones ("Ya medité",
// "Recordar en 15 min"); el catálogo vive en notification-actions-core.
import { categoryForAviso } from '@/src/services/notification-actions-core';

const KEY_NOTIF_IDS = '@atp/app_aviso_notif_ids';

// Llaves legacy del recordatorio de journal (MB-22): se importan una vez a
// la tabla y se retiran, cancelando su notificación DAILY vieja.
const LEGACY_JOURNAL_ENABLED = '@atp/journal_reminder';
const LEGACY_JOURNAL_TIME = '@atp/journal_reminder_time';
const LEGACY_JOURNAL_NOTIF_ID = '@atp/journal_notif_id';

export type AvisoAppKey = 'meditar' | 'respirar' | 'journal' | 'sol';

interface AvisoAppMeta {
  appKey: AvisoAppKey;
  /** El electrón booleano que dice si "ya lo hiciste hoy". */
  source: string;
  defaultTime: string;
  title: string;
  body: string;
}

export const AVISO_APPS: AvisoAppMeta[] = [
  { appKey: 'meditar', source: 'meditation', defaultTime: '07:00', title: 'ATP · Meditación', body: 'Tu momento para meditar. Unos minutos bastan.' },
  { appKey: 'respirar', source: 'breathwork', defaultTime: '18:30', title: 'ATP · Respirar', body: 'Una ronda de respiración. Dos minutos.' },
  { appKey: 'journal', source: 'journal', defaultTime: '21:00', title: 'ATP · Descarga mental', body: '¿Cómo estuvo tu día? Tómate 5 minutos para escribir.' },
  { appKey: 'sol', source: 'sunlight', defaultTime: '07:30', title: 'ATP · Sol', body: 'Tu luz del día. Protección física primero.' },
];

export const AVISO_APP_KEYS: AvisoAppKey[] = AVISO_APPS.map((a) => a.appKey);

function metaFor(appKey: AvisoAppKey): AvisoAppMeta {
  return AVISO_APPS.find((a) => a.appKey === appKey)!;
}

/** Sin fila = el comportamiento de hoy: la app no avisa. */
export function avisoDefaults(appKey: AvisoAppKey): AppAvisoPref {
  return { enabled: false, time: metaFor(appKey).defaultTime, condition: 'not_done_today' };
}

function rowToPref(appKey: AvisoAppKey, row: any): AppAvisoPref {
  const def = avisoDefaults(appKey);
  return {
    enabled: row?.enabled === true,
    time: /^\d{2}:\d{2}$/.test(row?.notify_time ?? '') ? row.notify_time : def.time,
    condition: parseAvisoCondition(row?.condition),
  };
}

/** La preferencia de aviso de UNA app (fail-soft: error de red → defaults). */
export async function getAppAviso(userId: string, appKey: AvisoAppKey): Promise<AppAvisoPref> {
  try {
    const { data, error } = await supabase
      .from('user_app_notification_prefs')
      .select('enabled, notify_time, condition')
      .eq('user_id', userId)
      .eq('app_key', appKey)
      .maybeSingle();
    if (error) return avisoDefaults(appKey);
    return rowToPref(appKey, data);
  } catch {
    return avisoDefaults(appKey);
  }
}

/**
 * Escribe la preferencia de la ficha (patch parcial sobre lo guardado) y
 * re-sincroniza SOLO esa app. Al encender pide permiso de notificaciones;
 * sin permiso no deja el toggle prendido a medias (mismo contrato que tenía
 * el recordatorio de journal). El resync asume no-hecho (conservador); el
 * siguiente compile de HOY corrige con el dato real.
 */
export async function updateAppAviso(
  userId: string,
  appKey: AvisoAppKey,
  patch: Partial<AppAvisoPref>,
): Promise<{ ok: boolean; reason?: 'permission' }> {
  const current = await getAppAviso(userId, appKey);
  const next: AppAvisoPref = { ...current, ...patch };
  if (next.enabled) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'permission' };
  }
  const { error } = await supabase.from('user_app_notification_prefs').upsert(
    {
      user_id: userId,
      app_key: appKey,
      enabled: next.enabled,
      notify_time: next.time,
      condition: next.condition,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,app_key' },
  );
  if (error) {
    logWarn('[app-avisos] upsert failed', error);
    return { ok: false };
  }
  try {
    // Prefs ilegibles (null) = no se agenda nada; el próximo sync global con
    // lectura sana re-agenda esta ficha.
    const prefs = await getNotificationPrefs(userId);
    if (prefs) await syncOne(appKey, next, prefs, false);
    lastSyncSignature = null; // la ficha cambió: el próximo sync global no se salta
  } catch (e) {
    logWarn('[app-avisos] resync after update failed', e);
  }
  return { ok: true };
}

// ── Scheduling ──

async function readIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_NOTIF_IDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeIds(ids: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(KEY_NOTIF_IDS, JSON.stringify(ids));
}

/** Cancela SOLO el aviso propio de una app (identifier namespaced). */
async function cancelOne(appKey: AvisoAppKey, ids: Record<string, string>): Promise<void> {
  const id = ids[appKey];
  if (id) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* ya no existe */ }
    delete ids[appKey];
  }
}

async function syncOne(
  appKey: AvisoAppKey,
  aviso: AppAvisoPref,
  prefs: NotificationPrefs,
  doneToday: boolean,
): Promise<void> {
  const ids = await readIds();
  await cancelOne(appKey, ids);
  const now = new Date();
  const plan = planAppAviso(prefs, aviso, now.getHours() * 60 + now.getMinutes(), doneToday);
  if (plan) {
    const meta = metaFor(appKey);
    const [h, m] = aviso.time.split(':').map((x) => parseInt(x, 10));
    const fireDate = new Date(now);
    fireDate.setHours(h, m, 0, 0);
    if (plan === 'tomorrow') fireDate.setDate(fireDate.getDate() + 1);
    const categoryId = categoryForAviso(appKey);
    ids[appKey] = await Notifications.scheduleNotificationAsync({
      content: {
        title: meta.title,
        body: meta.body,
        sound: true,
        // MB-30B P2: botones de acción en el aviso (responder sin abrir).
        ...(categoryId ? { categoryIdentifier: categoryId } : {}),
        data: { avisoAppKey: appKey },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  }
  await writeIds(ids);
}

/**
 * Importa el recordatorio legacy de journal (AsyncStorage, MB-22) UNA vez:
 * quien lo tenía encendido conserva su aviso con su hora; la DAILY vieja se
 * cancela para no duplicar. Sin legacy encendido no nace fila (sin fila =
 * sin aviso, el comportamiento de hoy).
 */
async function importLegacyJournal(userId: string, hasRow: boolean): Promise<AppAvisoPref | null> {
  try {
    const [enabled, time, notifId] = await Promise.all([
      AsyncStorage.getItem(LEGACY_JOURNAL_ENABLED),
      AsyncStorage.getItem(LEGACY_JOURNAL_TIME),
      AsyncStorage.getItem(LEGACY_JOURNAL_NOTIF_ID),
    ]);
    if (enabled == null && time == null && notifId == null) return null;
    if (notifId) {
      try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch { /* ya no existe */ }
    }
    let imported: AppAvisoPref | null = null;
    if (!hasRow && enabled === 'true') {
      imported = {
        enabled: true,
        time: /^\d{2}:\d{2}$/.test(time ?? '') ? (time as string) : avisoDefaults('journal').time,
        condition: 'not_done_today',
      };
      const { error } = await supabase.from('user_app_notification_prefs').upsert(
        {
          user_id: userId,
          app_key: 'journal',
          enabled: true,
          notify_time: imported.time,
          condition: imported.condition,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,app_key' },
      );
      if (error) {
        // No se pudo escribir: no borres el legacy, se reintenta después.
        logWarn('[app-avisos] legacy journal import failed', error);
        return null;
      }
    }
    await AsyncStorage.multiRemove([LEGACY_JOURNAL_ENABLED, LEGACY_JOURNAL_TIME, LEGACY_JOURNAL_NOTIF_ID]);
    return imported;
  } catch (e) {
    logWarn('[app-avisos] legacy journal import failed', e);
    return null;
  }
}

// Firma del último sync aplicado: el compile de HOY corre cada pocos
// minutos y no tiene caso cancelar/re-agendar lo mismo una y otra vez.
let lastSyncSignature: string | null = null;

/**
 * Re-sincroniza TODOS los avisos por app contra el estado actual: maestro,
 * horas de silencio, fichas y hecho/no-hecho del día.
 *
 * `doneBySource` viene del compile de HOY (booleanElectrons). null = no hay
 * dato fresco (p. ej. al salir de Ajustes): se asume no-hecho, que agenda de
 * más nunca de menos, y el siguiente compile corrige.
 */
export async function syncAppAvisos(
  userId: string,
  doneBySource: Record<string, boolean> | null,
): Promise<void> {
  try {
    const [prefs, rowsRes] = await Promise.all([
      getNotificationPrefs(userId),
      supabase
        .from('user_app_notification_prefs')
        .select('app_key, enabled, notify_time, condition')
        .eq('user_id', userId),
    ]);
    // Prefs ilegibles = no se agenda nada (regla dura: ante la duda, silencio).
    if (!prefs) {
      logWarn('[app-avisos] prefs ilegibles — no se agenda nada');
      return;
    }
    if (rowsRes.error) {
      logWarn('[app-avisos] sync read failed', rowsRes.error);
      return;
    }
    const rows = new Map<string, any>((rowsRes.data ?? []).map((r: any) => [r.app_key, r]));

    const legacyImport = await importLegacyJournal(userId, rows.has('journal'));

    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const estados = AVISO_APPS.map((meta) => {
      const aviso = meta.appKey === 'journal' && legacyImport
        ? legacyImport
        : rows.has(meta.appKey)
          ? rowToPref(meta.appKey, rows.get(meta.appKey))
          : avisoDefaults(meta.appKey);
      const done = doneBySource?.[meta.source] === true;
      return { meta, aviso, done, plan: planAppAviso(prefs, aviso, minutesNow, done) };
    });

    // El plan entra a la firma: al cruzar la hora del aviso pasa de 'today'
    // a 'tomorrow' y eso DEBE re-agendar (el DATE de hoy ya se consumió).
    const signature = JSON.stringify({
      d: now.toDateString(),
      a: estados.map((e) => [e.meta.appKey, e.aviso, e.done, e.plan]),
    });
    if (signature === lastSyncSignature) return;

    for (const e of estados) {
      await syncOne(e.meta.appKey, e.aviso, prefs, e.done);
    }
    lastSyncSignature = signature;
  } catch (e) {
    logWarn('[app-avisos] sync failed', e);
  }
}
