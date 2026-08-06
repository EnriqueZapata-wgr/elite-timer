/**
 * ARGOS Nav — LA forma de llegar al chat (MB-21 Pieza 5.2).
 *
 * Hay dos rutas que renderizan el chat ((tabs)/argos y /argos-chat) y ocho
 * caminos que lo abren. Antes cada uno armaba su propio router.push con (o
 * sin) params; ahora todos pasan por aquí: un solo pathname, params tipados,
 * y el origen (?from=) deja de ser opcional-por-olvido.
 */
import { router } from 'expo-router';
import type { ArgosScreen } from '@/src/hooks/argos-screen-context-core';
import { startNewArgosSession } from './argos-session';

export interface OpenArgosChatOptions {
  /** Pantalla de origen — ARGOS abre sabiendo de dónde vienes (T4). */
  from?: ArgosScreen;
  /** Abrir una conversación específica del historial. */
  conversationId?: string;
  /**
   * Arrancar en blanco Y cerrar de verdad: rota el ancla de sesión, así la
   * conversación anterior deja de ser retomable por foco (no solo ?new=1).
   */
  startNew?: boolean;
}

export function openArgosChat(options: OpenArgosChatOptions = {}): void {
  const params: Record<string, string> = {};
  if (options.from && options.from !== 'argos' && options.from !== 'other') {
    params.from = options.from;
  }
  if (options.conversationId) params.conversationId = options.conversationId;
  if (options.startNew) {
    // Sin esta rotación, "nueva" desde el panel solo abría en blanco: al
    // cambiar de tab, la conversación vieja resucitaba (el ancla no rotó).
    startNewArgosSession();
    params.new = '1';
  }
  router.push({ pathname: '/argos-chat', params });
}
