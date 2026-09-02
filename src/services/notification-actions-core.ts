/**
 * MB-30B Pieza 2 — núcleo PURO de las acciones de notificación (sin RN).
 *
 * Aquí vive el CATÁLOGO de categorías (qué botones trae cada aviso) y las
 * dos decisiones testables:
 *   - resolveNotificationAction: qué intención dispara un actionIdentifier.
 *   - canSnoozeAt: si "Recordar en 15" puede reprogramar — EL MAESTRO MANDA
 *     (modo silent = nada) y las horas de silencio aplican a la hora a la
 *     que caería el recordatorio. Prefs ilegibles (null) = no se agenda
 *     nada, el mismo tri-estado duro de app-avisos.
 *
 * ⚠️ LEDGER: las intenciones de registro se EJECUTAN en
 * notification-actions.ts por EXACTAMENTE los mismos writers que la UI
 * (addWater de hydration-service, registrarExperiencia de tarea-actions).
 * Cero rutas paralelas: un INSERT propio aquí rompe el ledger de electrones
 * (reconcileVerifiedLedger lo revocaría) y hay test de mutación que truena.
 *
 * "Ya lo hice" del SOL (31-ago-2026, pendiente 12.6): entra por
 * persistBooleanToggle, el MISMO writer del palomeo de HOY. MB-30B lo dejó
 * fuera porque ese writer mezclaba sobre el mapa que le pasaba la UI; desde
 * MB-32 P0 serializa por day-write-lock y mezcla sobre lectura fresca, así
 * que desde un handler en frío no pisa nada. El electrón sale por su puerta
 * de siempre (awardBooleanElectron con idempotencyKey user:source:día) y el
 * sync HOY→Agenda marca el evento de luz solar completado.
 *
 * Fuera a conciencia (reportado en el brief):
 *   - El aviso de agua CONDICIONAL (solo si vas atrasado) es B1 del FIFO
 *     (despachador server). La categoría 'hidratacion' queda registrada y el
 *     cliente ya sabe responderla: B1 solo tiene que emitir con ese id.
 */

export const SNOOZE_MINUTES = 15;

/** Acciones (ids compartidos entre categorías donde aplica). */
export const ACTION_DONE_MEDITATION = 'done_meditation';
export const ACTION_DONE_BREATHWORK = 'done_breathwork';
export const ACTION_LOG_WATER_250 = 'log_water_250';
export const ACTION_DONE_SUNLIGHT = 'done_sunlight';
export const ACTION_OPEN_JOURNAL = 'open_journal';
export const ACTION_SNOOZE_15 = 'snooze_15';

export interface NotificationActionDef {
  identifier: string;
  buttonTitle: string;
  /** true = el botón abre la app (para lo que no se puede hacer a ciegas). */
  opensApp: boolean;
}

export interface NotificationCategoryDef {
  identifier: string;
  actions: NotificationActionDef[];
}

const SNOOZE_ACTION: NotificationActionDef = {
  identifier: ACTION_SNOOZE_15,
  buttonTitle: `Recordar en ${SNOOZE_MINUTES} min`,
  opensApp: false,
};

/**
 * Catálogo completo. Los ids 'aviso_*' los agenda app-avisos-service;
 * 'hidratacion' la emitirá el despachador server-side (B1).
 */
export const NOTIFICATION_CATEGORIES: NotificationCategoryDef[] = [
  {
    identifier: 'aviso_meditar',
    actions: [
      { identifier: ACTION_DONE_MEDITATION, buttonTitle: 'Ya medité', opensApp: false },
      SNOOZE_ACTION,
    ],
  },
  {
    identifier: 'aviso_respirar',
    actions: [
      { identifier: ACTION_DONE_BREATHWORK, buttonTitle: 'Ya respiré', opensApp: false },
      SNOOZE_ACTION,
    ],
  },
  {
    identifier: 'aviso_journal',
    actions: [
      // Escribir un journal desde la pantalla bloqueada no existe: el botón
      // abre la app directo en la pantalla de escritura.
      { identifier: ACTION_OPEN_JOURNAL, buttonTitle: 'Escribir ahora', opensApp: true },
      SNOOZE_ACTION,
    ],
  },
  {
    identifier: 'aviso_sol',
    actions: [
      { identifier: ACTION_DONE_SUNLIGHT, buttonTitle: 'Ya tomé sol', opensApp: false },
      SNOOZE_ACTION,
    ],
  },
  {
    identifier: 'hidratacion',
    actions: [
      { identifier: ACTION_LOG_WATER_250, buttonTitle: 'Ya tomé agua (+250 ml)', opensApp: false },
    ],
  },
];

/** Categoría que agenda app-avisos-service para cada appKey (o null). */
export function categoryForAviso(appKey: string): string | null {
  const id = `aviso_${appKey}`;
  return NOTIFICATION_CATEGORIES.some((c) => c.identifier === id) ? id : null;
}

export type NotificationActionIntent =
  | { kind: 'log_water'; ml: number }
  | { kind: 'log_meditation'; minutes: number }
  | { kind: 'log_breathwork'; minutes: number }
  /** Palomear un hábito booleano de HOY (el writer es persistBooleanToggle). */
  | { kind: 'log_boolean'; source: 'sunlight' }
  | { kind: 'open_route'; route: string }
  | { kind: 'snooze'; minutes: number }
  | { kind: 'none' };

/**
 * actionIdentifier → intención. Los minutos por defecto son los del registro
 * manual honesto: meditación 15 (el default de "Ya medité" en el módulo),
 * respiración 5 (una ronda típica). El writer es el mismo en ambos casos.
 */
export function resolveNotificationAction(actionIdentifier: string): NotificationActionIntent {
  switch (actionIdentifier) {
    case ACTION_DONE_MEDITATION:
      return { kind: 'log_meditation', minutes: 15 };
    case ACTION_DONE_BREATHWORK:
      return { kind: 'log_breathwork', minutes: 5 };
    case ACTION_LOG_WATER_250:
      return { kind: 'log_water', ml: 250 };
    case ACTION_DONE_SUNLIGHT:
      return { kind: 'log_boolean', source: 'sunlight' };
    case ACTION_OPEN_JOURNAL:
      return { kind: 'open_route', route: '/journal' };
    case ACTION_SNOOZE_15:
      return { kind: 'snooze', minutes: SNOOZE_MINUTES };
    default:
      return { kind: 'none' };
  }
}

// ── Gate del snooze ─────────────────────────────────────────────────────────

import {
  isInQuietHours,
  type NotificationPrefs,
} from '@/src/services/notification-prefs-core';

/**
 * ¿"Recordar en 15" puede reprogramar un aviso que caería a `targetMinutes`?
 *
 *   - prefs null (ilegibles) → NO. Ante la duda, silencio (tri-estado duro).
 *   - modo 'silent' → NO. El maestro manda: ninguna acción reprograma nada.
 *   - target dentro de horas de silencio → NO (no se patea el aviso adentro
 *     de la ventana que el usuario pidió en paz).
 */
export function canSnoozeAt(prefs: NotificationPrefs | null, targetMinutes: number): boolean {
  if (!prefs) return false;
  if (prefs.mode === 'silent') return false;
  const t = ((targetMinutes % 1440) + 1440) % 1440;
  if (isInQuietHours(prefs, t)) return false;
  return true;
}
