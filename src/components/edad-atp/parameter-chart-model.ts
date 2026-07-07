/**
 * Modelo PURO de la gráfica de continuum de un parámetro de lab (#4). Toma la serie temporal
 * (de `getParameterSeries`, ya ordenada asc por fecha) + los `bandLimits` de la matriz V8 y
 * produce las coordenadas normalizadas 0-1, la banda funcional ATP de fondo y el estado de
 * cada punto. El componente SVG solo dibuja; toda la matemática se testea aquí.
 *
 * F4 sprint UX blockers V1.3:
 *  - Forward-fill: un punto sin medición (`value: null`) conserva el último valor conocido
 *    (`carried: true`) en vez de colapsar/caer — la línea nunca baja a 0 por dato faltante.
 *  - Banda amplia (bandLimits[1]/[6]) además de la funcional ([3]/[4]) para el toggle
 *    "solo funcional" vs "todos los rangos".
 *  - Tendencia e interpretación 1-línea (helpers puros para las cards).
 */
import { score9Bands } from '@/src/services/edad-atp/sf-9band-service';

export type SeriePoint = { value: number | null; measured_at: string; source: string };

export type ChartPoint = {
  value: number;
  measured_at: string;
  source: string;
  /** Posición horizontal 0-1 (por índice; espaciado uniforme, robusto a fechas dispersas). */
  x: number;
  /** Posición vertical 0-1 (0 = yMin abajo, 1 = yMax arriba). */
  y: number;
  status: 'optimo' | 'aceptable' | 'atencion';
  is_stale: boolean;
  /** true = sin medición esa fecha; valor forward-filled del último conocido. */
  carried: boolean;
};

export type ChartBand = { lo: number; hi: number; loNorm: number; hiNorm: number };

export type ChartModel = {
  points: ChartPoint[];
  yMin: number;
  yMax: number;
  /** Banda funcional ATP normalizada 0-1 (lo/hi), o null si el parámetro no la define. */
  band: ChartBand | null;
  /** Banda amplia (aceptable, bandLimits[1]/[6]) para "todos los rangos"; null si no existe. */
  outerBand: ChartBand | null;
  empty: boolean;
};

const STALE_DAYS = 365;

function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + 'T00:00:00');
  const b = Date.parse(bISO + 'T00:00:00');
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((a - b) / 86_400_000);
}

function statusFromScore(score: number | null): ChartPoint['status'] {
  if (score == null) return 'aceptable';
  if (score >= 80) return 'optimo';
  if (score >= 50) return 'aceptable';
  return 'atencion';
}

/**
 * Forward-fill puro: valores null/no-finitos toman el último valor conocido (carried).
 * Los null ANTES de la primera medición real se descartan (no hay qué acarrear).
 */
export function forwardFillSeries(
  series: SeriePoint[],
): { value: number; measured_at: string; source: string; carried: boolean }[] {
  const out: { value: number; measured_at: string; source: string; carried: boolean }[] = [];
  let last: number | null = null;
  for (const p of series) {
    if (p.value != null && Number.isFinite(p.value)) {
      last = p.value;
      out.push({ value: p.value, measured_at: p.measured_at, source: p.source, carried: false });
    } else if (last != null) {
      out.push({ value: last, measured_at: p.measured_at, source: p.source, carried: true });
    }
    // null sin valor previo → se descarta
  }
  return out;
}

function bandFrom(bandLimits: (number | null)[] | null, loIdx: number, hiIdx: number): { lo: number; hi: number } | null {
  if (!bandLimits) return null;
  const lo = bandLimits[loIdx];
  const hi = bandLimits[hiIdx];
  return lo != null && hi != null ? { lo, hi } : null;
}

/**
 * Construye el modelo de la gráfica. `bandLimits` = los 8 límites del MatrizParam (o null si
 * el parámetro no está en la matriz → sin banda ni estado por banda). `todayISO` se inyecta
 * para marcar puntos `is_stale` (>365d) de forma testeable. `includeOuter` extiende el rango
 * Y para que la banda amplia quepa (toggle "todos los rangos").
 */
