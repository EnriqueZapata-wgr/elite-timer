/**
 * voice-chunker-core — el cerebro del "<2s primer audio" (MB-4 J5). Núcleo PURO.
 *
 * El token-stream de Claude no se espera completo: en cuanto se cierra la primera
 * frase/cláusula, se dispara TTS de ESE chunk. Este core decide DÓNDE cortar el
 * texto que va llegando en fragmentos, sin perder ni duplicar caracteres.
 *
 * Estrategia: acumula tokens; emite un chunk cuando encuentra un límite de frase
 * (. ! ? … : ; o salto de línea) siempre que el chunk tenga longitud mínima
 * (evita cortar "Dr." o "3.5"). El primer chunk usa un umbral MÁS BAJO para que
 * el primer audio salga rapidísimo. `flush()` emite lo que quede al terminar.
 */

/** Longitud mínima de un chunk normal antes de cortar en un límite de frase. */
export const MIN_CHUNK_CHARS = 16;
/** Umbral del PRIMER chunk (más bajo → primer audio más rápido). */
export const FIRST_CHUNK_CHARS = 10;

/** Caracteres que cierran una frase/cláusula susceptible de corte. */
const BOUNDARY = /[.!?…:;\n]/;

export class SentenceChunker {
  private buf = '';
  private emitted = 0;

  /**
   * Alimenta un fragmento del token-stream. Devuelve los chunks LISTOS para TTS
   * (0, 1 o varios). Lo no cerrado queda en el buffer.
   */
  push(fragment: string): string[] {
    if (!fragment) return [];
    this.buf += fragment;
    const out: string[] = [];

    let cut = this.findCut();
    while (cut > 0) {
      const chunk = this.buf.slice(0, cut).trim();
      if (chunk) { out.push(chunk); this.emitted++; }
      this.buf = this.buf.slice(cut).replace(/^\s+/, '');
      cut = this.findCut();
    }
    return out;
  }

  /** Emite lo que quede en el buffer (fin del stream). */
  flush(): string[] {
    const rest = this.buf.trim();
    this.buf = '';
    if (!rest) return [];
    this.emitted++;
    return [rest];
  }

  /** Posición de corte (índice tras el límite), o 0 si aún no conviene cortar. */
  private findCut(): number {
    const minLen = this.emitted === 0 ? FIRST_CHUNK_CHARS : MIN_CHUNK_CHARS;
    for (let i = 0; i < this.buf.length; i++) {
      if (BOUNDARY.test(this.buf[i])) {
        const end = i + 1;
        // No cortar decimales ("3.5") ni abreviaturas de 1 letra ("Dr.") — exige
        // que lo acumulado alcance el mínimo y que el siguiente char no sea dígito.
        const next = this.buf[end];
        const longEnough = this.buf.slice(0, end).trim().length >= minLen;
        const isDecimal = this.buf[i] === '.' && /\d/.test(this.buf[i - 1] ?? '') && /\d/.test(next ?? '');
        if (longEnough && !isDecimal) return end;
      }
    }
    return 0;
  }
}
