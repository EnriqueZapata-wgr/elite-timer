/**
 * Capa 3 — planificación de chunks para PDFs grandes. PURO/testeable (la división real de
 * bytes con pdf-lib vive en el worker Deno `lab-parser-worker`, vía esm.sh — pdf-lib NO está
 * en deps del cliente y agregarlo no aporta: el worker es quien splitea).
 */
export interface ChunkPlan {
  index: number;
  startPage: number; // 1-based, inclusivo
  endPage: number;   // 1-based, inclusivo
}

/** ¿Conviene splitear? PDFs de más de `threshold` páginas (default 5). */
export function shouldSplit(pageCount: number, threshold = 5): boolean {
  return Number.isFinite(pageCount) && pageCount > threshold;
}

/**
 * Calcula los rangos de páginas para cada chunk. Ej: 10 páginas / 3 → [1-3][4-6][7-9][10-10].
 * Devuelve [] si pageCount inválido. Para PDFs ≤ pagesPerChunk devuelve 1 chunk con todo.
 */
export function planChunks(pageCount: number, pagesPerChunk = 3): ChunkPlan[] {
  if (!Number.isFinite(pageCount) || pageCount < 1) return [];
  const per = Math.max(1, Math.floor(pagesPerChunk));
  const out: ChunkPlan[] = [];
  let index = 0;
  for (let start = 1; start <= pageCount; start += per) {
    const end = Math.min(start + per - 1, pageCount);
    out.push({ index: index++, startPage: start, endPage: end });
  }
  return out;
}
