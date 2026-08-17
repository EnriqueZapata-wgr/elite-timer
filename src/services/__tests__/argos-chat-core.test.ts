/**
 * MB-21 P4/P7 — la lógica del turno del chat, que vivía inline en 800 líneas
 * sin un solo test: filtrado de degradados (ARG-1/ARG-2/ARG-8), resolución
 * por desenlace, plan de persistencia y separadores de la lista invertida.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  TIMESTAMP_GAP_MS,
  CLIENT_ERROR_COPY,
  TIMEOUT_COPY,
  filterForLLM,
  filterForSave,
  resolveTurn,
  persistPlan,
  buildChatListItems,
  createSendGuard,
  runTurnWithFallback,
  chatFailureOutcome,
} from '@/src/services/argos-chat-core';
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

describe('runTurnWithFallback — la caída de streaming a no-streaming (T2)', () => {
  it('stream completo → streamed, y el no-stream NI SE LLAMA (sería una 2a llamada al modelo)', async () => {
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

  // PREMIUM (16-ago-2026): aquí vivían dos casos de rate limit (durante el
  // stream y en el no-stream) que comprobaban que el turno terminara en
  // 'rate_limited'. Ese desenlace ya no existe: nadie se queda sin ARGOS por
  // haberlo usado. El test que lo reemplaza es el de abajo: un fallo del
  // proxy, venga como venga, termina degradado y NUNCA cortando el acceso.
  it('un 429 del proxy ya NO corta el acceso: se degrada como cualquier fallo', async () => {
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: replyThroughRealCatch(new Error('Proxy error 429: rate limited')),
    });
    expect(run).toEqual({ kind: 'reply', text: CLIENT_ERROR_COPY, degraded: true });
  });

  it('excepción real del no-stream → client_error con el error original', async () => {
    const boom = new Error('red rota');
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: async () => { throw boom; },
    });
    expect(run).toEqual({ kind: 'client_error', error: boom });
  });

  // El CAMINO REAL: callAnthropic lanza → el catch de chatWithArgosEx decide
  // con chatFailureOutcome → runTurnWithFallback clasifica. Este helper
  // reproduce ese catch EXACTO, no un throw inyectado que se salte el swallow.
  const replyThroughRealCatch = (boom: unknown) => async () => {
    try {
      throw boom; // callAnthropic falla
    } catch (e) {
      return chatFailureOutcome(e);
    }
  };

  it('un 402 del proxy tampoco corta: sin cobro, es un fallo más', async () => {
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: replyThroughRealCatch(new Error('Proxy error 402: {"error":{"type":"whatever"}}')),
    });
    expect(run).toEqual({ kind: 'reply', text: CLIENT_ERROR_COPY, degraded: true });
  });

  it('un error genérico se degrada con el copy aprobado', async () => {
    const run = await runTurnWithFallback({
      stream: async () => null,
      reply: replyThroughRealCatch(new Error('red rota')),
    });
    expect(run).toEqual({ kind: 'reply', text: CLIENT_ERROR_COPY, degraded: true });
  });
});

describe('chatFailureOutcome — la decisión del catch de chatWithArgosEx', () => {
  // PREMIUM (16-ago-2026): este describe comprobaba que el 402 de saldo y el
  // rate limit se PROPAGARAN, porque cada uno tenía pantalla propia (alerta de
  // recarga y card del límite). Ahora se comprueba lo contrario, que es la
  // garantía nueva: NADA se propaga, o sea que ningún fallo puede volver a
  // convertirse en un muro.
  it('ya NADA se propaga: el 402 y el 429 se degradan como cualquier otro fallo', () => {
    expect(chatFailureOutcome(new Error('Proxy error 402: {...}'))).toEqual({ text: CLIENT_ERROR_COPY, degraded: true });
    expect(chatFailureOutcome(new Error('Proxy error 429: rate limited'))).toEqual({ text: CLIENT_ERROR_COPY, degraded: true });
  });

  it('timeout y errores genéricos se degradan in-place con su copy', () => {
    expect(chatFailureOutcome(new Error('ARGOS_TIMEOUT'))).toEqual({ text: TIMEOUT_COPY, degraded: true });
    expect(chatFailureOutcome(new Error('red rota'))).toEqual({ text: CLIENT_ERROR_COPY, degraded: true });
    expect(chatFailureOutcome(null)).toEqual({ text: CLIENT_ERROR_COPY, degraded: true });
  });
});

/**
 * PREMIUM (16-ago-2026): este describe se llamaba "ECO-1 — bloqueo por saldo
 * (402) vs bloqueo por límite" y verificaba que el chat supiera distinguir las
 * dos formas de quedarse sin ARGOS. Se reapunta a la regla nueva, que es la que
 * de verdad hay que cuidar: NINGUNA respuesta del chat puede volver a hablar de
 * saldo, de recargar ni de un tope alcanzado.
 */
describe('PREMIUM — ningún desenlace del chat vuelve a hablar de saldo ni de límites', () => {
  const prohibidas = ['h+', 'proton', 'recarga', 'saldo', 'boost', 'límite', 'cuota', 'plan'];

  it('el copy de error de cliente no menciona dinero ni topes', () => {
    const texto = CLIENT_ERROR_COPY.toLowerCase();
    for (const palabra of prohibidas) expect(texto).not.toContain(palabra);
  });

  it('el copy de timeout tampoco', () => {
    const texto = TIMEOUT_COPY.toLowerCase();
    for (const palabra of prohibidas) expect(texto).not.toContain(palabra);
  });

  it('un fallo cualquiera termina en burbuja degradada, nunca en turno sin respuesta', () => {
    const r = resolveTurn([], user('hola'), { kind: 'client_error' }, NOW);
    // Dos mensajes = la pregunta sigue visible Y ARGOS contestó algo.
    expect(r.messages).toHaveLength(2);
    expect(r.messages[1]).toMatchObject({ role: 'assistant', content: CLIENT_ERROR_COPY });
  });
});
