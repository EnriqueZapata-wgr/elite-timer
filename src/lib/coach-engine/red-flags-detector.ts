// Coach Engine — Detector de Banderas Rojas
// Brief §8 — categoriza + persiste red_flag_events con flag_index + ciclo de vida.
// System prompt Bloque 11.
// TODO (sub-session COACH 6/N): implementar categorización + acumulación de
// flag_index + transición de lifecycle_phase (active → en_seguimiento → silente).

import type { RedFlagCategory, RedFlagLifecyclePhase } from './types';

export interface DetectedRedFlag {
  category: RedFlagCategory;
  severity: 'emergencia' | 'alta' | 'media' | 'baja';
  evidenceText: string;
}

export function detectRedFlags(_clientInput: string): DetectedRedFlag[] {
  // TODO: categorizar banderas rojas clínico-colindantes.
  throw new Error('TODO: implement detectRedFlags');
}

export async function persistRedFlag(_userId: string, _flag: DetectedRedFlag): Promise<void> {
  // TODO: insertar/actualizar red_flag_events + acumular flag_index si recurre.
  throw new Error('TODO: implement persistRedFlag');
}

export function nextLifecyclePhase(_current: RedFlagLifecyclePhase, _daysSince: number, _resolved: boolean): RedFlagLifecyclePhase {
  // TODO: regla de transición active/en_seguimiento/silente.
  throw new Error('TODO: implement nextLifecyclePhase');
}
