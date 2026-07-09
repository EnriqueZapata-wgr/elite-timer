import { describe, it, expect } from 'vitest';
import {
  splitSSEBuffer,
  parseStreamEvent,
  isEventStreamResponse,
  ArgosRateLimitError,
  ArgosStreamUnavailableError,
} from '@/src/services/argos-stream-core';

describe('splitSSEBuffer — framing de eventos SSE (T2)', () => {
  it('separa eventos completos y conserva el resto incompleto', () => {
    const { rawEvents, rest } = splitSSEBuffer(
      'data: {"type":"chunk","text":"Hola"}\n\ndata: {"type":"chunk","text":" mundo"}\n\ndata: {"type":"do',
    );
    expect(rawEvents).toHaveLength(2);
    expect(rest).toBe('data: {"type":"do');
  });

  it('buffer sin delimitador completo → todo queda en rest', () => {
    const { rawEvents, rest } = splitSSEBuffer('data: {"type":"chunk"');
    expect(rawEvents).toHaveLength(0);
    expect(rest).toBe('data: {"type":"chunk"');
  });

  it('tolera \\r\\n (proxies que normalizan line endings)', () => {
    const { rawEvents } = splitSSEBuffer('data: {"type":"done"}\r\n\r\n');
    expect(rawEvents).toHaveLength(1);
  });

  it('ignora bloques vacíos entre delimitadores', () => {
    const { rawEvents } = splitSSEBuffer('\n\n\n\ndata: {"type":"done"}\n\n');
    expect(rawEvents).toHaveLength(1);
  });
});

describe('parseStreamEvent — protocolo del proxy', () => {
  it('chunk con texto', () => {
    const evt = parseStreamEvent('data: {"type":"chunk","text":"Hola"}');
    expect(evt).toEqual({ type: 'chunk', text: 'Hola', message: undefined, model: undefined });
  });

  it('start con modelo', () => {
    const evt = parseStreamEvent('data: {"type":"start","model":"claude-sonnet-5"}');
    expect(evt?.type).toBe('start');
    expect(evt?.model).toBe('claude-sonnet-5');
  });

  it('done y error', () => {
    expect(parseStreamEvent('data: {"type":"done"}')?.type).toBe('done');
    const err = parseStreamEvent('data: {"type":"error","message":"boom"}');
    expect(err?.type).toBe('error');
    expect(err?.message).toBe('boom');
  });

  it('keep-alives, JSON inválido y tipos desconocidos → null (no crashea)', () => {
    expect(parseStreamEvent(': ping')).toBeNull();
    expect(parseStreamEvent('data: not-json')).toBeNull();
    expect(parseStreamEvent('data: {"type":"whatever"}')).toBeNull();
    expect(parseStreamEvent('')).toBeNull();
  });

  it('evento multi-línea (event: + data:) extrae la línea data', () => {
    const evt = parseStreamEvent('event: message\ndata: {"type":"chunk","text":"x"}');
    expect(evt?.text).toBe('x');
  });
});

describe('isEventStreamResponse', () => {
  it('detecta text/event-stream (con charset y case-insensitive)', () => {
    expect(isEventStreamResponse('text/event-stream')).toBe(true);
    expect(isEventStreamResponse('text/event-stream; charset=utf-8')).toBe(true);
    expect(isEventStreamResponse('Text/Event-Stream')).toBe(true);
  });
  it('JSON o vacío → false (modo legacy / rate limit)', () => {
    expect(isEventStreamResponse('application/json')).toBe(false);
    expect(isEventStreamResponse(null)).toBe(false);
    expect(isEventStreamResponse(undefined)).toBe(false);
  });
});

describe('errores tipados', () => {
  it('ArgosRateLimitError conserva el payload del proxy', () => {
    const payload = { _rate_limited: true, rate_limit: { tier: 'free' } };
    const err = new ArgosRateLimitError(payload);
    expect(err.name).toBe('ArgosRateLimitError');
    expect(err.payload).toBe(payload);
    expect(err instanceof Error).toBe(true);
  });
  it('ArgosStreamUnavailableError es distinguible del rate limit', () => {
    const err = new ArgosStreamUnavailableError('proxy_500');
    expect(err.name).toBe('ArgosStreamUnavailableError');
    expect(err instanceof ArgosRateLimitError).toBe(false);
  });
});
