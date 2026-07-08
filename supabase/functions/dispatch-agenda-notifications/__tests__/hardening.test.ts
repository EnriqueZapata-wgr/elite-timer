import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_RETRY,
  isRetryableStatus,
  sendPushBatchWithRetry,
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
