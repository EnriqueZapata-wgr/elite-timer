/**
 * ARGOS Hábitos de hoy — lógica pura (pendiente 13.2, 31-ago-2026).
 *
 * EL BUG: ARGOS decía "Electrones hoy: 7/20" con el 20 CLAVADO en código y
 * el 7 sumado del ledger (electron_logs, que incluye pesos, extras de práctica
 * y premios de wearable). HOY, en cambio, cuenta HÁBITOS: cuántos renglones
 * tiene la persona activos hoy y cuántos están palomeados. Eran dos números
 * de dos universos, y ARGOS "leía mal" porque contestaba con el que no era.
 *
 * LA FUENTE: la misma derivación del renglón que hace day-compiler (HOY):
 *   1. keys = (prefs.active_boolean_electrons ?? DEFAULT_BOOLEANS) ∪ MANDATORY_BOOLEANS
 *   2. filtro de estados (graduado y reposo salen del renglón, MB-26)
 *   3. solo keys con peso en ELECTRON_WEIGHTS
 *   4. gate de sexo (period_log solo female) y de modo Ciclo (no en acompañante)
 *   5. completed: NO verificados → blob daily_electrons[k] === true;
 *                 VERIFICADOS   → hay fila en electron_logs hoy con ese source.
 *
 * El punto 5 es el único delta con HOY: HOY deriva los verificados de la
 * evidencia (emotional_checkins, exercise_logs, etc., diez consultas) y
 * luego RECONCILIA el ledger contra eso. Cada pantalla de actividad además
 * otorga el e- al momento. Leer el ledger aquí es leer lo que HOY mantiene
 * alineado, con una consulta en vez de diez. Si alguna vez divergen, HOY gana
 * y el ledger se corrige en el siguiente compile.
 *
 * DEUDA (4EP M3): `keysDelRenglon` es una COPIA de la derivación inline de
 * compileDay (day-compiler.ts, "Boolean electrons"). La derivación debería
 * vivir en un solo sitio; esta noche no se refactoriza day-compiler (otro
 * agente lo tocó). El candado que impide que diverjan sin aviso es
 * __tests__/argos-habitos-hoy-vs-day-compiler.test.ts.
 *
 * Sin supabase ni RN: se prueba en node.
 */
import { ELECTRON_WEIGHTS } from '@/src/constants/electrons';
import {
  DEFAULT_BOOLEANS, MANDATORY_BOOLEANS, VERIFIED_ELECTRON_KEYS, FEMALE_ONLY_ELECTRONS,
} from '@/src/services/hoy/day-booleans';
import { estadosPorKey, keysActivas, type HabitEstadoRow } from '@/src/services/hoy/habit-states-core';

export interface EntradaHabitosHoy {
  /** user_day_preferences.active_boolean_electrons (null = sin fila → defaults). */
  persistedBoolKeys: string[] | null;
  /** user_habit_states (null = no se pudo leer o no hay → todos activos). */
  habitStates: HabitEstadoRow[] | null;
  /** client_profiles.biological_sex. */
  biologicalSex: string | null;
  /** user_app_modes.mode para app_key 'ciclo' ('acompanante' apaga period_log). */
  cycleMode: string | null;
  /** daily_electrons.electrons de hoy (blob de booleanos; null = sin fila). */
  blob: Record<string, boolean> | null;
  /** sources con fila en electron_logs HOY (category boolean_daily). */
  ledgerHoy: string[];
}

export interface HabitosHoy {
  total: number;
  hechos: number;
  nombresHechos: string[];
  nombresPendientes: string[];
}

const VERIFICADOS: ReadonlySet<string> = new Set<string>(VERIFIED_ELECTRON_KEYS);

/** Las keys del renglón de HOY, en el mismo orden que el compile. */
export function keysDelRenglon(e: EntradaHabitosHoy): string[] {
  const persisted = e.persistedBoolKeys ?? DEFAULT_BOOLEANS;
  const estados = estadosPorKey(e.habitStates);
  const activas = keysActivas(Array.from(new Set([...persisted, ...MANDATORY_BOOLEANS])), estados);
  return activas
    .filter((k) => k in ELECTRON_WEIGHTS)
    .filter((k) => !FEMALE_ONLY_ELECTRONS.has(k) || e.biologicalSex === 'female')
    .filter((k) => k !== 'period_log' || e.cycleMode !== 'acompanante');
}

export function contarHabitosHoy(e: EntradaHabitosHoy): HabitosHoy {
  const keys = keysDelRenglon(e);
  const ledger = new Set(e.ledgerHoy);
  const blob = e.blob ?? {};
  const nombresHechos: string[] = [];
  const nombresPendientes: string[] = [];
  for (const k of keys) {
    const cfg = ELECTRON_WEIGHTS[k as keyof typeof ELECTRON_WEIGHTS];
    const completed = VERIFICADOS.has(k) ? ledger.has(k) : blob[k] === true;
    (completed ? nombresHechos : nombresPendientes).push(cfg.name);
  }
  return {
    total: keys.length,
    hechos: nombresHechos.length,
    nombresHechos,
    nombresPendientes,
  };
}
