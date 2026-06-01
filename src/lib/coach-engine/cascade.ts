// Coach Engine — Cascada de Intervención (5 niveles)
// Brief §6.3 — escalar EN ORDEN, sin saltar niveles salvo emergencia.
// System prompt Bloque 7.
// TODO (sub-session COACH 5/N): implementar selectCascadeLevel a partir del
// semáforo (Q2) + recurrencia de la señal.

import type { CascadeLevel, TrafficLight } from './types';

export function selectCascadeLevel(_trafficLight: TrafficLight, _signalRecurs: boolean): CascadeLevel {
  // TODO: nivel 1 siempre; 2-5 según afectación y recurrencia.
  throw new Error('TODO: implement selectCascadeLevel');
}
