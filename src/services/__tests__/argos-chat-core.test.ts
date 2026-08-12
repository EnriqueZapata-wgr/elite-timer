/**
 * MB-21 P4/P7 — la lógica del turno del chat, que vivía inline en 800 líneas
 * sin un solo test: filtrado de degradados (ARG-1/ARG-2/ARG-8), resolución
 * por desenlace, plan de persistencia y separadores de la lista invertida.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  TIMESTAMP_GAP_MS,
  CLIENT_ERROR_COPY,
  INSUFFICIENT_HPLUS_COPY,
  filterForLLM,
  filterForSave,
  resolveTurn,
  persistPlan,
  buildChatListItems,
  createSendGuard,
  runTurnWithFallback,
  isInsufficientProtonsError,
} from '@/src/services/argos-chat-core';
import { ArgosRateLimitError } from '@/src/services/argos-stream-core';
import type { RateLimitInfo } from '@/src/services/argos-rate-limit-core';
import type { ArgosMessage } from '@/src/services/argos-service';

const NOW = 1_800_000_000_000;

const user = (content: string, extra: Partial<ArgosMessage> = {}): ArgosMessage =>
  ({ role: 'user', content, ...extra });
const argos = (content: string, extra: Partial<ArgosMessage> = {}): ArgosMessage =>
  ({ role: 'assistant', content, ...extra });

describe('filterForLLM / filterForSave — degradados fuera (ARG-1/ARG-2/ARG-8)', () => {
  const mixed = [
    user('hola'),
    argos('hola!'),
    user('pregunta rota', { degraded: true }),
    argos('Se me fue la señal.', { degraded: true }),
    user('pregunta buena'),
  ];

  it('el LLM no vuelve a ver turnos degradados', () => {
    expect(filterForLLM(mixed).map(m => m.content)).toEqual(['hola', 'hola!', 'pregunta buena']);
  });

  it('la persistencia tampoco los guarda', () => {
    expect(filterForSave(mixed)).toHaveLength(3);
  });
});

describe('resolveTurn — el desenlace de un turno', () => {
  const base = [user('hola'), argos('hola!')];
  const turn = user('¿cómo va mi glucosa?');

  it('stream completo → turno limpio', () => {
    const r = resolveTurn(base, turn, { kind: 'streamed', text: 'va bien' }, NOW);
    expect(r.wasDegraded).toBe(false);
    expect(r.messages).toHaveLength(4);
    expect(r.messages[3]).toMatchObject({ role: 'assistant', content: 'va bien', ts: NOW });
    expect(r.messages.some(m => m.degraded)).toBe(false);
  });

  it('respuesta no-stream limpia → turno limpio', () => {
    const r = resolveTurn(base, turn, { kind: 'reply', text: 'ok', degraded: false }, NOW);
    expect(r.wasDegraded).toBe(false);
    expect(r.messages.some(m => m.degraded)).toBe(false);
  });

  it('respuesta degradada → AMBOS turnos marcados (no ensucian contexto futuro)', () => {
    const r = resolveTurn(base, turn, { kind: 'reply', text: 'caído', degraded: true }, NOW);
    expect(r.wasDegraded).toBe(true);
    const [u, a] = r.messages.slice(-2);
    expect(u.degraded).toBe(true);
    expect(a.degraded).toBe(true);
    // Y el filtro los excluye del próximo turno:
    expect(filterForLLM(r.messages)).toHaveLength(2);
  });

  it('rate limit → el turno del usuario queda visible pero degradado, sin burbuja de respuesta', () => {
    const r = resolveTurn(base, turn, { kind: 'rate_limited' }, NOW);
    expect(r.wasDegraded).toBe(true);
    expect(r.messages).toHaveLength(3);
    expect(r.messages[2]).toMatchObject({ role: 'user', degraded: true });
  });

  it('excepción de cliente → ambos degradados + copy aprobado', () => {
    const r = resolveTurn(base, turn, { kind: 'client_error' }, NOW);
    expect(r.wasDegraded).toBe(true);
    const last = r.messages[r.messages.length - 1];
    expect(last.content).toBe(CLIENT_ERROR_COPY);
    expect(last.degraded).toBe(true);
  });
});

describe('persistPlan — qué se guarda (ARG-2)', () => {
  it('turno limpio con contenido → se persiste, limpio', () => {
    const msgs = [user('a'), argos('b')];
    const plan = persistPlan(msgs, false);
    expect(plan.persist).toBe(true);
    expect(plan.clean).toHaveLength(2);
  });

  it('turno degradado NO se persiste', () => {
    const msgs = [user('a'), argos('b'), user('c', { degraded: true })];
    expect(persistPlan(msgs, true).persist).toBe(false);
  });

  it('todo degradado (nada que guardar) NO se persiste', () => {
    const msgs = [user('a', { degraded: true }), argos('b', { degraded: true })];
    expect(persistPlan(msgs, false).persist).toBe(false);
  });
});

describe('buildChatListItems — lista invertida con separadores', () => {
  it('invierte el orden (el más nuevo primero, como espera FlatList inverted)', () => {
    const items = buildChatListItems([user('1', { ts: NOW }), argos('2', { ts: NOW + 1000 })]);
    expect(items[0].msg.content).toBe('2');
    expect(items[1].msg.content).toBe('1');
  });

  it('conserva el índice ORIGINAL (clave estable + editar-y-reenviar)', () => {
    const items = buildChatListItems([user('1'), argos('2')]);
    expect(items[0].index).toBe(1);
    expect(items[1].index).toBe(0);
  });

  it('separador en el primer mensaje y tras gaps >5 min; no en mensajes seguidos', () => {
    const items = buildChatListItems([
      user('a', { ts: NOW }),
      argos('b', { ts: NOW + 60_000 }),               // 1 min después: sin separador
      user('c', { ts: NOW + 60_000 + TIMESTAMP_GAP_MS + 1 }), // gap: separador
    ]);
    const byContent = Object.fromEntries(items.map(i => [i.msg.content, i.showTimestamp]));
    expect(byContent).toEqual({ a: true, b: false, c: true });
  });

  it('mensajes viejos sin ts simplemente no muestran separador', () => {
    const items = buildChatListItems([user('a'), argos('b')]);
    expect(items.every(i => !i.showTimestamp)).toBe(true);
  });
});

describe('createSendGuard — guard de re-entrada (#71)', () => {
  it('el doble-tap NO entra: solo el primer envío adquiere el turno', () => {
    const guard = createSendGuard();
    expect(guard.tryAcquire()).toBe(true);
    // Segundo tap mientras el turno sigue en vuelo — LA mutación que este
    // test entierra: quitar el guard y cobrar H+ dos veces.
    expect(guard.tryAcquire()).toBe(false);
    expect(guard.tryAcquire()).toBe(false);
  });

  it('release libera y el siguiente turno vuelve a entrar', () => {
    const guard = createSendGuard();
    guard.tryAcquire();
    guard.release();
    expect(guard.tryAcquire()).toBe(true);
  });

  it('release sin adquirir no rompe ni deja el guard tomado', () => {
    const guard = createSendGuard();
    guard.release();
    expect(guard.tryAcquire()).toBe(true);
  });

  it('cada pantalla tiene su propio guard (instancias independientes)', () => {
    const a = createSendGuard();
    const b = createSendGuard();
    a.tryAcquire();
    expect(b.tryAcquire()).toBe(true);
  });
});

describe('runTurnWithFallback — la caída de streaming a no-streaming (T2/T5)', () => {
  const RL_INFO: RateLimitInfo = {
    tier: 'free', limitDaily: 10, usedToday: 10, resetsAt: null, boostOption: null,
  };

  it('stream completo → streamed, y el no-stream NI SE LLAMA (sería doble cobro)', async () => {
    const reply = vi.fn();
    const run = await runTurnWithFallback({
      stream: async () => 'texto completo',
      reply,
    });
    expect(run).toEqual({ kind: 'streamed', text: 'texto completo' });
    expect(reply).not.toHaveBeenCalled();
  });

  it('stream no disponible (null) → cae a no-stream, avisando a la pantalla', async () => {
    // LA caída del brief: el proxy sin stream no debe dejar el turno mudo.
    const onFallback = vi.fn();
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: async () => ({ text: 'respuesta plana', degraded: false }),
      onFallback,
    });
    expect(run).toEqual({ kind: 'reply', text: 'respuesta plana', degraded: false });
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('el fallback conserva degraded=true (proveedores caídos)', async () => {
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: async () => ({ text: 'caído', degraded: true }),
    });
    expect(run).toEqual({ kind: 'reply', text: 'caído', degraded: true });
  });

  it('rate limit durante el stream → rate_limited con el payload, sin llamar no-stream', async () => {
    const reply = vi.fn();
    const run = await runTurnWithFallback({
      stream: async () => { throw new ArgosRateLimitError({ _rate_limited: true }); },
      reply,
    });
    expect(run).toMatchObject({ kind: 'rate_limited', payload: { _rate_limited: true } });
    expect(reply).not.toHaveBeenCalled();
  });

  it('rate limit en el no-stream → rate_limited con la info ya parseada', async () => {
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: async () => ({ text: '', degraded: true, rateLimit: RL_INFO }),
    });
    expect(run).toEqual({ kind: 'rate_limited', info: RL_INFO });
  });

  it('excepción real del no-stream → client_error con el error original', async () => {
    const boom = new Error('red rota');
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: async () => { throw boom; },
    });
    expect(run).toEqual({ kind: 'client_error', error: boom });
  });

  it('ECO-1: 402 del proxy (saldo) → insufficient_protons, no client_error', async () => {
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: async () => {
        throw new Error('Proxy error 402: {"error":{"type":"insufficient_protons"}}');
      },
    });
    expect(run).toEqual({ kind: 'insufficient_protons' });
  });
});

describe('ECO-1 — bloqueo por saldo (402) vs bloqueo por límite', () => {
  it('detecta las tres formas del 402 (no-stream, stream, tipo del server)', () => {
    expect(isInsufficientProtonsError(new Error('Proxy error 402: {...}'))).toBe(true);
    expect(isInsufficientProtonsError(new Error('proxy_402: insuficiente'))).toBe(true);
    expect(isInsufficientProtonsError(new Error('x insufficient_protons y'))).toBe(true);
  });

  it('NO confunde errores de red ni rate limits con falta de saldo', () => {
    expect(isInsufficientProtonsError(new Error('red rota'))).toBe(false);
    expect(isInsufficientProtonsError(new Error('Proxy error 500: kaput'))).toBe(false);
    expect(isInsufficientProtonsError(null)).toBe(false);
  });

  it('resolveTurn: insufficient_protons degrada ambos turnos con su copy propio (sin boost)', () => {
    const { messages, wasDegraded } = resolveTurn(
      [], user('hola'), { kind: 'insufficient_protons' }, NOW,
    );
    expect(wasDegraded).toBe(true);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'user', degraded: true });
    expect(messages[1]).toMatchObject({
      role: 'assistant', degraded: true, content: INSUFFICIENT_HPLUS_COPY,
    });
    // El remedio del copy es la tienda/conversión — jamás menciona el boost.
    expect(INSUFFICIENT_HPLUS_COPY.toLowerCase()).not.toContain('boost');
  });
});
