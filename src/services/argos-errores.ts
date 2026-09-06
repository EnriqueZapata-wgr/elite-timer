/**
 * Errores tipados de ARGOS (ATP 3.0, 5-sep-2026, ruta 1.11).
 *
 * El proxy (`argos-proxy`) contesta 429 con
 * `{ error: 'free_chat_limit', message, contexto: 'cuarto_chat' }` cuando un
 * usuario Free manda su cuarto chat del día. Eso NO es un fallo de red: es un
 * momento de conversión (pivote 3.3), y la pantalla tiene que distinguirlo de
 * "se me fue la señal" para pintar el mensaje del proxy y el botón a Pro.
 *
 * Puro (sin RN ni Supabase): el cliente HTTP lo lanza, la pantalla lo atrapa.
 * Solo aplica a Free: un miembro nunca recibe este 429 (doctrina "no cortar a
 * quien paga", el proxy abre ante error).
 */

export const FREE_CHAT_LIMIT = 'free_chat_limit';

export class FreeChatLimitError extends Error {
  /** El contexto del paywall que el proxy pide abrir. */
  readonly contexto: string;

  constructor(message: string, contexto: string) {
    super(message);
    this.name = 'FreeChatLimitError';
    this.contexto = contexto;
    // Sin esto `instanceof` falla en Hermes/ES5 al extender Error.
    Object.setPrototypeOf(this, FreeChatLimitError.prototype);
  }
}

/** Copy de respaldo si el proxy manda el código sin mensaje. */
export const FREE_CHAT_LIMIT_COPY =
  'Hoy ya usaste tus tres mensajes con ARGOS. Mañana hay más, o con Pro platicas sin límite.';

/**
 * Lee la respuesta cruda del proxy. Devuelve el límite si el status es 429 y
 * el cuerpo trae `error: 'free_chat_limit'`; null para cualquier otro fallo
 * (que sigue su camino como error genérico).
 */
export function parseFreeChatLimit(
  status: number,
  bodyText: string,
): { message: string; contexto: string } | null {
  if (status !== 429 || !bodyText) return null;
  try {
    const data = JSON.parse(bodyText) as { error?: unknown; message?: unknown; contexto?: unknown };
    if (data?.error !== FREE_CHAT_LIMIT) return null;
    const message = typeof data.message === 'string' && data.message.trim()
      ? data.message.trim()
      : FREE_CHAT_LIMIT_COPY;
    const contexto = typeof data.contexto === 'string' && data.contexto ? data.contexto : 'cuarto_chat';
    return { message, contexto };
  } catch {
    return null;
  }
}
