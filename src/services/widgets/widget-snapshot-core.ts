/**
 * MB-32 — núcleo PURO del snapshot que la app empuja a los widgets.
 *
 * El widget nativo pinta EXACTAMENTE lo que hay aquí: si un hábito no entra
 * al snapshot, no existe en la pantalla de inicio. Por eso este módulo
 * aplica (de nuevo) el tri-estado de MB-26: graduados y en reposo NO entran,
 * aunque el compile ya los haya filtrado — defensa doble, con test.
 *
 * También decide qué fila es palomeable: los VERIFICADOS jamás — su check
 * nace de actividad real (VERIFIED_ELECTRON_KEYS) y su tap abre la app.
 * Momento y hora se derivan de las horas YA RESUELTAS del compile (MB-26
 * P5), con el default canónico de tareas-core como respaldo.
 *
 * Cero imports con runtime nativo: testeable en el harness node.
 */
import {
  TAREA_TIME,
  minutesFromMidnight,
  momentoForHour,
  type Momento,
} from '@/src/services/hoy/tareas-core';
import { VERIFIED_ELECTRON_KEYS } from '@/src/services/hoy/day-booleans';
import type { HabitEstado } from '@/src/services/hoy/habit-states-core';

export const WIDGET_SNAPSHOT_V = 1;

export interface WidgetThemePayload {
  mode: 'claro' | 'oscuro' | 'adaptativo' | 'sistema';
  despertarMin: number;
  corteMin: number;
}

export interface WidgetHabitRow {
  key: string;
  name: string;
  momento: Momento;
  timeMin: number;
  completed: boolean;
  palomeable: boolean;
}

export interface HabitosWidgetSnapshot {
  v: typeof WIDGET_SNAPSHOT_V;
  date: string;
  signedIn: true;
  theme: WidgetThemePayload;
  done: number;
  total: number;
  habits: WidgetHabitRow[];
}

export interface SignedOutSnapshot {
  v: typeof WIDGET_SNAPSHOT_V;
  signedIn: false;
}

/** Sin sesión: el widget no truena — invita a abrir la app (test 6). */
export function snapshotSignedOut(): SignedOutSnapshot {
  return { v: WIDGET_SNAPSHOT_V, signedIn: false };
}

export interface BuildHabitosParams {
  date: string;
  /** compiled.booleanElectrons: source + name + completed. */
  booleans: { source: string; name: string; completed: boolean }[];
  /** compiled.habitStates (sin entrada = activo). */
  habitStates: Record<string, HabitEstado>;
  /** compiled.habitTimes: horas resueltas 'HH:MM' por source. */
  habitTimes: Record<string, string>;
  theme: WidgetThemePayload;
}

export function buildHabitosSnapshot(params: BuildHabitosParams): HabitosWidgetSnapshot {
  const { date, booleans, habitStates, habitTimes, theme } = params;
  const habits: WidgetHabitRow[] = [];
  for (const b of booleans) {
    // MB-26: graduado y reposo NO aparecen en el widget. El compile ya los
    // filtra; esta es la defensa doble (test 4 del brief).
    const estado = habitStates[b.source];
    if (estado === 'graduado' || estado === 'reposo') continue;
    const hhmm = habitTimes[b.source] ?? TAREA_TIME[b.source] ?? '12:00';
    const timeMin = minutesFromMidnight(hhmm);
    habits.push({
      key: b.source,
      name: b.name,
      momento: momentoForHour(Math.floor(timeMin / 60)),
      timeMin,
      completed: b.completed,
      // Verificado ⇒ su check nace de actividad real: el widget NUNCA lo
      // palomea; su fila abre la app (mismo contrato que gestoForBool).
      palomeable: !(VERIFIED_ELECTRON_KEYS as readonly string[]).includes(b.source),
    });
  }
  return {
    v: WIDGET_SNAPSHOT_V,
    date,
    signedIn: true,
    theme,
    done: habits.filter((h) => h.completed).length,
    total: habits.length,
    habits,
  };
}

/**
 * Parche puntual tras ejecutar un toggle (el drenador corrige el snapshot
 * con el resultado REAL de la mutación, no con la intención). JSON ilegible
 * o sin ese hábito → null (el caller no empuja nada).
 */
export function patchHabitCompleted(
  snapshotJson: string | null,
  source: string,
  completed: boolean,
): string | null {
  if (!snapshotJson) return null;
  let snap: unknown;
  try {
    snap = JSON.parse(snapshotJson);
  } catch {
    return null;
  }
  if (typeof snap !== 'object' || snap === null) return null;
  const s = snap as { habits?: unknown; done?: number };
  if (!Array.isArray(s.habits)) return null;
  let found = false;
  for (const h of s.habits) {
    if (typeof h === 'object' && h !== null && (h as { key?: string }).key === source) {
      (h as { completed?: boolean }).completed = completed;
      found = true;
    }
  }
  if (!found) return null;
  s.done = (s.habits as { completed?: boolean }[]).filter((h) => h?.completed === true).length;
  return JSON.stringify(snap);
}
