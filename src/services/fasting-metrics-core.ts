/**
 * Fasting Metrics Core — la métrica de mejora del ayuno cambia de eje
 * (MB-9 · Track E). Lo que se reporta NO son horas aguantadas sino qué tan
 * RÁPIDO cambias de combustible: eso es flexibilidad metabólica, y tiene
 * respaldo primario (Goodpaster & Sparks, Cell Metabolism 2017). Dos ayunos de
 * 16 h con meses de diferencia y distinta hora de cambio → mismo ayuno, mejor
 * metabolismo. La curva se mueve a la IZQUIERDA, nunca la barra más lejos.
 *
 * También el modo medido (E.3): con glucosa y cetonas en sangre, el estado real
 * se lee vía GKI (Meidenbauer, Mukherjee & Seyfried 2015).
 *
 * ⚠️ El GKI viene de terapia metabólica oncológica. Se usa como PROFUNDIDAD DE
 * CETOSIS, NUNCA como afirmación de autofagia (doctrina Track D).
 *
 * Sin imports de RN/supabase → Vitest node.
 */

const round = (n: number, d = 2) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

// ═══ E.3 · GKI (Glucose Ketone Index) ═══

/** mg/dL → mmol/L (estándar en México captura mg/dL). Factor 18.016. */
export const MGDL_TO_MMOL = 18.016;
export function mgdlToMmol(mgdl: number): number {
  return round(mgdl / MGDL_TO_MMOL, 3);
}

export type GlucoseUnit = 'mmol' | 'mgdl';

/**
 * GKI = glucosa (mmol/L) ÷ cetonas (mmol/L). Devuelve null si las cetonas no son
 * positivas (sin denominador no hay índice — no se inventa un número).
 */
export function computeGKI(
  glucose: number,
  ketones: number,
  glucoseUnit: GlucoseUnit = 'mmol',
): number | null {
  if (!(ketones > 0) || !(glucose > 0)) return null;
  const gMmol = glucoseUnit === 'mgdl' ? glucose / MGDL_TO_MMOL : glucose;
  return round(gMmol / ketones, 2);
}

export type GkiDepthKey = 'max' | 'deep' | 'moderate' | 'glycolytic';

export interface GkiZone {
  key: GkiDepthKey;
  /** Lectura como PROFUNDIDAD DE CETOSIS — jamás "autofagia". */
  label: string;
}

/**
 * Zona de profundidad de cetosis según GKI (tabla Meidenbauer 2015). Es una
 * lectura del estado cetogénico medido, NO una afirmación de autofagia.
 */
export function gkiZone(gki: number): GkiZone {
  if (gki < 1) return { key: 'max', label: 'Cetosis máxima' };
  if (gki < 3) return { key: 'deep', label: 'Cetosis profunda' };
  if (gki < 6) return { key: 'moderate', label: 'Cetosis moderada' };
  return { key: 'glycolytic', label: 'Predominio glucolítico' };
}

export interface MeasuredState {
  gki: number;
  zone: GkiZone;
}

/**
 * Estado metabólico REAL medido a partir de glucosa + cetonas. null si no se
 * puede calcular el GKI (falta dato o cetonas no positivas → cae al estimado).
 */
export function measuredState(
  glucose: number,
  ketones: number,
  glucoseUnit: GlucoseUnit = 'mmol',
): MeasuredState | null {
  const gki = computeGKI(glucose, ketones, glucoseUnit);
  if (gki == null) return null;
  return { gki, zone: gkiZone(gki) };
}

// ═══ E.2 · FLEXIBILIDAD METABÓLICA (la curva a la izquierda) ═══

/** β-hidroxibutirato (mmol/L) desde el cual se considera cetosis nutricional. */
export const KETOSIS_BHB_THRESHOLD = 0.5;
/** Ayunos con hora de cambio medida que se necesitan para leer una tendencia. */
export const MIN_FASTS_FOR_TREND = 3;
/** Cambio mínimo (horas) para llamarlo tendencia y no ruido. */
export const MIN_TREND_DELTA_HOURS = 0.5;

/** Un ayuno con la hora a la que cambió de combustible (cetosis medida). */
export interface FastSwitch {
  /** ISO — para ordenar por recencia. */
  date: string;
  /** Horas de ayuno a las que β-hidroxibutirato cruzó el umbral (o el GKI bajó). */
  switchHours: number;
}

export type TrendDirection = 'faster' | 'slower' | 'flat';

export interface FlexibilityTrend {
  status: 'ok' | 'insufficient';
  /** Ayunos medidos que faltan para poder leer la tendencia (C.2 · vacío que informa). */
  needMore: number;
  /** Promedio de hora de cambio en la mitad reciente. */
  recentAvg: number | null;
  /** Promedio en la mitad anterior. */
  olderAvg: number | null;
  /** olderAvg − recentAvg: positivo = cambias ANTES ahora (curva a la izquierda). */
  deltaHours: number | null;
  direction: TrendDirection | null;
}

const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;

/**
 * Tendencia de flexibilidad metabólica: compara la hora de cambio de combustible
 * reciente contra la anterior. Cambiar ANTES (menos horas) = mejor flexibilidad
 * = la curva se mueve a la izquierda. Requiere un mínimo de ayunos MEDIDOS; si no
 * los hay, dice qué falta en vez de inventar una tendencia.
 */
export function computeFlexibilityTrend(fasts: FastSwitch[]): FlexibilityTrend {
  const measured = fasts
    .filter((f) => Number.isFinite(f.switchHours) && f.switchHours > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); // asc por fecha

  if (measured.length < MIN_FASTS_FOR_TREND) {
    return {
      status: 'insufficient',
      needMore: MIN_FASTS_FOR_TREND - measured.length,
      recentAvg: null, olderAvg: null, deltaHours: null, direction: null,
    };
  }

  // Mitad anterior vs mitad reciente (la reciente se lleva el sobrante impar).
  const mid = Math.floor(measured.length / 2);
  const older = measured.slice(0, mid).map((f) => f.switchHours);
  const recent = measured.slice(mid).map((f) => f.switchHours);
  const olderAvg = round(avg(older), 2);
  const recentAvg = round(avg(recent), 2);
  const deltaHours = round(olderAvg - recentAvg, 2);

  let direction: TrendDirection = 'flat';
  if (deltaHours >= MIN_TREND_DELTA_HOURS) direction = 'faster'; // cambia antes → mejor
  else if (deltaHours <= -MIN_TREND_DELTA_HOURS) direction = 'slower';

  return { status: 'ok', needMore: 0, recentAvg, olderAvg, deltaHours, direction };
}
