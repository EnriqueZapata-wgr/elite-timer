/**
 * Sueño unificado (20-sep-2026) — el servicio contra supabase-fake.
 *
 * Contratos amarrados aquí:
 *  - leerNochesUnificadas consulta LAS DOS tablas (sleep_nights y
 *    health_os_daily) y devuelve la unión; un {error} en sleep_nights es
 *    ok:false ("no pude leer", no "no hay noches"); un {error} solo en
 *    health_os_daily degrada a ok:true + parcial:'telefono' (A4).
 *  - reconciliarSuenoSilencioso no escribe nada sin permiso ni con la
 *    lectura apagada por la persona (A2), un permiso que no contestó es
 *    lectura_fallida y no sin_permiso (A1), el respiro es por cuenta (A3), y
 *    con permiso escribe por importarNoches y avisa a HOY.
 *
 * Nota: este archivo usa vi.mock, así que corre con vitest (npm test), no con
 * el runner de emergencia sin vitest. El núcleo puro sí corre en los dos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase, type FakeSupabase } from '@/src/services/__tests__/supabase-fake';

const state = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase,
  emitidos: [] as string[],
  invalidaciones: 0,
  plataforma: { os: 'android', status: 'disponible', nombre: 'Health Connect' } as {
    os: 'android' | 'ios' | 'otro';
    status: 'disponible' | 'sin_app' | 'binario_viejo' | 'no_soportado';
    nombre: string;
  },
  permiso: 'si' as 'si' | 'no' | 'no_contesto',
  apagado: false,
  lectura: { ok: true, noches: [] } as { ok: true; noches: unknown[] } | { ok: false },
  importados: [] as unknown[][],
  importResultado: { ok: true, importadas: 0 } as { ok: boolean; importadas: number; error?: string },
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ warn: () => {}, log: () => {}, error: () => {} }));
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  DeviceEventEmitter: { emit: (e: string) => { state.emitidos.push(e); } },
}));
vi.mock('@/src/hooks/useWearableToday', () => ({
  invalidarSaludDelDia: () => { state.invalidaciones += 1; },
}));
vi.mock('@/src/services/fitness/health-import-service', () => ({
  getHealthPlatform: async () => state.plataforma,
}));
vi.mock('@/src/services/health/health-platform-service', () => ({
  lecturaSaludApagadaPorUsuario: async () => state.apagado,
}));
vi.mock('../sleep-import-service', () => ({
  lecturaSuenoSinDialogoPosible: async () => state.permiso,
  leerNochesDeSaludResultado: async () => state.lectura,
  importarNoches: async (_userId: string, noches: unknown[]) => {
    state.importados.push(noches);
    return state.importResultado;
  },
}));

import { leerNochesUnificadas, reconciliarSuenoSilencioso } from '../sueno-unificado-service';

const NOCHE_HC = {
  nightDate: '2026-09-19',
  bedTimeISO: '2026-09-19T05:00:00.000Z',
  wakeTimeISO: '2026-09-19T12:00:00.000Z',
  durationMinutes: 420,
  source: 'health_connect',
  externalId: 'hc-1',
};

beforeEach(() => {
  state.emitidos = [];
  state.invalidaciones = 0;
  state.plataforma = { os: 'android', status: 'disponible', nombre: 'Health Connect' };
  state.permiso = 'si';
  state.apagado = false;
  state.lectura = { ok: true, noches: [] };
  state.importados = [];
  state.importResultado = { ok: true, importadas: 0 };
});

describe('leerNochesUnificadas', () => {
  it('consulta las dos tablas y devuelve la unión (misma fecha: manda sleep_nights)', async () => {
    state.fake = makeFakeSupabase({
      sleep_nights: {
        data: [{ night_date: '2026-09-19', bed_time: null, wake_time: null, duration_minutes: 431, score: 80, snore_minutes: 0, source: 'sleep_cycle' }],
        error: null,
      },
      health_os_daily: {
        data: [
          { date: '2026-09-19', sleep_minutes: 999 },
          { date: '2026-09-18', sleep_minutes: 455 },
        ],
        error: null,
      },
    });
    const r = await leerNochesUnificadas('user-1', 14);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(state.fake.queried).toContain('sleep_nights');
    expect(state.fake.queried).toContain('health_os_daily');
    expect(r.noches.map((n) => [n.nightDate, n.durationMinutes, n.fuente])).toEqual([
      ['2026-09-19', 431, 'sleep_cycle'],
      ['2026-09-18', 455, 'telefono'],
    ]);
    // La ventana se pide a la base (gte), no se filtra después en memoria.
    expect(state.fake.calls.some((c) => c.table === 'sleep_nights' && c.method === 'gte')).toBe(true);
    expect(state.fake.calls.some((c) => c.table === 'health_os_daily' && c.method === 'gte')).toBe(true);
  });

  it('las dos tablas vacías es ok:true con [] ("no hay"), no un fallo', async () => {
    state.fake = makeFakeSupabase({
      sleep_nights: { data: [], error: null },
      health_os_daily: { data: [], error: null },
    });
    expect(await leerNochesUnificadas('user-1', 7)).toEqual({ ok: true, noches: [] });
  });

  it('un {error} en sleep_nights es ok:false con motivo lectura ("no pude leer")', async () => {
    state.fake = makeFakeSupabase({
      sleep_nights: { data: null, error: { message: 'relation does not exist' } },
      health_os_daily: { data: [{ date: '2026-09-18', sleep_minutes: 455 }], error: null },
    });
    expect(await leerNochesUnificadas('user-1', 7)).toEqual({ ok: false, motivo: 'lectura' });
  });

  it('A4: si solo falla health_os_daily, salen las noches guardadas y se marca parcial', async () => {
    state.fake = makeFakeSupabase({
      sleep_nights: { data: [{ night_date: '2026-09-19', duration_minutes: 431, source: 'sleep_cycle' }], error: null },
      health_os_daily: { data: null, error: { message: 'relation does not exist' } },
    });
    const r = await leerNochesUnificadas('user-1', 7);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parcial).toBe('telefono');
    expect(r.noches.map((n) => [n.nightDate, n.fuente])).toEqual([['2026-09-19', 'sleep_cycle']]);
  });

  it('con las dos tablas bien no hay marca parcial', async () => {
    state.fake = makeFakeSupabase({
      sleep_nights: { data: [], error: null },
      health_os_daily: { data: [], error: null },
    });
    const r = await leerNochesUnificadas('user-1', 7);
    expect(r.ok && r.parcial).toBeUndefined();
  });

  it('sin usuario no se consulta nada y es ok:false con motivo sin_usuario', async () => {
    state.fake = makeFakeSupabase({});
    expect(await leerNochesUnificadas('', 7)).toEqual({ ok: false, motivo: 'sin_usuario' });
    expect(state.fake.queried).toEqual([]);
  });
});

describe('reconciliarSuenoSilencioso', () => {
  it('sin permiso de sueño no lee ni escribe nada (y no pide el permiso)', async () => {
    state.fake = makeFakeSupabase({});
    state.permiso = 'no';
    const r = await reconciliarSuenoSilencioso('user-1', { forzar: true });
    expect(r).toEqual({ motivo: 'sin_permiso', importadas: 0 });
    expect(state.importados).toEqual([]);
    expect(state.emitidos).toEqual([]);
  });

  it('A1: un permiso que no contestó es lectura_fallida, no sin_permiso, y no marca respiro', async () => {
    state.fake = makeFakeSupabase({});
    state.permiso = 'no_contesto';
    const r = await reconciliarSuenoSilencioso('user-a1', { forzar: true });
    expect(r).toEqual({ motivo: 'lectura_fallida', importadas: 0 });
    expect(state.importados).toEqual([]);
    // Sin respiro marcado: el siguiente foco vuelve a intentar.
    state.permiso = 'si';
    expect((await reconciliarSuenoSilencioso('user-a1')).motivo).toBe('nada_nuevo');
  });

  it('A2: con la lectura apagada por la persona se sale antes de tocar la plataforma', async () => {
    state.fake = makeFakeSupabase({});
    state.apagado = true;
    state.lectura = { ok: true, noches: [NOCHE_HC] };
    const r = await reconciliarSuenoSilencioso('user-a2', { forzar: true });
    expect(r).toEqual({ motivo: 'apagado_por_usuario', importadas: 0 });
    expect(state.importados).toEqual([]);
    expect(state.emitidos).toEqual([]);
    // Sin respiro marcado: al volver a conectar corre de una.
    state.apagado = false;
    state.importResultado = { ok: true, importadas: 1 };
    expect((await reconciliarSuenoSilencioso('user-a2')).motivo).toBe('importadas');
  });

  it('sin plataforma disponible se sale antes de mirar el permiso', async () => {
    state.fake = makeFakeSupabase({});
    state.plataforma = { os: 'android', status: 'sin_app', nombre: 'Health Connect' };
    const r = await reconciliarSuenoSilencioso('user-1', { forzar: true });
    expect(r.motivo).toBe('sin_plataforma');
    expect(state.importados).toEqual([]);
  });

  it('lectura fallida se reporta como fallo, no como "nada nuevo"', async () => {
    state.fake = makeFakeSupabase({});
    state.lectura = { ok: false };
    const r = await reconciliarSuenoSilencioso('user-1', { forzar: true });
    expect(r.motivo).toBe('lectura_fallida');
    expect(state.importados).toEqual([]);
  });

  it('con permiso y noches nuevas: escribe por importarNoches y avisa a HOY', async () => {
    state.fake = makeFakeSupabase({});
    state.lectura = { ok: true, noches: [NOCHE_HC] };
    state.importResultado = { ok: true, importadas: 1 };
    const r = await reconciliarSuenoSilencioso('user-1', { forzar: true });
    expect(r).toEqual({ motivo: 'importadas', importadas: 1 });
    expect(state.importados).toEqual([[NOCHE_HC]]);
    expect(state.invalidaciones).toBe(1);
    expect(state.emitidos).toEqual(['day_changed']);
  });

  it('con permiso y nada nuevo: no avisa a HOY (nada cambió)', async () => {
    state.fake = makeFakeSupabase({});
    state.lectura = { ok: true, noches: [NOCHE_HC] };
    state.importResultado = { ok: true, importadas: 0 };
    const r = await reconciliarSuenoSilencioso('user-1', { forzar: true });
    expect(r).toEqual({ motivo: 'nada_nuevo', importadas: 0 });
    expect(state.emitidos).toEqual([]);
  });

  it('el respiro frena la segunda corrida seguida (sin forzar)', async () => {
    state.fake = makeFakeSupabase({});
    state.lectura = { ok: true, noches: [] };
    const primera = await reconciliarSuenoSilencioso('user-1', { forzar: true });
    expect(primera.motivo).toBe('nada_nuevo');
    const segunda = await reconciliarSuenoSilencioso('user-1');
    expect(segunda.motivo).toBe('muy_pronto');
  });

  it('A3: el respiro es por cuenta: la cuenta nueva corre aunque la anterior acabe de correr', async () => {
    state.fake = makeFakeSupabase({});
    state.lectura = { ok: true, noches: [] };
    expect((await reconciliarSuenoSilencioso('user-a3-uno', { forzar: true })).motivo).toBe('nada_nuevo');
    expect((await reconciliarSuenoSilencioso('user-a3-uno')).motivo).toBe('muy_pronto');
    expect((await reconciliarSuenoSilencioso('user-a3-dos')).motivo).toBe('nada_nuevo');
  });
});
