/**
 * Modelo PURO de la gráfica de continuum de un parámetro de lab (#4). Toma la serie temporal
 * (de `getParameterSeries`, ya ordenada asc por fecha) + los `bandLimits` de la matriz V8 y
 * produce las coordenadas normalizadas 0-1, la banda funcional ATP de fondo y el estado de
 * cada punto. El componente SVG solo dibuja; toda la matemática se testea aquí.
 */
import { score9Bands } from '@/src/services/edad-atp/sf-9band-service';

export type SeriePoint = { value: number; measured_at: string; source: string };

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
};

export type ChartModel = {
  points: ChartPoint[];
  yMin: number;
  yMax: number;
  /** Banda funcional ATP normalizada 0-1 (lo/hi), o null si el parámetro no la define. */
  band: { lo: number; hi: number; loNorm: number; hiNorm: number } | null;
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
 * Construye el modelo de la gráfica. `bandLimits` = los 8 límites del MatrizParam (o null si
 * el parámetro no está en la matriz → sin banda ni estado por banda). `todayISO` se inyecta
 * para marcar puntos `is_stale` (>365d) de forma testeable.
 */
export function buildChartModel(
  series: SeriePoint[],
  bandLimits: (number | null)[] | null,
  todayISO: string,
): ChartModel {
  const clean = series.filter((p) => Number.isFinite(p.value));
  if (clean.length === 0) {
    return { points: [], yMin: 0, yMax: 1, band: null, empty: true };
  }

  const band = bandLimits
    ? (() => {
        const lo = bandLimits[3];
        const hi = bandLimits[4];
        return lo != null && hi != null ? { lo, hi } : null;
      })()
    : null;

  // Rango Y: incluir los valores y la banda funcional, con 8% de margen.
  let lo = Math.min(...clean.map((p) => p.value));
  let hi = Math.max(...clean.map((p) => p.value));
  if (band) { lo = Math.min(lo, band.lo); hi = Math.max(hi, band.hi); }
  if (lo === hi) { lo -= 1; hi += 1; } // serie de un solo valor plano
  const pad = (hi - lo) * 0.08;
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
  }));

  return {
    points,
    yMin,
    yMax,
    band: band ? { ...band, loNorm: norm(band.lo), hiNorm: norm(band.hi) } : null,
    empty: false,
  };
}
