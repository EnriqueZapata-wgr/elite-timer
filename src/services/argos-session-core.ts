/**
 * ARGOS Session — lógica pura (MB-21 Pieza 2).
 *
 * La regla: UNA SESIÓN DE APP ES UNA CONVERSACIÓN. Abrir la app en frío
 * arranca ARGOS en blanco; dentro de la misma sesión, salir y volver al tab
 * retoma lo que estabas diciendo. El estado con AppState vive en
 * argos-session.ts; aquí solo las decisiones, testeables sin react-native.
 */

/**
 * Umbral de background que corta la sesión. Contestar una llamada y volver a
 * los treinta segundos es LA MISMA sesión; dejar la app al fondo media hora
 * no. Cinco minutos separa el "me interrumpieron" del "ya me fui".
 */
export const ARGOS_SESSION_BACKGROUND_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * ¿Al volver a foreground toca rotar la sesión? Solo si la app estuvo al
 * fondo al menos el umbral. `backgroundedAtMs` null = nunca se fue al fondo.
 */
export function shouldRotateSession(
  backgroundedAtMs: number | null,
  nowMs: number,
  thresholdMs: number = ARGOS_SESSION_BACKGROUND_THRESHOLD_MS,
): boolean {
  if (backgroundedAtMs == null) return false;
  return nowMs - backgroundedAtMs >= thresholdMs;
}

/**
 * ¿El foco del chat debe siquiera intentar retomar una conversación?
 * No si ya hay una activa en pantalla, ni si se pidió una nueva (new=1), ni
 * si se pidió abrir una específica (?conversationId=) — en ese caso el load
 * explícito manda y autoLoadRecent no debe pisarlo (llega después y ganaría).
 */
export function shouldAttemptResume(input: {
  hasMessages: boolean;
  activeConversationId: string | null;
  requestedNew: boolean;
  requestedConversation: boolean;
}): boolean {
  if (input.requestedNew) return false;
  if (input.requestedConversation) return false;
  if (input.hasMessages) return false;
  if (input.activeConversationId) return false;
  return true;
}

/**
 * ¿La sesión rotó por debajo de la pantalla? Pasa cuando la app vuelve de un
 * background largo con el chat abierto: el ancla global ya rotó pero el
 * contenido en pantalla sigue anclado a la sesión anterior. Si es así, la
 * pantalla se limpia — el siguiente envío NO debe adoptar la conversación
 * vieja en la sesión nueva. Ancla null = pantalla sin contenido anclado.
 */
export function sessionRotatedAway(
  anchorSessionId: string | null,
  currentSessionId: string,
): boolean {
  return anchorSessionId != null && anchorSessionId !== currentSessionId;
}

export interface RecentConversationRef {
  id: string;
  /** Ancla de sesión (migración 253). Null en conversaciones pre-migración. */
  session_id?: string | null;
}

/**
 * La decisión central de autoLoadRecent: retomar SOLO si la conversación más
 * reciente pertenece a la sesión actual. Una conversación de otra sesión (o
 * sin ancla, pre-migración) no se resucita: abrir en frío es empezar de nuevo.
 * Devuelve el id a cargar, o null para arrancar en blanco.
 */
export function resumeTarget(
  mostRecent: RecentConversationRef | null | undefined,
  currentSessionId: string,
): string | null {
  if (!mostRecent) return null;
  if (mostRecent.session_id !== currentSessionId) return null;
  return mostRecent.id;
}
