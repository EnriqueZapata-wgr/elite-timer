// Coach Engine — Motor de Curvas (progreso + límites móviles)
// Brief §6.1 — 3 curvas por nodo, recalibración EWMA, regla "subumbral siempre".
// System prompt Bloque 6 (diferido).
// TODO (sub-session COACH 5/N): implementar evaluateAgainstCurves +
// recalibración EWMA sobre node_curves + node_measurements.

import type { TrafficLight } from './types';

export interface CurvePoint {
  t: number;
  value: number;
}

export function evaluateAgainstCurves(_nodeId: string, _measurement: number): TrafficLight {
  // TODO: comparar medición contra progress/lower/upper y devolver semáforo.
  throw new Error('TODO: implement evaluateAgainstCurves');
}

export function recalibrateCurvesEWMA(_nodeId: string, _newMeasurements: CurvePoint[]): Promise<void> {
  // TODO: recalibrar curvas con EWMA respetando "subumbral siempre".
  throw new Error('TODO: implement recalibrateCurvesEWMA');
}
