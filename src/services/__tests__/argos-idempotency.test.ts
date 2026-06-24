import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * #71 — Idempotency doble cobro ARGOS. Tests del lado CLIENTE: que la idempotency_key sea un
 * uuid v4 estable (generateUUID) y que se transporte en el body del proxy (callAnthropic) sólo
 * cuando existe (bw compat). La atomicidad del cobro (spend_protons v2) vive en SQL (migración
 * 094) y la generación por intent en getArgosCallMetadata; el transporte real es este body.
 */

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' } } },
}));

import { callAnthropic } from '@/src/services/anthropic-client';
import { generateUUID } from '@/src/utils/uuid';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mockFetch() {
  const calls: any[] = [];
  global.fetch = vi.fn(async (_url: any, init: any) => {
    calls.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'ok' }] }) } as any;
  }) as any;
  return calls;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('generateUUID — idempotency key source', () => {
  it('produce un uuid v4 válido', () => {
    expect(generateUUID()).toMatch(UUID_RE);
  });
  it('dos llamadas → keys distintas (operaciones distintas no colisionan)', () => {
    expect(generateUUID()).not.toBe(generateUUID());
  });
});

describe('callAnthropic — transporte de idempotency_key', () => {
  it('incluye idempotency_key cuando la metadata la trae', async () => {
    const calls = mockFetch();
    await callAnthropic([{ role: 'user', content: 'hola' }], 100, 'm', undefined, {
      userId: 'u1', requestType: 'chat', idempotencyKey: 'k-abc',
    });
    expect(calls[0].idempotency_key).toBe('k-abc');
  });

  it('NO incluye idempotency_key si la metadata no la trae (bw compat apps viejas)', async () => {
    const calls = mockFetch();
    await callAnthropic([{ role: 'user', content: 'hola' }], 100, 'm', undefined, { userId: 'u1', requestType: 'chat' });
    expect('idempotency_key' in calls[0]).toBe(false);
  });

  it('mismo intent (misma key reusada) → MISMA idempotency_key en 2 requests → server dedup', async () => {
    const calls = mockFetch();
    const key = 'turn-1';
    await callAnthropic([{ role: 'user', content: 'a' }], 100, 'm', undefined, { userId: 'u1', requestType: 'chat', idempotencyKey: key });
    await callAnthropic([{ role: 'user', content: 'a' }], 100, 'm', undefined, { userId: 'u1', requestType: 'chat', idempotencyKey: key });
    expect(calls[0].idempotency_key).toBe('turn-1');
    expect(calls[1].idempotency_key).toBe('turn-1');
  });
});
