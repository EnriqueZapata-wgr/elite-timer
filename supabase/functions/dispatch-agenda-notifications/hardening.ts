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

// ── T2: Dead-letter para tokens rotos ───────────────────────────────────────

/** Código Expo que indica token muerto (app borrada / token expirado). */
export const DEAD_TOKEN_ERROR = 'DeviceNotRegistered';
/** Fails con DeviceNotRegistered antes de auto-invalidar el token. */
export const DEAD_TOKEN_FAILS_TO_INVALIDATE = 3;

export interface PushFailure {
  token: string;
  errorCode: string;
  errorMessage: string | null;
  bucketKey: string | null;
}

interface BatchMessage {
  to: string;
  data?: { bucketKey?: string };
}

/**
 * Cruza los tickets de Expo (mismo orden que el batch enviado) con los
 * mensajes para extraer fallos por token. Tickets 'ok' se ignoran.
 */
export function analyzeExpoTickets(
  tickets: ExpoPushTicket[],
  batch: BatchMessage[],
): PushFailure[] {
  const failures: PushFailure[] = [];
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket?.status !== 'error') continue;
    const message = batch[i];
    if (!message?.to) continue;
    failures.push({
      token: message.to,
      errorCode: ticket.details?.error ?? 'Unknown',
      errorMessage: ticket.message ?? null,
      bucketKey: message.data?.bucketKey ?? null,
    });
  }
  return failures;
}

/**
 * Tokens con ≥ threshold fallos DeviceNotRegistered acumulados → invalidar.
 * Recibe el conteo histórico (query a push_failure_log) ya agregado.
 */
export function tokensToInvalidate(
  deadFailCountByToken: Record<string, number>,
  threshold: number = DEAD_TOKEN_FAILS_TO_INVALIDATE,
): string[] {
  return Object.entries(deadFailCountByToken)
    .filter(([, count]) => count >= threshold)
    .map(([token]) => token);
}

// ── T3: Observability estructurada ──────────────────────────────────────────

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  component: string;
  level: LogLevel;
  event: string;
  [key: string]: unknown;
}

/** Entry parseable para Supabase Logs. Pura (testeable); structuredLog la imprime. */
export function buildLogEntry(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): LogEntry {
  return { component: 'dispatch-agenda-notifications', level, event, ...fields };
}

export function structuredLog(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify(buildLogEntry(level, event, fields)));
}

// ── T4: Circuit breaker suave ───────────────────────────────────────────────

export const CIRCUIT_BREAKER_FAIL_THRESHOLD = 0.5;

/**
 * true si MÁS del threshold de los batches falló con error de red
 * (expo.host caído / red rota). 50% exacto NO dispara; 0 batches nunca.
 */
export function circuitBreakerTripped(
  totalBatches: number,
  networkFailedBatches: number,
  threshold: number = CIRCUIT_BREAKER_FAIL_THRESHOLD,
): boolean {
  if (totalBatches <= 0) return false;
  return networkFailedBatches / totalBatches > threshold;
}
