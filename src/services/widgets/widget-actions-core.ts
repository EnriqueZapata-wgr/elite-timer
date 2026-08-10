/**
 * MB-32 · PIEZA 0 — núcleo PURO de las acciones del widget (sin RN).
 *
 * EL CANDADO, en una línea: el widget NO escribe. El Kotlin del widget no
 * conoce Supabase (ni URL, ni llave, ni HTTP): un tap encola una ACCIÓN en
 * SharedPreferences y despierta al runtime de JS (el que ya está corriendo,
 * o un HeadlessJsTaskService que lo levanta). El único que ejecuta es el
 * drenador de widget-actions.ts, y ejecuta por EXACTAMENTE los mismos
 * writers que la UI:
 *
 *   toggle_habit → persistBooleanToggle (tarea-actions, con el candado del
 *                  día de day-write-lock: serializado + lectura fresca)
 *   add_water    → addWater (hydration-service, el mismo writer que la
 *                  acción de notificación de MB-30B, también con candado)
 *
 * Una escritura propia aquí o en el .kt rompe el ledger (test de mutación).
 *
 * Este módulo decide lo TESTEABLE sin efectos: qué es una acción válida
 * (lo malformado se tira, no se ejecuta a medias) y qué plan de drenado
 * sale de una cola (dedup contra lo ya atendido; los toggles del mismo
 * hábito colapsan al último — el estado final es el mismo y el award es
 * idempotente; el agua NUNCA colapsa: cada +250 cuenta).
 */

import { VERIFIED_ELECTRON_KEYS } from '@/src/services/hoy/day-booleans';

export type WidgetAction =
  | { id: string; kind: 'toggle_habit'; source: string; next: boolean }
  | { id: string; kind: 'add_water'; ml: number };

/** Tope defensivo: una cola más larga que esto es un bug, no un backlog. */
export const MAX_QUEUE = 100;

/** +250 del widget; cualquier ml fuera de este rango es malformado. */
export const WATER_ML_MIN = 1;
export const WATER_ML_MAX = 2000;

function esAccionValida(x: unknown): x is WidgetAction {
  if (typeof x !== 'object' || x === null) return false;
  const a = x as Record<string, unknown>;
  if (typeof a.id !== 'string' || a.id.length === 0 || a.id.length > 80) return false;
  if (a.kind === 'toggle_habit') {
    return (
      typeof a.source === 'string' && a.source.length > 0 && a.source.length <= 60 &&
      typeof a.next === 'boolean' &&
      // Los VERIFICADOS jamás se palomean por declaración: su check nace de
      // actividad real y el widget solo abre la app. Una acción así en la
      // cola es malformada (o un snapshot corrupto) y se tira.
      !(VERIFIED_ELECTRON_KEYS as readonly string[]).includes(a.source)
    );
  }
  if (a.kind === 'add_water') {
    return (
      typeof a.ml === 'number' && Number.isFinite(a.ml) &&
      a.ml >= WATER_ML_MIN && a.ml <= WATER_ML_MAX
    );
  }
  return false;
}

/**
 * JSON de la cola nativa → acciones válidas, en orden. Tolerante: JSON roto
 * o no-arreglo = cola vacía; un elemento malformado se tira sin tumbar a los
 * demás. Nunca lanza (un handler en frío no tiene quién lo atrape).
 */
export function parseWidgetActions(json: string | null | undefined): WidgetAction[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter(esAccionValida).slice(0, MAX_QUEUE);
}

/**
 * El plan de drenado de una cola:
 *   1. fuera lo ya atendido (dedup por id — el replay del arranque en frío
 *      no puede duplicar, misma doctrina que markResponseHandled de MB-30B);
 *   2. fuera el id repetido dentro de la misma cola (un tap, una acción);
 *   3. los toggle del MISMO hábito colapsan al ÚLTIMO (on→off→on ≡ on:
 *      mismo blob final, mismo ledger porque el award es idempotente por
 *      user:source:día y el revoke solo borra el día);
 *   4. el agua se queda ENTERA y en orden: cada +250 es una entrada real.
 */
export function planDrain(
  actions: WidgetAction[],
  handledIds: ReadonlySet<string> | string[],
): WidgetAction[] {
  const handled = handledIds instanceof Set ? handledIds : new Set(handledIds);
  const vistos = new Set<string>();
  const frescas = actions.filter((a) => {
    if (handled.has(a.id) || vistos.has(a.id)) return false;
    vistos.add(a.id);
    return true;
  });

  const ultimoTogglePorSource = new Map<string, string>();
  for (const a of frescas) {
    if (a.kind === 'toggle_habit') ultimoTogglePorSource.set(a.source, a.id);
  }
  return frescas.filter(
    (a) => a.kind !== 'toggle_habit' || ultimoTogglePorSource.get(a.source) === a.id,
  );
}
