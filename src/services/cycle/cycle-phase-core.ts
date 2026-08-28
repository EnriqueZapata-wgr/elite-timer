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
): { cycleLen: number; fuente: 'observado' | 'ajuste'; cyclesUsed: number; minLen: number; maxLen: number } {
  const obs = observedCycleLength(periods ?? []);
  if (obs) {
    return {
      cycleLen: obs.length, fuente: 'observado', cyclesUsed: obs.cyclesUsed,
      minLen: obs.min, maxLen: obs.max,
    };
  }
  // Sin ciclos observados no hay variabilidad que reportar: min = max = el largo.
  // La banda de menor probabilidad sale angosta a proposito, y predecirOvulacion
  // la marca con nivel de confianza baja.
  const len = avgCycleLength ?? 28;
  return { cycleLen: len, fuente: 'ajuste', cyclesUsed: 0, minLen: len, maxLen: len };
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

/* ---------------------------------------------------------------------------
 * OVULACION Y VENTANA FERTIL
 *
 * Aprobado por Enrique el 23-ago-2026. Base documental con fuentes enlazadas en
 * R and D/CICLO_OVULACION_BASE_DOCUMENTAL_2026-08-23.md.
 *
 * MURIO la formula anterior, `inicio + round(largo / 2) - 1`, que vivia suelta en
 * app/cycle.tsx. No tenia respaldo en NINGUNA fuente: se busco en OMS, ACOG,
 * ASRM, NICE, CDC y Merck, y nadie parte el ciclo a la mitad. Coincidia con lo
 * documentado solo en el caso particular de 28 dias y se desviaba hasta 8 dias
 * en ciclos largos.
 *
 * Tres capas, cada una con su fuente:
 *
 *   punto = largo - lutea              ASRM: "the luteal phase is presumed to be
 *                                      approximately 14 days"
 *   alta  = punto-2 .. punto           ASRM: maxima probabilidad en los dos dias
 *                                      previos y el dia mismo
 *   baja  = ovulacion(cicloMasCorto)-5 .. ovulacion(cicloMasLargo)
 *
 * 4EP 23-ago: la banda baja usaba la formula de calendario ritmico de la OMS
 * (minL-18 .. maxL-11) y estaba MAL USADA. Esa formula esta disenada para EVITAR
 * embarazo: es deliberadamente ancha y por eso se pasa de la ovulacion. Metia tres
 * dias posteriores a la ovulacion, en los que Wilcox no registro ni un embarazo, y
 * meter dias post-ovulacion fue justamente una de las razones por las que se mato
 * la formula anterior. El argumento aplicaba mas fuerte a su reemplazo.
 *
 * Ahora la banda sale de las dos cosas que SI tenemos con fuente, sin importar
 * nada nuevo: la ventana de Wilcox (ovulacion-5 .. ovulacion) aplicada a todo el
 * rango de ciclos que esa persona ha tenido. Con ciclos parejos de 28 da 9..14,
 * que son exactamente los seis dias de Wilcox. Cero dias despues de ovular.
 *
 * La banda se ensancha SOLA cuando los ciclos de esa persona varian. Esa es la
 * honestidad del calculo: no vive en un texto de advertencia, vive en el ancho de
 * la banda. Un punto que acierta el dia exacto 21% de las veces (Johnson 2018,
 * midiendo LH real en 768 mujeres) no puede ir solo.
 *
 * El -14 es una CONVENCION de calculo, no una constante del cuerpo: Bull 2019,
 * con 612,613 ciclos, midio fase lutea de 12.4 dias con rango del 95% entre 7 y
 * 17. Por eso el punto se pinta como estimacion y nunca como hecho.
 * ------------------------------------------------------------------------- */

/** Fase lutea por convencion de calculo. ASRM. */
export const LUTEA_ESTANDAR = 14;
/**
 * Bull 2019 midio 8.0 dias de fase lutea en el tramo de 15 a 20 dias. Es el unico
 * tramo corto con valor publicado: para 21-23 no hay dato verificado, y esos
 * ciclos ya caen abajo del minimo normal de FIGO (24), asi que entran solos al
 * nivel de confianza baja. No se interpola nada.
 */
export const LUTEA_CICLO_CORTO = 8;
export const CICLO_CORTO_MAX = 20;

/** Rango normal de FIGO. Fuera de aqui la confianza es baja. */
export const CICLO_NORMAL_MIN = 24;
export const CICLO_NORMAL_MAX = 38;
/** FIGO: regular si la variacion entre ciclos no pasa de 7 dias. */
export const VARIACION_REGULAR_MAX = 7;

export type NivelVentana = 'alta' | 'media' | 'baja';

export interface VentanaFertil {
  /** Dia del ciclo mas probable de ovulacion. Dia 1 = primer dia de sangrado. */
  diaOvulacion: number;
  /** Banda de MAYOR probabilidad, en dias del ciclo. */
  altaInicio: number;
  altaFin: number;
  /** Banda de MENOR probabilidad. Contiene SIEMPRE a la alta. */
  bajaInicio: number;
  bajaFin: number;
  /**
   * Cuanta confianza merece el punto. Manda el ENFASIS visual y el texto, no si
   * se muestra: Enrique pidio que se vean siempre las dos cosas, rango y punto,
   * diferenciadas por color.
   */
  nivel: NivelVentana;
  /** Que fase lutea se uso, para poder decir de donde salio el numero. */
  luteaUsada: number;
}

/** La lutea que aplica a un largo dado. Bull para cortos, ASRM para el resto. */
function luteaDe(largo: number): number {
  return largo <= CICLO_CORTO_MAX ? LUTEA_CICLO_CORTO : LUTEA_ESTANDAR;
}
/** Dia del ciclo en que ovularia alguien con un ciclo de ese largo. */
function ovulacionDe(largo: number): number {
  return Math.max(1, largo - luteaDe(largo));
}

export function predecirOvulacion(e: {
  cycleLen: number;
  minLen?: number | null;
  maxLen?: number | null;
  cyclesUsed?: number;
}): VentanaFertil | null {
  const largo = Math.round(e.cycleLen);
  if (!Number.isFinite(largo) || largo < 15 || largo > 60) return null;

  const minL = e.minLen && Number.isFinite(e.minLen) ? Math.round(e.minLen) : largo;
  const maxL = e.maxLen && Number.isFinite(e.maxLen) ? Math.round(e.maxLen) : largo;
  const usados = e.cyclesUsed ?? 0;

  const luteaUsada = luteaDe(largo);
  const diaOvulacion = ovulacionDe(largo);

  const altaInicio = Math.max(1, diaOvulacion - 2);
  const altaFin = diaOvulacion;

  // La ventana de Wilcox aplicada al ciclo mas corto y al mas largo que esta
  // persona ha tenido. El anidamiento sale por construccion y no por parche:
  // bajaInicio = ovulacionDe(minL)-5 <= ovulacionDe(largo)-2 = altaInicio porque
  // minL <= largo; y bajaFin = ovulacionDe(maxL) >= ovulacionDe(largo) = altaFin
  // porque maxL >= largo. Los Math.max/min de abajo son cinturon y tirantes.
  const bajaInicio = Math.max(1, Math.min(ovulacionDe(minL) - 5, altaInicio));
  // No se pinta fertilidad dentro del ciclo siguiente: la banda se corta en el
  // largo del ciclo, donde ya empieza la menstruacion predicha.
  const bajaFin = Math.min(largo, Math.max(ovulacionDe(maxL), altaFin));

  const variacion = maxL - minL;
  let nivel: NivelVentana;
  if (usados < 2 || largo < CICLO_NORMAL_MIN || largo > CICLO_NORMAL_MAX || variacion > VARIACION_REGULAR_MAX) {
    nivel = 'baja';
  } else if (largo >= 26 && largo <= 32 && usados >= 4) {
    nivel = 'alta';
  } else {
    nivel = 'media';
  }

  return { diaOvulacion, altaInicio, altaFin, bajaInicio, bajaFin, nivel, luteaUsada };
}
