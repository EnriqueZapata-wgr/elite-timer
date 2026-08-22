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

/**
 * La próxima menstruación, DERIVADA DE LA RESOLUCIÓN. No la calcula: la lee.
 *
 * 22-ago-2026 — MURIÓ predictNext, que era la última resolución paralela del
 * largo del ciclo. El Audit B1 mató a su hermana (getCycleDay) y dejó un
 * candado para que no volviera, pero la lista nunca cubrió a ésta, así que
 * siguió viva y ARGOS la publicaba.
 *
 * Hacía dos cosas que la doctrina de la casa prohíbe:
 *  · Aprendía el largo con UN solo ciclo registrado. cycle-length-core exige
 *    dos y lo dice en su comentario: "con menos de 2 ciclos válidos no se
 *    aprende: manda el ajuste manual".
 *  · Si no podía aprender, caía a 28 duro en vez de al ajuste que la usuaria
 *    escribió a mano. Le cambiaba su dato en silencio.
 *
 * Resultado medible: con un intervalo de 27 días y ajuste manual de 32, la
 * tarjeta de /cycle decía 2 de septiembre y ARGOS decía 28 de agosto. Cinco
 * días de diferencia, en la misma sesión, sobre el mismo cuerpo.
 *
 * Ahora sale de `inicio` y `cycleLen` de resolverCiclo, que es exactamente lo
 * que pinta la tarjeta y el calendario. Una sola cuenta, tres superficies.
 *
 * Vive en el CORE y no en el servicio porque es aritmética pura: así se
 * puede probar sin arrastrar Supabase ni react-native, que es justo lo que
 * hizo tronar la prueba cuando estaba del otro lado.
 *
 * 4EP MEDIO-2 (22-ago) — `daysUntil` estaba clampeado a 0 y `date` no, así
 * que con retraso (resolverCiclo tolera hasta 14 días de gracia) la tarjeta
 * decía "~0d" y ARGOS publicaba una fecha YA VENCIDA como si fuera futura.
 * Otra vez dos lecturas del mismo cuerpo. Ahora la función lo dice: cuando
 * la estimada ya pasó, `retrasada` es true y `diasDeRetraso` trae por
 * cuántos. Quien publique decide qué hacer con eso; lo que no puede es
 * enseñar una fecha del pasado con la palabra "próximo" delante.
 */
export function predecirProximo(res: {
  inicio: string;
  day: number;
  cycleLen: number;
  cyclesUsed?: number;
}): { date: Date; daysUntil: number; confidence: string; retrasada: boolean; diasDeRetraso: number } {
  const date = parseLocalDate(res.inicio);
  date.setDate(date.getDate() + res.cycleLen);
  // Mismo despeje que la tarjeta (app/cycle.tsx): cuántos días faltan para
  // cerrar el ciclo. En días locales, sin mezclar relojes. Negativo = retraso.
  const faltan = res.cycleLen - res.day + 1;
  const daysUntil = Math.max(0, faltan);
  const retrasada = faltan < 0;
  const diasDeRetraso = retrasada ? -faltan : 0;
  const usados = res.cyclesUsed ?? 0;
  const confidence = usados >= 3 ? 'alta' : usados >= 2 ? 'media' : 'baja';
  return { date, daysUntil, confidence, retrasada, diasDeRetraso };
}
