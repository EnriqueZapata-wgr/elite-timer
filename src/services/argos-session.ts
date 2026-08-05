/**
 * ARGOS Session — el ancla de sesión en memoria (MB-21 Pieza 2).
 *
 * Nace con el proceso de la app: cada arranque en frío es una sesión nueva
 * (y por lo tanto una conversación nueva). Se rota en dos casos:
 *   1. La app vuelve del background tras el umbral (argos-session-core) —
 *      contestar una llamada NO corta la sesión; dejar la app media hora sí.
 *   2. El usuario toca "nueva conversación" (startNewArgosSession) — eso
 *      cierra la conversación DE VERDAD: al volver al tab, la más reciente ya
 *      no pertenece a esta sesión y no se resucita.
 *
 * Las decisiones son puras y viven en argos-session-core.ts (testeables);
 * aquí solo el estado y la suscripción a AppState.
 */
import { AppState, type AppStateStatus } from 'react-native';
import { generateUUID } from '@/src/utils/uuid';
import { shouldRotateSession } from './argos-session-core';

let sessionId: string = generateUUID();
let backgroundedAt: number | null = null;
let subscribed = false;

function handleAppStateChange(state: AppStateStatus) {
  if (state === 'background' || state === 'inactive') {
    // 'inactive' (iOS) también cuenta: una llamada entra por ahí. Solo se
    // registra la PRIMERA salida — transiciones inactive→background no
    // reinician el reloj.
    if (backgroundedAt == null) backgroundedAt = Date.now();
    return;
  }
  if (state === 'active') {
    if (shouldRotateSession(backgroundedAt, Date.now())) {
      sessionId = generateUUID();
    }
    backgroundedAt = null;
  }
}

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  AppState.addEventListener('change', handleAppStateChange);
}

/** Ancla de la sesión actual. Las conversaciones se guardan con ella. */
export function getArgosSessionId(): string {
  ensureSubscribed();
  return sessionId;
}

/**
 * Rota la sesión a mano ("nueva conversación"). La conversación anterior NO
 * se borra — sigue en el historial; solo deja de ser retomable por foco.
 */
export function startNewArgosSession(): string {
  ensureSubscribed();
  sessionId = generateUUID();
  backgroundedAt = null;
  return sessionId;
}
