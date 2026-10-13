/**
 * Vitales service (13-oct-2026) contra supabase-fake.
 *
 * Contratos amarrados aquí: antes de la 344 (columna inexistente) es
 * { ok: true, disponible: false }; un error real es { ok: false, motivo:
 * 'lectura' } y nunca "no hay datos"; sin usuario no se consulta nada.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase, type FakeSupabase } from '@/src/services/__tests__/supabase-fake';

const state = vi.hoisted(() => ({ fake: null as unknown as FakeSupabase }));

vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ warn: () => {}, log: () => {}, error: () => {} }));

import { leerVitales } from '../vitales-service';
import { _reiniciarBase344, base344ConocidaAusente, marcarBase344Ausente } from '../base-344-estado';

beforeEach(() => _reiniciarBase344());

describe('leerVitales', () => {
  it('lee health_os_daily, las últimas N filas, y resume por métrica', async () => {
    state.fake = makeFakeSupabase({
      health_os_daily: {
        data: [{ date: '2026-10-12', hrv_ms: 55, source: 'oura', field_sources: { hrv_ms: 'oura' } }],
        error: null,
      },
    });
    const r = await leerVitales('user-1', 14);
    expect(r.ok).toBe(true);
    if (!r.ok || !r.disponible) throw new Error('debía estar disponible');
    expect(r.metricas.map((m) => [m.clave, m.valor, m.fuente, m.metodo])).toEqual([['hrv_rmssd', 55, 'oura', 'rmssd']]);
    expect(state.fake.calls.some((c) => c.table === 'health_os_daily' && c.method === 'limit' && c.args[0] === 14)).toBe(true);
    expect(state.fake.calls.some((c) => c.method === 'eq' && c.args[0] === 'user_id' && c.args[1] === 'user-1')).toBe(true);
    // Piso de fecha además del límite: un día de hace meses no es "el último valor".
    expect(state.fake.calls.some((c) => c.table === 'health_os_daily' && c.method === 'gte' && c.args[0] === 'date')).toBe(true);
  });

  it('sin filas es disponible con métricas vacías ("no hay datos")', async () => {
    state.fake = makeFakeSupabase({ health_os_daily: { data: [], error: null } });
    expect(await leerVitales('user-1')).toEqual({ ok: true, disponible: true, metricas: [], filasLeidas: 0 });
  });

  it('antes de la 344 (columna inexistente) es ok:true, disponible:false', async () => {
    state.fake = makeFakeSupabase({
      health_os_daily: { data: null, error: { code: '42703', message: 'column health_os_daily.hrv_ms does not exist' } },
    });
    expect(await leerVitales('user-1')).toEqual({ ok: true, disponible: false });
    // Y avisa a los demás lectores.
    expect(base344ConocidaAusente()).toBe(true);
  });

  it('si ya se sabe que la base no tiene la 344, no se pide nada', async () => {
    state.fake = makeFakeSupabase({ health_os_daily: { data: [], error: null } });
    marcarBase344Ausente();
    expect(await leerVitales('user-1')).toEqual({ ok: true, disponible: false });
    expect(state.fake.queried).toEqual([]);
  });

  it('una columna faltante que NO es de la 344 es fallo de lectura, no "base vieja"', async () => {
    state.fake = makeFakeSupabase({
      health_os_daily: { data: null, error: { code: '42703', message: 'column health_os_daily.algo_raro does not exist' } },
    });
    expect(await leerVitales('user-1')).toEqual({ ok: false, motivo: 'lectura' });
    expect(base344ConocidaAusente()).toBe(false);
  });

  it('un error real es ok:false con motivo lectura, nunca "no hay datos"', async () => {
    state.fake = makeFakeSupabase({ health_os_daily: { data: null, error: { message: 'timeout' } } });
    expect(await leerVitales('user-1')).toEqual({ ok: false, motivo: 'lectura' });
  });

  it('sin usuario no consulta nada', async () => {
    state.fake = makeFakeSupabase({});
    expect(await leerVitales('')).toEqual({ ok: false, motivo: 'sin_usuario' });
    expect(state.fake.queried).toEqual([]);
  });
});
