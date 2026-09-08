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

import { VENTA_AL_PUBLICO } from '@/src/constants/flags';

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
 * 7-sep-2026 (VENTA_AL_PUBLICO): el mensaje que se pinta cuando la venta al
 * público está apagada y el servidor TODAVÍA corta, o sea mientras
 * `argos-proxy` no se despliega con su env var. El texto del proxy invita a
 * comprar Pro y eso no se le dice a un cliente que ya pagó su evaluación. Se
 * dice lo que pasa y nada más; el chip de compra tampoco se pinta (VerProRow).
 */
export const LIMITE_CHAT_SIN_VENTA_COPY =
  'Hoy ya usaste tus tres mensajes con ARGOS. Mañana hay más.';

/**
 * Lee la respuesta cruda del proxy. Devuelve el límite si el status es 429 y
 * el cuerpo trae `error: 'free_chat_limit'`; null para cualquier otro fallo
 * (que sigue su camino como error genérico).
 */
export function parseFreeChatLimit(
  status: number,
  bodyText: string,
  ventaAlPublico: boolean = VENTA_AL_PUBLICO,
): { message: string; contexto: string } | null {
  if (status !== 429 || !bodyText) return null;
  try {
    const data = JSON.parse(bodyText) as { error?: unknown; message?: unknown; contexto?: unknown };
    if (data?.error !== FREE_CHAT_LIMIT) return null;
    // Con la venta apagada se ignora el copy del servidor: lo que manda hoy
    // termina en "con Pro platicas sin límite" y eso no se le ofrece a nadie.
    if (ventaAlPublico !== true) {
      return { message: LIMITE_CHAT_SIN_VENTA_COPY, contexto: 'cuarto_chat' };
    }
    const message = typeof data.message === 'string' && data.message.trim()
      ? data.message.trim()
      : FREE_CHAT_LIMIT_COPY;
    const contexto = typeof data.contexto === 'string' && data.contexto ? data.contexto : 'cuarto_chat';
    return { message, contexto };
  } catch {
    return null;
  }
}
