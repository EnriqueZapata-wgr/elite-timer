/**
 * MB-30A P4 — los servicios de sueño contra supabase-fake: no solo el
 * resultado, la FORMA de lo escrito (calls del fake, patrón MB-28A).
 *
 * Contratos amarrados aquí:
 *  - guardarNochePropia escribe con upsert onConflict user_id,night_date
 *    (la propia MANDA) y el payload son solo números/strings/null.
 *  - Sin red, la noche se ENCOLA en el storage local (no se pierde) y
 *    sincronizarPendientes la sube después y vacía la cola.
 *  - importarNoches escribe con ignoreDuplicates (el import NUNCA pisa).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase, type FakeSupabase } from '@/src/services/__tests__/supabase-fake';
import type { NocheDormida } from '../sleep-core';
import { COLA_NOCHES_KEY } from '../sleep-core';

const state = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase,
  kv: new Map<string, string>(),
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ warn: () => {}, log: () => {} }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => state.kv.get(k) ?? null,
    setItem: async (k: string, v: string) => { state.kv.set(k, v); },
    removeItem: async (k: string) => { state.kv.delete(k); },
  },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
// Solo se usa binarioConDelegate/getHealthPlatform de fitness — mock para no
// arrastrar su cadena de imports (electron-service y compañía).
vi.mock('@/src/services/fitness/health-import-service', () => ({
  binarioConDelegate: () => true,
  getHealthPlatform: async () => ({ os: 'android', status: 'disponible', nombre: 'Health Connect' }),
  abrirAjustesHealthConnect: () => {},
}));

import {
  guardarNochePropia,
  sincronizarPendientes,
  hayPendientes,
} from '../sleep-session-service';
import { importarNoches } from '../sleep-import-service';

const NOCHE: NocheDormida = {
  nightDate: '2026-08-09',
  bedTimeISO: '2026-08-09T05:00:00.000Z',
  wakeTimeISO: '2026-08-09T12:30:00.000Z',
  durationMinutes: 450,
  score: 88,
  snoreMinutes: 12,
  source: 'sleep_cycle',
  externalId: null,
};

beforeEach(() => {
  state.kv = new Map();
});

describe('guardarNochePropia', () => {
  it('escribe con upsert onConflict user_id,night_date — la propia MANDA', async () => {
    state.fake = makeFakeSupabase({ sleep_nights: { data: null, error: null } });
    const res = await guardarNochePropia('user-1', NOCHE);
    expect(res).toEqual({ ok: true, encolada: false });
    const upsert = state.fake.calls.find((c) => c.method === 'upsert');
    expect(upsert, 'no hubo upsert a sleep_nights').toBeTruthy();
    expect(upsert!.table).toBe('sleep_nights');
    expect(upsert!.args[1]).toEqual({ onConflict: 'user_id,night_date' });
    // El payload es SOLO números/strings/null (jamás un buffer de audio).
    const row = upsert!.args[0] as Record<string, unknown>;
    expect(row.user_id).toBe('user-1');
    expect(row.night_date).toBe('2026-08-09');
    expect(row.source).toBe('sleep_cycle');
    for (const [k, v] of Object.entries(row)) {
      expect(
        v === null || typeof v === 'number' || typeof v === 'string',
        `campo ${k} con tipo sospechoso`,
      ).toBe(true);
    }
  });

  it('sin red la noche se ENCOLA local y hayPendientes la cuenta', async () => {
    state.fake = makeFakeSupabase({
      sleep_nights: { data: null, error: { message: 'network request failed' } },
    });
    const res = await guardarNochePropia('user-1', NOCHE);
    expect(res).toEqual({ ok: true, encolada: true });
    expect(state.kv.get(COLA_NOCHES_KEY)).toContain('2026-08-09');
    expect(await hayPendientes()).toBe(1);
  });

  it('al volver la red, sincronizarPendientes sube y vacía la cola', async () => {
    state.kv.set(COLA_NOCHES_KEY, JSON.stringify([NOCHE]));
    state.fake = makeFakeSupabase({ sleep_nights: { data: null, error: null } });
    const subidas = await sincronizarPendientes('user-1');
    expect(subidas).toBe(1);
    expect(await hayPendientes()).toBe(0);
    // Y subió por el MISMO camino que manda (upsert de la propia).
    const upsert = state.fake.calls.find((c) => c.method === 'upsert');
    expect(upsert!.args[1]).toEqual({ onConflict: 'user_id,night_date' });
  });

  it('si la subida vuelve a fallar, la cola NO se vacía', async () => {
    state.kv.set(COLA_NOCHES_KEY, JSON.stringify([NOCHE]));
    state.fake = makeFakeSupabase({
      sleep_nights: { data: null, error: { message: 'sigue sin red' } },
    });
    expect(await sincronizarPendientes('user-1')).toBe(0);
    expect(await hayPendientes()).toBe(1);
  });
});

describe('importarNoches', () => {
  it('escribe con ignoreDuplicates — el import NUNCA pisa una noche', async () => {
    state.fake = makeFakeSupabase({
      sleep_nights: { data: [{ night_date: '2026-08-09' }], error: null },
    });
    const res = await importarNoches('user-1', [
      {
        nightDate: '2026-08-09',
        bedTimeISO: '2026-08-09T05:00:00.000Z',
        wakeTimeISO: '2026-08-09T12:00:00.000Z',
        durationMinutes: 400,
        source: 'health_connect',
        externalId: 'hc-1',
      },
    ]);
    expect(res.ok).toBe(true);
    expect(res.importadas).toBe(1);
    const upsert = state.fake.calls.find((c) => c.method === 'upsert');
    expect(upsert!.table).toBe('sleep_nights');
    expect(upsert!.args[1]).toEqual({ onConflict: 'user_id,night_date', ignoreDuplicates: true });
    // El import no inventa lo que no midió.
    const rows = upsert!.args[0] as Record<string, unknown>[];
    expect(rows[0].score).toBeNull();
    expect(rows[0].snore_minutes).toBeNull();
  });

  it('un {error} 4xx NO pasa de largo (supabase-js no lanza): ok=false', async () => {
    state.fake = makeFakeSupabase({
      sleep_nights: { data: null, error: { message: 'violates check constraint' } },
    });
    const res = await importarNoches('user-1', [
      {
        nightDate: '2026-08-09',
        bedTimeISO: '2026-08-09T05:00:00.000Z',
        wakeTimeISO: '2026-08-09T12:00:00.000Z',
        durationMinutes: 400,
        source: 'health_connect',
        externalId: 'hc-1',
      },
    ]);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('check');
  });
});
