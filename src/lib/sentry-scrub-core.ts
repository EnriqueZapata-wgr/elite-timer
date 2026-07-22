/**
 * Scrubbing de PII para Sentry (C9-003) — lógica PURA, sin deps de Sentry.
 *
 * Política: a Sentry NUNCA viajan datos de salud, labs, ciclo, mensajes de
 * ARGOS/journal, ni email/nombre del usuario. Se redacta por NOMBRE de campo
 * (lista amplia, sesgada a redactar de más) + emails embebidos en strings +
 * query strings de URLs (PostgREST puede llevar filtros con valores).
 *
 * Se aplica en beforeSend sobre user, extra, contexts, tags y breadcrumbs.
 */

export const REDACTED = '[Filtrado]';

/** Campos cuyo VALOR nunca debe salir (matching por substring, case-insensitive). */
const SENSITIVE_KEY_PATTERN =
  /email|e-mail|nombre|full_name|first_name|last_name|username|phone|telefono|password|secret|token|auth|cookie|session|lab|glucos|cycle|ciclo|embarazo|pregnan|menstru|peso|weight|altura|height|sintoma|symptom|nacimiento|birth|dob|address|direccion|message|content|prompt|note|journal|checkin|emotion|salud|health|biomarc|supplement|suplemento|voice|voz/i;

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+/g;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Redacta emails embebidos y corta query strings de URLs. */
export function scrubString(value: string): string {
  let out = value.replace(EMAIL_PATTERN, REDACTED);
  // URLs con query string: los filtros PostgREST pueden llevar valores.
  const qIndex = out.indexOf('?');
  if (/^https?:\/\//.test(out) && qIndex > -1) out = out.slice(0, qIndex);
  return out;
}

/**
 * Recorre objetos/arrays redactando valores de llaves sensibles.
 * Profundidad acotada para no recorrer estructuras patológicas.
 */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Forma mínima del evento que necesitamos (evita acoplar a tipos de Sentry). */
interface SentryEventLike {
  user?: Record<string, unknown>;
  request?: unknown;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: {
    message?: string;
    data?: Record<string, unknown>;
    [k: string]: unknown;
  }[];
  [k: string]: unknown;
}

/**
 * Scrub principal para beforeSend. Muta una COPIA superficial del evento:
 * - user → solo queda id (nunca email/nombre/IP).
 * - request → se elimina completo (headers/cookies/body).
 * - extra/contexts/tags → redacción recursiva por llave sensible.
 * - breadcrumbs → misma redacción en data + emails/query strings en message.
 *
 * Genérico laxo a propósito: los tipos de @sentry (ErrorEvent/Breadcrumb) no
 * tienen index signature y no satisfacen SentryEventLike estructuralmente.
 */
export function scrubSentryEvent<T>(event: T): T {
  if (!event) return event;
  const out: SentryEventLike = { ...(event as SentryEventLike) };

  if (out.user) {
    out.user = out.user.id != null ? { id: out.user.id } : {};
  }
  delete out.request;

  if (out.extra) out.extra = scrubValue(out.extra) as Record<string, unknown>;
  if (out.contexts) out.contexts = scrubValue(out.contexts) as Record<string, unknown>;
  if (out.tags) out.tags = scrubValue(out.tags) as Record<string, unknown>;

  if (Array.isArray(out.breadcrumbs)) {
    out.breadcrumbs = out.breadcrumbs.map((b) => ({
      ...b,
      ...(typeof b.message === 'string' ? { message: scrubString(b.message) } : {}),
      ...(b.data ? { data: scrubValue(b.data) as Record<string, unknown> } : {}),
    }));
  }

  return out as T;
}
