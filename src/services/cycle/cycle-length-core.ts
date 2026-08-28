/**
 * Longitud de ciclo observada — núcleo puro (bug Mariana M3.b).
 *
 * Todo el calendario de /cycle se construía con settings.avg_cycle_length,
 * que solo cambia si la usuaria lo teclea a mano: las predicciones nunca
 * aprendían de los ciclos registrados y siempre decían "de 28". Aquí vive el
 * promedio observado que comparten resolverCiclo (cycle-phase-core) y la pantalla
 * de ciclo. Regla de la casa: quien use este número DEBE decir de dónde sale.
 * Nunca se cambia un dato de su cuerpo en silencio.
 *
 * Sin imports con runtime nativo: testeable en el harness node.
 */
import { parseLocalDate } from '@/src/utils/date-helpers';

/** Ventana fisiológica: un gap fuera de (20, 45) días no es un ciclo confiable. */
export const MIN_CYCLE_DAYS = 20;
export const MAX_CYCLE_DAYS = 45;
/** Cuántos periodos recientes se miran (hasta 5 gaps entre 6 inicios). */
const MAX_PERIODS = 6;
/** Con menos de 2 ciclos válidos no se aprende: manda el ajuste manual. */
const MIN_CYCLES_TO_LEARN = 2;

export interface PeriodStartLike { start_date: string }

/**
 * Duraciones de ciclo válidas entre inicios consecutivos. `periods` viene
 * ordenado DESC por fecha (el más reciente primero), como lo entrega la
 * query de cycle_periods.
 */
export function cycleLengthsFromPeriods(periods: PeriodStartLike[]): number[] {
  const lengths: number[] = [];
  for (let i = 1; i < Math.min(periods.length, MAX_PERIODS); i++) {
    const d = Math.floor(
      (parseLocalDate(periods[i - 1].start_date).getTime() - parseLocalDate(periods[i].start_date).getTime()) / 86400000,
    );
    if (d > MIN_CYCLE_DAYS && d < MAX_CYCLE_DAYS) lengths.push(d);
  }
  return lengths;
}

export interface ObservedCycle {
  /** Promedio redondeado de los ciclos válidos. */
  length: number;
  /** Cuántos ciclos alimentan el promedio (para poder decir de dónde sale). */
  cyclesUsed: number;
  /** El ciclo más corto observado. La ventana fértil se ensancha con él. */
  min: number;
  /** El más largo. Junto con `min` da la variabilidad real de ESTE cuerpo,
   *  que es lo que decide qué tan ancha se pinta la banda de menor
   *  probabilidad (fórmula de calendario rítmico de la OMS). */
  max: number;
}

/**
 * Promedio observado, solo con evidencia suficiente (≥2 ciclos válidos).
 * null = no hay con qué aprender todavía: usar el ajuste manual.
 */
export function observedCycleLength(periods: PeriodStartLike[]): ObservedCycle | null {
  const lengths = cycleLengthsFromPeriods(periods);
  if (lengths.length < MIN_CYCLES_TO_LEARN) return null;
  return {
    length: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
    cyclesUsed: lengths.length,
    min: Math.min(...lengths),
    max: Math.max(...lengths),
  };
}
