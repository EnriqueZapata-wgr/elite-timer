// Coach Engine — Detector de Frenos
// Brief §5 — clasifica frenos en el input del cliente + jerarquía dominante.
// System prompt Bloque 5 (Modelo Acelerador/Freno).
// TODO (sub-session COACH 5/N): implementar clasificación de frenos +
// selección del dominante + persistencia a frenos_log.

import type { BrakeType } from './types';

export interface DetectedBrake {
  type: BrakeType;
  isDominant: boolean;
  evidenceText: string;
}

export function detectBrakes(_clientInput: string): DetectedBrake[] {
  // TODO: clasificar no_saber / miedo / energia_biologica / apatia.
  throw new Error('TODO: implement detectBrakes');
}

export function selectDominantBrake(_brakes: DetectedBrake[]): DetectedBrake | null {
  // TODO: desbloquear de arriba hacia abajo — devolver el dominante.
  throw new Error('TODO: implement selectDominantBrake');
}
