// Coach Engine — Marcador de GAPs (dato faltante)
// Brief §7.1.3 — proporcionalidad crítico vs accesorio.
// System prompt Bloque 9 (prohibición: no inventar valores no medidos).
// TODO (sub-session COACH 4/N): implementar emisión de "GAP — sin medición
// de X" + regla de bloqueo solo cuando el dato faltante es CRÍTICO.

export type GapCriticality = 'critico' | 'accesorio';

export function markGap(_field: string, _criticality: GapCriticality): string {
  // TODO: producir texto "GAP — sin medición de <field>".
  throw new Error('TODO: implement markGap');
}

export function blocksIntervention(_criticality: GapCriticality): boolean {
  // TODO: crítico bloquea la intervención; accesorio solo se anota.
  throw new Error('TODO: implement blocksIntervention');
}
