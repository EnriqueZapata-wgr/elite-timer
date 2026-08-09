/**
 * MB-29 P6.3 — ningún laboratorio se pisa al subir uno nuevo.
 *
 * lab_values es serie en el tiempo APPEND-ONLY: la escritura es upsert con
 * ignoreDuplicates (el duplicado exacto se ignora, jamás se sobreescribe) y
 * nunca hay UPDATE/DELETE de valores en el camino de captura. Es dato
 * médico de la persona: la mutación que cambie ignoreDuplicates a false
 * (pisar el mismo día) o que convierta la escritura en update truena aquí.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase } from '@/src/services/__tests__/supabase-fake';

const state = vi.hoisted(() => ({ fake: null as any }));

vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));

import {
  insertCanonicalBiomarkers,
  insertLabValuesFromRaw,
} from '@/src/services/edad-atp/lab-values-service';

beforeEach(() => {
  state.fake = makeFakeSupabase({ lab_values: { data: null, error: null } });
});

function escriturasLabValues() {
  return state.fake.calls.filter((c: any) => c.table === 'lab_values');
}

describe('insertCanonicalBiomarkers (captura manual)', () => {
  it('escribe con upsert + ignoreDuplicates: el histórico jamás se pisa', async () => {
    const r = await insertCanonicalBiomarkers(
      'u1',
      [{ parameter_key: 'hba1c', value: 5.8, unit: '%' }],
      { source: 'manual' },
    );
    expect(r.ok).toBe(true);
    const upserts = escriturasLabValues().filter((c: any) => c.method === 'upsert');
    expect(upserts).toHaveLength(1);
    const [rows, opts] = upserts[0].args as [any[], any];
    // La forma del write ES el contrato: conflicto por (user, param, fecha,
    // fuente) y el duplicado SE IGNORA (no pisa el valor previo del día).
    expect(opts).toEqual({ onConflict: 'user_id,parameter_key,measured_at,source', ignoreDuplicates: true });
    // hba1c se guarda en decimal (conversión UNA vez, en el borde de escritura).
    expect(rows[0].value).toBeCloseTo(0.058);
    expect(rows[0].parameter_key).toBe('hba1c');
  });

  it('jamás emite update ni delete sobre lab_values', async () => {
    await insertCanonicalBiomarkers('u1', [{ parameter_key: 'glucose', value: 95 }], { source: 'manual' });
    const metodos = escriturasLabValues().map((c: any) => c.method);
    expect(metodos).not.toContain('update');
    expect(metodos).not.toContain('delete');
  });
});

describe('insertLabValuesFromRaw (PDF/foto parseado)', () => {
  it('mismo contrato append-only que la captura manual', async () => {
    const r = await insertLabValuesFromRaw('u1', { glucose: 101 }, { source: 'upload_extract', measuredAt: '2026-08-01' });
    expect(r.ok).toBe(true);
    const upserts = escriturasLabValues().filter((c: any) => c.method === 'upsert');
    expect(upserts).toHaveLength(1);
    const [, opts] = upserts[0].args as [any[], any];
    expect(opts).toEqual({ onConflict: 'user_id,parameter_key,measured_at,source', ignoreDuplicates: true });
    const metodos = escriturasLabValues().map((c: any) => c.method);
    expect(metodos).not.toContain('update');
    expect(metodos).not.toContain('delete');
  });

  it('el {error} de Postgres no se traga: ok false y el caller se entera', async () => {
    state.fake = makeFakeSupabase({ lab_values: { data: null, error: { message: 'RLS' } } });
    const r = await insertLabValuesFromRaw('u1', { glucose: 101 }, { source: 'upload_extract' });
    expect(r.ok).toBe(false);
  });
});
