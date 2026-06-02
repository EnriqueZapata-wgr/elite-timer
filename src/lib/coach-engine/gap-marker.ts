// Coach Engine — Marcador de GAPs (dato faltante)
// Brief §7.1.3 — proporcionalidad crítico vs accesorio.
// System prompt Bloque 9: "Donde no hay dato, hay GAP. No fabriquemos."
// GAPs en datos CRÍTICOS bloquean la intervención; en datos ACCESORIOS solo
// se anotan (no freezar la conversación — atendemos humanos, no LLMs).

export type GapCriticality = 'critico' | 'accesorio';

export interface GapResult {
  field: string;
  criticality: GapCriticality;
  marker: string;
}

/**
 * Produce el texto canónico de GAP para un dato faltante.
 * Bloque 9: marca explícita "GAP — sin medición de <field> [CRÍTICO|ACCESORIO]".
 */
export function markGap(field: string, criticality: GapCriticality): string {
  const tag = criticality === 'critico' ? '[CRÍTICO]' : '[ACCESORIO]';
  return `GAP — sin medición de ${field} ${tag}`;
}

/**
 * Decide si un dato faltante bloquea la intervención.
 * Bloque 9: solo los GAPs CRÍTICOS (alergias, diagnósticos, medicación,
 * banderas rojas) bloquean; los accesorios se anotan sin frenar.
 */
export function blocksIntervention(criticality: GapCriticality): boolean {
  return criticality === 'critico';
}

/**
 * Recorre los campos requeridos y devuelve un GapResult por cada dato ausente
 * en el contexto. Implementa la detección de GAPs del Bloque 9 con la
 * proporcionalidad crítico/accesorio del §7.1.3.
 */
export function detectMissingCriticalData(
  context: Record<string, any>,
  requiredFields: { field: string; criticality: GapCriticality }[],
): GapResult[] {
  const isMissing = (value: unknown): boolean =>
    value === undefined || value === null || value === '';

  return requiredFields
    .filter(({ field }) => isMissing(context[field]))
    .map(({ field, criticality }) => ({
      field,
      criticality,
      marker: markGap(field, criticality),
    }));
}

// TEST: markGap('glucosa', 'critico') incluye '[CRÍTICO]'
// TEST: markGap('peso', 'accesorio') incluye '[ACCESORIO]'
// TEST: blocksIntervention('critico') === true
// TEST: blocksIntervention('accesorio') === false
// TEST: detectMissingCriticalData({ peso: 78 }, [{ field: 'peso', criticality: 'critico' }, { field: 'glucosa', criticality: 'critico' }]) → 1 entrada (glucosa)
// TEST: detectMissingCriticalData({ glucosa: 95 }, [{ field: 'glucosa', criticality: 'critico' }]) → [] (presente)
