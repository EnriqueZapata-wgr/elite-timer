// Coach Engine — Motor de Curvas (progreso + límites móviles)
// Brief §6.1 — 3 curvas por nodo, recalibración EWMA, regla "subumbral siempre".
// System prompt Bloque 6 (diferido). node_curves: progress_curve (óptima),
// lower_limit_curve (mínima viable), upper_limit_curve (máxima sostenible).

import { supabase } from '@/src/lib/supabase';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import type { TrafficLight } from './types';

export interface CurvePoint {
  /** Fecha del punto en formato YYYY-MM-DD (eje temporal de la curva). */
  date: string;
  value: number;
}

/** Constantes del módulo (Bloque 6 — no parametrizables en esta versión). */
export const EWMA_ALPHA = 0.3;
export const RECALIBRATION_WINDOW = 7; // días
export const MIN_MAX_OFFSET_PCT = 0.2;

/**
 * Interpola linealmente el valor esperado de una curva para una fecha (pure).
 * Antes del primer punto → primer valor; después del último → último valor.
 */
export function interpolateCurve(points: CurvePoint[], dateStr: string): number {
  if (!points || points.length === 0) {
    throw new Error('curves-engine: interpolateCurve — curva vacía');
  }
  const sorted = [...points].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
  );
  const target = parseLocalDate(dateStr).getTime();

  if (target <= parseLocalDate(sorted[0].date).getTime()) return sorted[0].value;
  const lastPoint = sorted[sorted.length - 1];
  if (target >= parseLocalDate(lastPoint.date).getTime()) return lastPoint.value;

  for (let i = 1; i < sorted.length; i++) {
    const t0 = parseLocalDate(sorted[i - 1].date).getTime();
    const t1 = parseLocalDate(sorted[i].date).getTime();
    if (target >= t0 && target <= t1) {
      if (t1 === t0) return sorted[i].value;
      const ratio = (target - t0) / (t1 - t0);
      return sorted[i - 1].value + ratio * (sorted[i].value - sorted[i - 1].value);
    }
  }
  return lastPoint.value;
}

/** EWMA con α dado, procesando en orden cronológico (pure). Serie vacía → 0. */
export function computeEWMA(values: number[], alpha: number = EWMA_ALPHA): number {
  if (values.length === 0) return 0;
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = alpha * values[i] + (1 - alpha) * ewma;
  }
  return ewma;
}

/**
 * Evalúa una medición contra las 3 curvas del nodo (Bloque 6).
 * Compara el valor medido con la óptima/mínima/máxima interpoladas para la
 * fecha y devuelve semáforo + desviación. `subumbral` = true siempre que el
 * valor quede por debajo de la óptima, aunque sea por margen ínfimo.
 */
export async function evaluateAgainstCurves(
  nodeId: string,
  measurement: number,
  date: string,
): Promise<{ trafficLight: TrafficLight; deviation: number; subumbral: boolean }> {
  const { data, error } = await supabase
    .from('node_curves')
    .select('progress_curve, lower_limit_curve, upper_limit_curve')
    .eq('node_id', nodeId)
    .maybeSingle();

  if (error) {
    throw new Error(`curves-engine: evaluateAgainstCurves failed — ${error.message}`);
  }
  if (!data) {
    throw new Error('curves-engine: evaluateAgainstCurves — nodo sin curvas calibradas');
  }

  const optimal = interpolateCurve((data.progress_curve as CurvePoint[]) ?? [], date);
  const min = interpolateCurve((data.lower_limit_curve as CurvePoint[]) ?? [], date);
  const max = interpolateCurve((data.upper_limit_curve as CurvePoint[]) ?? [], date);

  const subumbral = measurement < optimal;

  if (measurement > max) {
    return { trafficLight: 'rojo', deviation: measurement - max, subumbral: false }; // sobrecarga
  }
  if (measurement >= optimal) {
    return { trafficLight: 'verde', deviation: measurement - optimal, subumbral };
  }
  if (measurement >= min) {
    return { trafficLight: 'amarillo', deviation: optimal - measurement, subumbral };
  }
  return { trafficLight: 'rojo', deviation: min - measurement, subumbral };
}