export function buildChartModel(
  series: SeriePoint[],
  bandLimits: (number | null)[] | null,
  todayISO: string,
  includeOuter = false,
): ChartModel {
  const clean = forwardFillSeries(series);
  if (clean.length === 0) {
    return { points: [], yMin: 0, yMax: 1, band: null, outerBand: null, empty: true };
  }

  const band = bandFrom(bandLimits, 3, 4);
  const outer = bandFrom(bandLimits, 1, 6);

  // Rango Y: incluir los valores y la(s) banda(s), con 10% de margen (los puntos r=4 respiran).
  let lo = Math.min(...clean.map((p) => p.value));
  let hi = Math.max(...clean.map((p) => p.value));
  if (band) { lo = Math.min(lo, band.lo); hi = Math.max(hi, band.hi); }
  if (includeOuter && outer) { lo = Math.min(lo, outer.lo); hi = Math.max(hi, outer.hi); }
  if (lo === hi) { lo -= 1; hi += 1; } // serie de un solo valor plano
  const pad = (hi - lo) * 0.1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const span = yMax - yMin;
  const norm = (v: number) => (v - yMin) / span;

  const n = clean.length;
  const points: ChartPoint[] = clean.map((p, i) => ({
    value: p.value,
    measured_at: p.measured_at,
    source: p.source,
    x: n === 1 ? 0.5 : i / (n - 1),
    y: norm(p.value),
    status: statusFromScore(bandLimits ? score9Bands(p.value, bandLimits) : null),
    is_stale: daysBetween(todayISO, p.measured_at) > STALE_DAYS,
    carried: p.carried,
  }));

  return {
    points,
    yMin,
    yMax,
    band: band ? { ...band, loNorm: norm(band.lo), hiNorm: norm(band.hi) } : null,
    outerBand: outer ? { ...outer, loNorm: norm(outer.lo), hiNorm: norm(outer.hi) } : null,
    empty: false,
  };
}

// ═══ Helpers puros para las cards de labs (F4.1) ═══

export type Trend = 'up' | 'down' | 'flat';

/**
 * Tendencia de las últimas mediciones REALES (ignora carried/null): compara el último
 * valor contra el promedio de los 2 anteriores. Umbral 2% para no marcar ruido.
 * null si hay menos de 2 mediciones.
 */
export function trendFromSeries(series: SeriePoint[]): Trend | null {
  const real = series.filter((p) => p.value != null && Number.isFinite(p.value)) as { value: number }[];
  if (real.length < 2) return null;
  const lastValue = real[real.length - 1].value;
  const prev = real.slice(-3, -1); // 1 o 2 anteriores
  const prevAvg = prev.reduce((a, p) => a + p.value, 0) / prev.length;
  if (prevAvg === 0) return lastValue === 0 ? 'flat' : lastValue > 0 ? 'up' : 'down';
  const delta = (lastValue - prevAvg) / Math.abs(prevAvg);
  if (delta > 0.02) return 'up';
  if (delta < -0.02) return 'down';
  return 'flat';
}

/**
 * Interpretación funcional en 1 línea (determinística, sin IA): posición del valor
 * respecto a la banda funcional ATP. null si el parámetro no tiene banda.
 */
export function interpretValue(value: number, bandLimits: (number | null)[] | null): string | null {
  if (!bandLimits) return null;
  const band = bandFrom(bandLimits, 3, 4);
  if (!band) return null;
  const score = score9Bands(value, bandLimits);
  if (score == null) return null;
  if (score >= 80) return 'En rango funcional óptimo.';
  const side = value < band.lo ? 'por debajo' : value > band.hi ? 'por arriba' : 'en el límite';
  if (score >= 50) return `Aceptable, pero ${side} del óptimo funcional.`;
  return `Fuera de rango funcional (${side}) — priorízalo con tu protocolo.`;
}
