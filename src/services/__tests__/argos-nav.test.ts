/**
 * MB-21 Pieza 5.2 — openArgosChat, LA forma de llegar al chat.
 *
 * El contrato que bloqueaba el merge: `startNew` debe rotar el ancla de
 * sesión (startNewArgosSession) ANTES del router.push. Sin este test, quitar
 * la rotación de argos-nav.ts no tronaba nada — y el bug del panel ("nueva"
 * abría en blanco por ?new=1, pero al cambiar de tab la conversación vieja
 * resucitaba porque el ancla no rotó) volvía en silencio.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock se hoistea por encima de los imports — ni router ni AppState reales.
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('@/src/services/argos-session', () => ({ startNewArgosSession: vi.fn() }));

import { router } from 'expo-router';
import { startNewArgosSession } from '@/src/services/argos-session';
import { openArgosChat } from '@/src/services/argos-nav';

const push = vi.mocked(router.push);
const rotate = vi.mocked(startNewArgosSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('openArgosChat con startNew — cerrar de verdad', () => {
  it('rota el ancla de sesión, y ANTES del push', () => {
    openArgosChat({ startNew: true });
    // LA mutación que este test entierra: quitar startNewArgosSession().
    expect(rotate).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
    // Orden: si el push ganara, la pantalla montaría y podría retomar la
    // conversación vieja contra el ancla aún sin rotar.
    expect(rotate.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[0]);
  });

  it('además pasa new=1 para que la pantalla arranque en blanco', () => {
    openArgosChat({ startNew: true });
    expect(push).toHaveBeenCalledWith({ pathname: '/argos-chat', params: { new: '1' } });
  });
});

describe('openArgosChat sin startNew — no cierra nada', () => {
  it('abrir el chat a secas NO rota el ancla (la conversación en curso sigue)', () => {
    openArgosChat();
    expect(rotate).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({ pathname: '/argos-chat', params: {} });
  });

  it('abrir una conversación del historial tampoco rota', () => {
    openArgosChat({ conversationId: 'c1', from: 'hoy' });
    expect(rotate).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({
      pathname: '/argos-chat',
      params: { from: 'hoy', conversationId: 'c1' },
    });
  });

  it("from 'argos' u 'other' no viaja como param (ruido sin señal)", () => {
    openArgosChat({ from: 'argos' });
    openArgosChat({ from: 'other' });
    expect(push).toHaveBeenNthCalledWith(1, { pathname: '/argos-chat', params: {} });
    expect(push).toHaveBeenNthCalledWith(2, { pathname: '/argos-chat', params: {} });
  });
});
