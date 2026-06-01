// Coach Engine — Etiquetado de Nivel de Evidencia
// Brief §3 — Jerarquía de evidencia (5 niveles).
// System prompt Bloque 3.
// TODO (sub-session COACH 4/N): implementar validación de que las salidas
// clínico-colindantes lleven "[Nivel N]" + lookup contra evidence_catalog.

import type { EvidenceLevel } from './types';

export function hasEvidenceTag(_text: string): boolean {
  // TODO: detectar patrón "[Nivel N]" en el texto del coach.
  throw new Error('TODO: implement hasEvidenceTag');
}

export function extractEvidenceLevel(_text: string): EvidenceLevel | null {
  // TODO: parsear el nivel embebido en el texto.
  throw new Error('TODO: implement extractEvidenceLevel');
}

export function enforceEvidenceTag(_text: string, _level: EvidenceLevel): string {
  // TODO: anteponer "[Nivel N]" cuando falte en una recomendación.
  throw new Error('TODO: implement enforceEvidenceTag');
}
