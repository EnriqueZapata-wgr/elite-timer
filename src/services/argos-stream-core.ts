/**
 * ARGOS Streaming — lógica pura del protocolo SSE (T2 MAGIA ARGOS 2.0).
 *
 * El proxy (argos-proxy con stream: true) emite eventos simplificados:
 *   data: {"type":"start","model":"..."}
 *   data: {"type":"chunk","text":"..."}
 *   data: {"type":"done"}
 *   data: {"type":"error","message":"..."}
 *
 * Aquí vive el parser del buffer SSE y los tipos/errores del stream —
 * separado del transporte (expo/fetch) para testear en node.
 */

export type ArgosStreamEventType = 'start' | 'chunk' | 'done' | 'error';

export interface ArgosStreamEvent {
  type: ArgosStreamEventType;
  /** Texto del delta (solo 'chunk'). */
  text?: string;
  /** Descripción del error (solo 'error'). */
  message?: string;
  /** Modelo que responde (solo 'start'). */
  model?: string;
}

/** El proxy respondió rate_limited — el caller muestra RateLimitCard (T5). */
export class ArgosRateLimitError extends Error {
  constructor(public payload: unknown) {
    super('rate_limited');
    this.name = 'ArgosRateLimitError';
  }
}

/**
 * El stream no está disponible (proxy viejo sin SSE, respuesta degradada,
 * error de red antes del primer chunk). El caller hace fallback al modo
 * no-streaming (chatWithArgosEx).
 */
export class ArgosStreamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgosStreamUnavailableError';
  }
}

/**
 * Separa un buffer SSE en eventos completos (delimitados por doble newline)
 * y el resto incompleto que espera más bytes. Tolera \r\n.
 */
export function splitSSEBuffer(buffer: string): { rawEvents: string[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  return { rawEvents: parts.filter((p) => p.trim().length > 0), rest };
}

/**
 * Parsea un evento SSE crudo ("data: {...}") a ArgosStreamEvent.
 * Devuelve null para eventos vacíos, keep-alives (": ping") o JSON inválido.
 */
export function parseStreamEvent(raw: string): ArgosStreamEvent | null {
  const dataLine = raw.split('\n').find((l) => l.startsWith('data:'));
  if (!dataLine) return null;
  const jsonStr = dataLine.slice(5).trim();
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const type = parsed?.type;
    if (type !== 'start' && type !== 'chunk' && type !== 'done' && type !== 'error') return null;
    return {
      type,
      text: typeof parsed.text === 'string' ? parsed.text : undefined,
      message: typeof parsed.message === 'string' ? parsed.message : undefined,
      model: typeof parsed.model === 'string' ? parsed.model : undefined,
    };
  } catch {
    return null;
  }
}

/** ¿La respuesta es SSE (stream soportado) o JSON (modo legacy/rate-limit)? */
export function isEventStreamResponse(contentType: string | null | undefined): boolean {
  return !!contentType && contentType.toLowerCase().includes('text/event-stream');
}