/**
 * Recalibra las 3 curvas del nodo con EWMA (Bloque 6). Lee las últimas 7
 * mediciones, calcula el promedio EWMA (α=0.3) y desplaza el punto de HOY de la
 * curva óptima a ese valor; mínima y máxima se desplazan ±20%. UPSERT en node_curves.
 */
export async function recalibrateCurvesEWMA(
  nodeId: string,
): Promise<{ optimal: CurvePoint[]; min: CurvePoint[]; max: CurvePoint[] }> {
  const { data: measurements, error: mErr } = await supabase
    .from('node_measurements')
    .select('value, measured_at')
    .eq('node_id', nodeId)
    .order('measured_at', { ascending: false })
    .limit(RECALIBRATION_WINDOW);

  if (mErr) {
    throw new Error(`curves-engine: recalibrateCurvesEWMA measurements failed — ${mErr.message}`);
  }
  if (!measurements || measurements.length === 0) {
    throw new Error('curves-engine: recalibrateCurvesEWMA — nodo sin mediciones');
  }

  // measured_at viene desc; EWMA se calcula en orden cronológico (asc).
  const chronological = [...measurements]
    .reverse()
    .map((m: any) => Number(m.value))
    .filter((v) => !Number.isNaN(v));
  const ewma = computeEWMA(chronological, EWMA_ALPHA);

  // Necesitamos user_id para el UPSERT (RLS + NOT NULL). Lo tomamos del nodo.
  const { data: node, error: nErr } = await supabase
    .from('goal_tree_nodes')
    .select('user_id')
    .eq('id', nodeId)
    .single();
  if (nErr) {
    throw new Error(`curves-engine: recalibrateCurvesEWMA node lookup failed — ${nErr.message}`);
  }
  const userId = (node as { user_id: string }).user_id;

  // Curvas existentes (si las hay) para desplazar el punto de hoy.
  const { data: existing } = await supabase
    .from('node_curves')
    .select('progress_curve, lower_limit_curve, upper_limit_curve')
    .eq('node_id', nodeId)
    .maybeSingle();

  const today = getLocalToday();
  const upsertPoint = (curve: CurvePoint[] | null | undefined, value: number): CurvePoint[] => {
    const base = (curve ?? []).filter((p) => p.date !== today);
    return [...base, { date: today, value }];
  };

  const optimal = upsertPoint(existing?.progress_curve as CurvePoint[] | undefined, ewma);
  const min = upsertPoint(existing?.lower_limit_curve as CurvePoint[] | undefined, ewma * (1 - MIN_MAX_OFFSET_PCT));
  const max = upsertPoint(existing?.upper_limit_curve as CurvePoint[] | undefined, ewma * (1 + MIN_MAX_OFFSET_PCT));

  const { error: upErr } = await supabase.from('node_curves').upsert(
    {
      node_id: nodeId,
      user_id: userId,
      progress_curve: optimal,
      lower_limit_curve: min,
      upper_limit_curve: max,
      last_recalibrated_at: new Date().toISOString(),
    },
    { onConflict: 'node_id' },
  );
  if (upErr) {
    throw new Error(`curves-engine: recalibrateCurvesEWMA upsert failed — ${upErr.message}`);
  }

  return { optimal, min, max };
}

// TEST: computeEWMA([10,10,10,10,10,10,10], 0.3) ≈ 10 (converge)
// TEST: computeEWMA([], 0.3) === 0
// TEST: interpolateCurve([{date:'2026-06-01',value:10},{date:'2026-06-11',value:20}], '2026-06-06') === 15
// TEST: interpolateCurve([{date:'2026-06-01',value:10}], '2026-05-01') === 10 (antes del primero)
// INTEGRATION TEST: evaluateAgainstCurves(nodeId, optimalValue, date) → verde, deviation 0, subumbral false
// INTEGRATION TEST: evaluateAgainstCurves(nodeId, belowMin, date) → rojo, subumbral true
// INTEGRATION TEST: recalibrateCurvesEWMA(nodeId) hace UPSERT con punto de hoy desplazado
