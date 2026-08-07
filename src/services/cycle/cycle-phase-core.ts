/**
 * cycle-phase-core (MB-27 Pieza 3) — LA función de fase. Única.
 *
 * Antes vivía triplicada con umbrales distintos: cycle-service (0.46/0.57
 * sobre cycle_periods), app/cycle.tsx (calcPhase con ovDay = len/2 sobre
 * cycle_daily_logs) y CycleCalendar (su propia copia de 0.46/0.57). Dos
 * fuentes y dos umbrales = la app podía decirle a la misma usuaria que
 * estaba en dos fases distintas el mismo día, según la pantalla.
 *
 * Ahora el corte vive AQUÍ y solo aquí (test de mutación 9: cambiar un
 * umbral en un solo consumidor truena). Los datos vienen de cycle_periods,
 * que la pantalla de Ciclo reconstruye de los bloques is_period de
 * cycle_daily_logs: una fuente, una función.
 *
 * Módulo de datos puros: cero supabase, cero react-native. Testeable node.
 */

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/** Umbrales canónicos sobre la duración del ciclo (fracción del largo). */
export const PHASE_FOLLICULAR_END = 0.46;
export const PHASE_OVULATION_END = 0.57;

/**
 * Fase para un día del ciclo (1-based). Fuera de rango degrada a los
 * extremos: day < 1 se trata como 1 y un day más allá del largo es lútea
 * (el ciclo que se alarga no inventa fases nuevas).
 */
export function getPhase(day: number, cycleLen = 28, periodLen = 5): CyclePhase {
  if (day <= periodLen) return 'menstrual';
  if (day <= Math.round(cycleLen * PHASE_FOLLICULAR_END)) return 'follicular';
  if (day <= Math.round(cycleLen * PHASE_OVULATION_END)) return 'ovulation';
  return 'luteal';
}
