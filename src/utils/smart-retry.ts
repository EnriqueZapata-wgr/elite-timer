/**
 * Capa 2 — reintento inteligente para el parser de labs (y reutilizable). Puro/testeable:
 * sin imports nativos. Reintenta SOLO errores reintentables (red/timeout + saturación del LLM
 * 529/overloaded/503), nunca errores de contenido/parseo.
 */
export function isRetriableError(err: any): boolean {
  if (err?.name === 'AbortError') return true;
  const msg = String(err?.message ?? err ?? '');
  return /network request failed|networkerror|failed to fetch|timeout|ARGOS_TIMEOUT|aborted|socket hang up|529|overloaded|anthropic_timeout|503/i.test(msg);
}

export interface SmartRetryOpts {
  /** Backoff entre intentos. Su longitud = nº de reintentos. Default [3000, 8000]. */
  delaysMs?: number[];
  /** Callback al reintentar (para logging). */
  onRetry?: (attempt: number, delayMs: number, err: any) => void;
}

export async function withSmartRetry<T>(fn: () => Promise<T>, opts: SmartRetryOpts = {}): Promise<T> {
  const delays = opts.delaysMs ?? [3000, 8000];
  let lastErr: any;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const canRetry = attempt < delays.length && isRetriableError(err);
      if (!canRetry) throw err;
      const delay = delays[attempt];
      opts.onRetry?.(attempt + 1, delay, err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
