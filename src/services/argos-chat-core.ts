/**
 * ARGOS Chat — lógica pura del turno (MB-21 Pieza 4.1).
 *
 * La pantalla de chat eran 800 líneas con la resolución del turno inline y
 * cero tests. Aquí vive lo que decide QUÉ queda en la conversación después de
 * cada envío: el filtrado de turnos degradados (ARG-1/ARG-2/ARG-8), la
 * resolución por tipo de desenlace (stream, respuesta, rate limit, error de
 * cliente) y los separadores de tiempo. Sin RN, sin supabase — node puro.
 */
import type { ArgosMessage } from './argos-service';
import { ArgosRateLimitError } from './argos-stream-core';
import type { RateLimitInfo } from './argos-rate-limit-core';

/** F2.3: gap mínimo entre mensajes para pintar separador temporal. */
export const TIMESTAMP_GAP_MS = 5 * 60 * 1000;

/** Copy aprobado por Mariana (doc 06, errores ARGOS >> "se cayó la red"). */
export const CLIENT_ERROR_COPY = 'Se me fue la señal. Reintenta en unos minutos.';

/**
 * ARG-1/ARG-8: lo que viaja al LLM. Un turno degradado (rate-limited, ambos
 * providers caídos, error de cliente) NO vuelve a entrar al contexto del
 * modelo — esos textos contaminan (auto-refuerzan errores).
 */
export function filterForLLM(messages: ArgosMessage[]): ArgosMessage[] {
  return messages.filter((m) => !m.degraded);
}

/** ARG-2: lo que se persiste. Mismo criterio: degradados fuera. */
export function filterForSave(messages: ArgosMessage[]): ArgosMessage[] {
  return messages.filter((m) => !m.degraded);
}

/**
 * #71: guard de re-entrada del envío — un solo turno en vuelo por pantalla.
 * Síncrono a propósito: atrapa el doble-tap/re-render ANTES del primer await,
 * cuando `loading` (state, async) todavía no actualizó. Primera línea de
 * defensa del doble cobro H+ (el server además es idempotente).
 */
export interface SendGuard {
  /** true = turno adquirido; false = ya hay uno en vuelo, no enviar. */
  tryAcquire: () => boolean;
  release: () => void;
}

export function createSendGuard(): SendGuard {
  let sending = false;
  return {
    tryAcquire: () => {
      if (sending) return false;
      sending = true;
      return true;
    },
    release: () => { sending = false; },
  };
}

/** El desenlace de un turno, visto desde la pantalla. */
export type TurnOutcome =
  /** El stream completó (texto ya visible): turno limpio. */
  | { kind: 'streamed'; text: string }
  /** Respuesta no-stream: degraded refleja _degraded/_rate_limited del proxy. */
  | { kind: 'reply'; text: string; degraded: boolean }
  /** Rate limit: el turno del usuario queda visible pero degradado; la
   *  RateLimitCard (boost H+) reemplaza a la burbuja de respuesta. */
  | { kind: 'rate_limited' }
  /** Excepción real del cliente: ambos turnos degradados + copy aprobado. */
  | { kind: 'client_error' };

export interface ResolvedTurn {
  messages: ArgosMessage[];
  wasDegraded: boolean;
}

/**
 * Resuelve el array final de mensajes de un turno. `base` es la conversación
 * ANTES del turno del usuario; `userTurn` el mensaje enviado.
 */
