import { describe, expect, it, vi } from 'vitest';

import {
  analyzeExpoTickets,
  DEAD_TOKEN_FAILS_TO_INVALIDATE,
  DEFAULT_RETRY,
  isRetryableStatus,
  sendPushBatchWithRetry,
  tokensToInvalidate,
} from '../hardening';

const noSleep = vi.fn(async () => {});
const okResponse = (tickets: unknown[] = [{ status: 'ok' }]) => ({
  status: 200,
  json: async () => ({ data: tickets }),
});

describe('T1 · sendPushBatchWithRetry', () => {
  it('éxito al primer intento — sin sleeps', async () => {
    const fetchFn = vi.fn(async () => okResponse());
    const sleep = vi.fn(async () => {});
    const result = await sendPushBatchWithRetry([{ to: 'tok' }], fetchFn, DEFAULT_RETRY, sleep);
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.tickets).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('éxito al tercer intento tras dos 500 — backoff 500ms y 2s', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ status: 503, json: async () => ({}) })
      .mockResolvedValueOnce(okResponse());
    const sleep = vi.fn(async () => {});
    const result = await sendPushBatchWithRetry([{ to: 'tok' }], fetchFn, DEFAULT_RETRY, sleep);
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 500);
    expect(sleep).toHaveBeenNthCalledWith(2, 2000);
  });

  it('fallo de red en los 3 intentos → ok=false, networkError=true', async () => {
    const fetchFn = vi.fn(async () => { throw new Error('ECONNRESET'); });
    const result = await sendPushBatchWithRetry([{ to: 'tok' }], fetchFn, DEFAULT_RETRY, noSleep);
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.networkError).toBe(true);
    expect(result.status).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('400 NO reintenta (payload malo)', async () => {
    const fetchFn = vi.fn(async () => ({ status: 400, json: async () => ({}) }));
    const result = await sendPushBatchWithRetry([{ to: 'tok' }], fetchFn, DEFAULT_RETRY, noSleep);
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.networkError).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('429 SÍ reintenta', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ status: 429, json: async () => ({}) })
      .mockResolvedValueOnce(okResponse());
    const result = await sendPushBatchWithRetry([{ to: 'tok' }], fetchFn, DEFAULT_RETRY, noSleep);
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('isRetryableStatus: 429/5xx sí, 4xx no', () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });
});

describe('T2 · analyzeExpoTickets', () => {
  const batch = [
    { to: 'tokA', data: { bucketKey: 'u1:100' } },
    { to: 'tokB', data: { bucketKey: 'u2:100' } },
    { to: 'tokC' },
  ];

  it('DeviceNotRegistered mapea token + bucket para invalidación', () => {
    const failures = analyzeExpoTickets([
      { status: 'ok' },
      { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok' },
    ], batch);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toEqual({
      token: 'tokB',
      errorCode: 'DeviceNotRegistered',
      errorMessage: 'not registered',
      bucketKey: 'u2:100',
    });
  });

  it('errores sin details.error → Unknown; sin data → bucketKey null', () => {
    const failures = analyzeExpoTickets([
      { status: 'ok' },
      { status: 'ok' },
      { status: 'error', message: 'boom' },
    ], batch);
    expect(failures[0].errorCode).toBe('Unknown');
    expect(failures[0].bucketKey).toBeNull();
  });

  it('todo ok → sin fallos', () => {
    expect(analyzeExpoTickets([{ status: 'ok' }, { status: 'ok' }, { status: 'ok' }], batch)).toHaveLength(0);
  });
});

describe('T2 · tokensToInvalidate', () => {
  it('invalida con >= 3 fallos DeviceNotRegistered; menos no', () => {
    const result = tokensToInvalidate({ tokA: 3, tokB: 2, tokC: 7 });
    expect(result).toContain('tokA');
    expect(result).toContain('tokC');
    expect(result).not.toContain('tokB');
    expect(DEAD_TOKEN_FAILS_TO_INVALIDATE).toBe(3);
  });

  it('sin conteos → vacío', () => {
    expect(tokensToInvalidate({})).toHaveLength(0);
  });
});
