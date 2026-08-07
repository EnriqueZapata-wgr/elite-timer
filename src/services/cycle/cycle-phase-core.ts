/**
 * cycle-phase-core (MB-27 Pieza 3 · endurecido en el audit B1) — LA función
 * de fase Y la resolución única de {inicio, largo, periodo}.
 *
 * Antes la FUNCIÓN vivía triplicada con umbrales distintos; el audit B1
 * encontró que consolidarla no bastaba: los ARGUMENTOS seguían difiriendo
 * (/cycle: inicio de logs + largo observado + guarda de frescura; Entrenar:
 * inicio de cycle_periods + ajuste manual a secas, sin guarda). La misma
 * usuaria, dos fases el mismo día.
 *
 * Ahora la resolución completa vive AQUÍ (resolverCiclo) y las tres
 * superficies la consumen: la card de /cycle, sus bandas del calendario y
 * getCycleInfo (Entrenar, day-compiler, motor, emotion-history).
 *
 * La precedencia, decidida y defendida:
 *  · INICIO: cycle_periods[0].start_date manda — es la tabla durable que
 *    la pantalla de Ciclo reconstruye de los bloques is_period y la única
 *    legible sin cargar logs. Fallback a inicioDeLogs SOLO si periods está
 *    vacío (la pantalla de Ciclo lo deriva de sus logs mientras la
 *    reconstrucción llega; nadie más tiene logs a la mano).
 *  · LARGO: el observado (≥2 ciclos válidos, cycle-length-core) gana sobre
 *    el ajuste manual — doctrina M3.b: el ciclo APRENDE de lo registrado.
 *  · FRESCURA: sin periodo nuevo tras cycleLen + 14 días no hay fase (no
 *    se inventa "día 187 de tu ciclo"): la guarda vive ADENTRO para que
 *    ninguna superficie pueda olvidarla.
 *
 * Módulo de datos puros: cero supabase, cero react-native. Testeable node.
 */
import { parseLocalDate } from '@/src/utils/date-helpers';
import { observedCycleLength, type PeriodStartLike } from '@/src/services/cycle/cycle-length-core';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/** Umbrales canónicos sobre la duración del ciclo (fracción del largo). */
export const PHASE_FOLLICULAR_END = 0.46;
export const PHASE_OVULATION_END = 0.57;

/** Días de gracia tras el largo del ciclo antes de declarar el dato viejo. */
export const FRESCURA_DIAS_EXTRA = 14;

/**
 * Fase para un día del ciclo (1-based). Fuera de rango degrada a los
 * extremos: day < 1 se trata como 1 y un day más allá del largo es lútea
 * (el ciclo que se alarga no inventa fases nuevas). La FRESCURA no vive
 * aquí: vive en resolverCiclo, que es quien conoce el calendario.
 */
export function getPhase(day: number, cycleLen = 28, periodLen = 5): CyclePhase {
  if (day <= periodLen) return 'menstrual';
  if (day <= Math.round(cycleLen * PHASE_FOLLICULAR_END)) return 'follicular';
  if (day <= Math.round(cycleLen * PHASE_OVULATION_END)) return 'ovulation';
  return 'luteal';
}

/**
 * EL largo del ciclo: observado (≥2 ciclos válidos) ?? ajuste manual ?? 28.
 * Único punto de decisión — el calendario lo usa también para pintar meses
 * viejos cuando la resolución de HOY es null (dato viejo).
 */
export function largoDeCiclo(
  periods: PeriodStartLike[] | null,
  avgCycleLength?: number | null,
): { cycleLen: number; fuente: 'observado' | 'ajuste'; cyclesUsed: number } {
  const obs = observedCycleLength(periods ?? []);
  if (obs) return { cycleLen: obs.length, fuente: 'observado', cyclesUsed: obs.cyclesUsed };
  return { cycleLen: avgCycleLength ?? 28, fuente: 'ajuste', cyclesUsed: 0 };
}

/** Diferencia en días entre dos fechas locales 'YYYY-MM-DD' (b − a). */
function diffDiasLocal(a: string, b: string): number {
  return Math.round(
    (parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86400000,
  );
}

export interface EntradaCiclo {
  /** Inicios de periodo DESC (cycle_periods) — la fuente durable. */
  periods: PeriodStartLike[] | null;
  /** Fallback SOLO sin periods: inicio derivado de los logs (pantalla Ciclo). */
  inicioDeLogs?: string | null;
  /** cycle_settings.avg_cycle_length (ajuste manual). */
  avgCycleLength?: number | null;
  /** cycle_settings.avg_period_length. */
  avgPeriodLength?: number | null;
  /** getLocalToday() del caller (inyectado: puro y testeable). */
  hoy: string;
}

export interface CicloResuelto {
  inicio: string;
  day: number;
  cycleLen: number;
  periodLen: number;
  phase: CyclePhase;
  /** De dónde salió el largo (regla de la casa: siempre se dice). */
  largoFuente: 'observado' | 'ajuste';
  cyclesUsed: number;
}

/**
 * LA resolución. null = no hay fase que declarar: sin inicio conocido, fecha
 * futura, o dato viejo (guarda de frescura). Toda superficie que pinte fase
 * pasa por aquí — con los mismos datos, la misma respuesta, siempre.
 */
export function resolverCiclo(e: EntradaCiclo): CicloResuelto | null {
  const inicio = e.periods?.[0]?.start_date ?? e.inicioDeLogs ?? null;
  if (!inicio) return null;
  const { cycleLen, fuente, cyclesUsed } = largoDeCiclo(e.periods, e.avgCycleLength);
  const periodLen = e.avgPeriodLength ?? 5;
  const day = diffDiasLocal(inicio, e.hoy) + 1;
  if (day < 1 || day > cycleLen + FRESCURA_DIAS_EXTRA) return null;
  return {
    inicio,
    day,
    cycleLen,
    periodLen,
    phase: getPhase(day, cycleLen, periodLen),
    largoFuente: fuente,
    cyclesUsed,
  };
}
