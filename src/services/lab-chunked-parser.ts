/**
 * Capa 3 — merge de resultados de chunks paralelos. PURO/testeable. La misma doctrina se
 * replica en el worker Deno (los edge functions no pueden importar src/), documentado en REPORT.
 *
 * Doctrina merge:
 *  - mismo biomarker en 2 chunks → 1ª ocurrencia gana (la página 1 suele traer totales),
 *  - excepto si la 1ª NO pasó validación y la nueva SÍ → gana la válida,
 *  - errores parciales OK: con que ≥1 chunk responda hay resultado,
 *  - si TODOS fallan → el caller marca failed.
 */
export interface ChunkValue {
  value: number;
  unit?: string;
  passedValidation?: boolean;
  [k: string]: any;
}

export interface ChunkResult {
  values?: Record<string, ChunkValue>;
  other_values?: any[];
  lab_name?: string | null;
  lab_date?: string | null;
}

export type SettledChunk =
  | { status: 'fulfilled'; value: ChunkResult }
  | { status: 'rejected'; reason: any };

export interface MergedResult {
  values: Record<string, ChunkValue & { chunkIndex: number }>;
  other_values: any[];
  lab_name: string | null;
  lab_date: string | null;
  errors: Array<{ chunkIndex: number; reason: string }>;
  successCount: number;
  totalChunks: number;
}

export function mergeChunkResults(settled: SettledChunk[]): MergedResult {
  const values: Record<string, ChunkValue & { chunkIndex: number }> = {};
  const otherValues: any[] = [];
  const errors: Array<{ chunkIndex: number; reason: string }> = [];
  let labName: string | null = null;
  let labDate: string | null = null;
  let successCount = 0;

  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      errors.push({ chunkIndex: i, reason: String(r.reason?.message ?? r.reason) });
      return;
    }
    successCount++;
    const data = r.value ?? {};
    if (data.lab_name && !labName) labName = data.lab_name;
    if (data.lab_date && !labDate) labDate = data.lab_date;
    if (Array.isArray(data.other_values)) otherValues.push(...data.other_values);

    for (const [key, v] of Object.entries(data.values ?? {})) {
      if (!v || typeof (v as ChunkValue).value !== 'number') continue;
      const incoming = { ...(v as ChunkValue), chunkIndex: i };
      const existing = values[key];
      if (!existing) {
        values[key] = incoming;
      } else if (incoming.passedValidation && !existing.passedValidation) {
        // La nueva es válida y la previa no → gana la válida.
        values[key] = incoming;
      }
      // resto de casos: gana la 1ª ocurrencia (no se sobrescribe).
    }
  });

  return {
    values, other_values: otherValues, lab_name: labName, lab_date: labDate,
    errors, successCount, totalChunks: settled.length,
  };
}
