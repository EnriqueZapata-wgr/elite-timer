// hardening.ts — helpers PUROS del hardening v7 (Sprint #50).
//
// Sin imports: este módulo corre en Deno (index.ts lo importa con .ts) y en
// node (vitest lo testea desde __tests__/hardening.test.ts). Toda la lógica
// de decisión vive aquí; index.ts solo orquesta.

// ── T1: Retries con exponential backoff ─────────────────────────────────────

export interface RetryConfig {
  maxAttempts: number;
  /** delays entre intentos: delaysMs[0] antes del 2º intento, etc. */
  delaysMs: number[];
}

export const DEFAULT_RETRY: RetryConfig = { maxAttempts: 3, delaysMs: [500, 2000, 5000] };

/** Solo red / 5xx / 429 se reintentan. 4xx restantes = payload malo, no insistir. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface PushSendResult {
  ok: boolean;
  /** intentos consumidos (1-based) */
  attempts: number;
  /** último status HTTP visto (null si todo fue error de red) */
  status: number | null;
  /** tickets parseados del body (vacío si nunca hubo 2xx) */
  tickets: ExpoPushTicket[];
  /** true si el fallo final fue de red (para el circuit breaker) */
  networkError: boolean;
}

type FetchLike = (body: string) => Promise<{ status: number; json: () => Promise<unknown> }>;
type SleepLike = (ms: number) => Promise<void>;

const realSleep: SleepLike = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Envía un batch a Expo Push con hasta maxAttempts intentos.
 * fetchFn/sleepFn inyectables para tests (sin red ni timers reales).
 */
export async function sendPushBatchWithRetry(
  batch: unknown[],
  fetchFn: FetchLike,
  config: RetryConfig = DEFAULT_RETRY,
  sleepFn: SleepLike = realSleep,
): Promise<PushSendResult> {
  const body = JSON.stringify(batch);
  let lastStatus: number | null = null;
  let networkError = false;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const res = await fetchFn(body);
      lastStatus = res.status;
      networkError = false;
      if (res.status >= 200 && res.status < 300) {
        let tickets: ExpoPushTicket[] = [];
        try {
          const parsed = (await res.json()) as { data?: ExpoPushTicket[] };
          tickets = Array.isArray(parsed?.data) ? parsed.data : [];
        } catch { /* body raro — éxito HTTP igual cuenta */ }
        return { ok: true, attempts: attempt, status: res.status, tickets, networkError: false };
      }
      if (!isRetryableStatus(res.status)) {
        // 4xx (≠429): error del payload, reintentar no ayuda
        return { ok: false, attempts: attempt, status: res.status, tickets: [], networkError: false };
      }
    } catch {
      networkError = true;
    }
    if (attempt < config.maxAttempts) {
      await sleepFn(config.delaysMs[attempt - 1] ?? config.delaysMs[config.delaysMs.length - 1] ?? 0);
    }
  }
  return { ok: false, attempts: config.maxAttempts, status: lastStatus, tickets: [], networkError };
}