export function resolveTurn(
  base: ArgosMessage[],
  userTurn: ArgosMessage,
  outcome: TurnOutcome,
  nowMs: number,
): ResolvedTurn {
  switch (outcome.kind) {
    case 'streamed':
      return {
        messages: [...base, userTurn, { role: 'assistant', content: outcome.text, ts: nowMs }],
        wasDegraded: false,
      };
    case 'reply': {
      if (!outcome.degraded) {
        return {
          messages: [...base, userTurn, { role: 'assistant', content: outcome.text, ts: nowMs }],
          wasDegraded: false,
        };
      }
      // ARG-2: una respuesta degradada no debe ensuciar contexto futuro —
      // AMBOS turnos quedan visibles pero marcados.
      return {
        messages: [
          ...base,
          { ...userTurn, degraded: true },
          { role: 'assistant', content: outcome.text, degraded: true, ts: nowMs },
        ],
        wasDegraded: true,
      };
    }
    case 'rate_limited':
      return {
        messages: [...base, { ...userTurn, degraded: true }],
        wasDegraded: true,
      };
    case 'client_error':
      return {
        messages: [
          ...base,
          { ...userTurn, degraded: true },
          { role: 'assistant', content: CLIENT_ERROR_COPY, degraded: true, ts: nowMs },
        ],
        wasDegraded: true,
      };
  }
}

/**
 * ARG-2: ¿este turno se persiste? Solo turnos limpios y solo si queda algo
 * que guardar. Devuelve también la lista limpia para saveConversation.
 */
export function persistPlan(
  finalMessages: ArgosMessage[],
  wasDegraded: boolean,
): { persist: boolean; clean: ArgosMessage[] } {
  const clean = filterForSave(finalMessages);
  return { persist: clean.length > 0 && !wasDegraded, clean };
}

/** Resultado del turno completo: stream con caída a no-stream (T2/T5). */
export type TurnRun =
  | { kind: 'streamed'; text: string }
  | { kind: 'reply'; text: string; degraded: boolean }
  /** info si vino parseada del no-stream; payload crudo si el stream lanzó. */
  | { kind: 'rate_limited'; info?: RateLimitInfo | null; payload?: unknown }
  | { kind: 'client_error'; error: unknown };

/**
 * T2: orquesta el turno — primero STREAMING; si el stream "no está
 * disponible" (null), cae al modo no-stream. Vivía inline en la pantalla y la
 * caída no tenía test. Reglas:
 *  - stream completo → 'streamed' (el no-stream NI SE LLAMA: sería doble cobro).
 *  - stream null → onFallback (la pantalla reenciende "pensando") + reply.
 *  - ArgosRateLimitError (del stream) o reply.rateLimit → 'rate_limited'.
 *  - cualquier otra excepción → 'client_error'.
 */
export async function runTurnWithFallback(deps: {
  stream: () => Promise<string | null>;
  reply: () => Promise<{ text: string; degraded: boolean; rateLimit?: RateLimitInfo | null }>;
  onFallback?: () => void;
}): Promise<TurnRun> {
  try {
    const streamed = await deps.stream();
    if (streamed !== null) return { kind: 'streamed', text: streamed };
    deps.onFallback?.();
    const result = await deps.reply();
    if (result.rateLimit) return { kind: 'rate_limited', info: result.rateLimit };
    return { kind: 'reply', text: result.text, degraded: result.degraded };
  } catch (e) {
    if (e instanceof ArgosRateLimitError) return { kind: 'rate_limited', payload: e.payload };
    return { kind: 'client_error', error: e };
  }
}

export interface ChatListItem {
  msg: ArgosMessage;
  /** Índice en el array ORIGINAL (clave estable + editar-y-reenviar). */
  index: number;
  /** F2.3: separador temporal discreto cuando el gap es >5 min. */
  showTimestamp: boolean;
}

/**
 * Prepara los items para la lista invertida (FlatList inverted): calcula los
 * separadores sobre el orden cronológico y devuelve el array AL REVÉS (el
 * más nuevo primero, como espera `inverted`).
 */
export function buildChatListItems(messages: ArgosMessage[], gapMs: number = TIMESTAMP_GAP_MS): ChatListItem[] {
  const items: ChatListItem[] = messages.map((msg, index) => {
    const prev = index > 0 ? messages[index - 1] : null;
    const showTimestamp = msg.ts != null && (
      index === 0 || (prev?.ts != null && msg.ts - prev.ts > gapMs)
    );
    return { msg, index, showTimestamp };
  });
  return items.reverse();
}
