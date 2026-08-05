/**
 * MB-22.1 P1+P4 — la fuga que ya nos mordió, enterrada con test.
 *
 * getCycleReport consultaba cycle_daily_logs sin gate. Era inofensivo hasta
 * que MB-22 abrió el modo acompañante: los días de periodo, energía y humor
 * del calendario de OTRA persona aparecían como métricas del usuario en sus
 * reportes. El patrón: código inofensivo que se vuelve peligroso porque
 * cambió quién puede llegar a él.
 */
import { describe, it, expect, vi } from 'vitest';
import { makeFakeSupabase, type FakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({
  fake: null as any,
  mode: (async () => null) as (...args: unknown[]) => Promise<unknown>,
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (t: string) => state.fake.from(t),
    auth: { getUser: () => state.fake.auth.getUser() },
  },
}));
vi.mock('@/src/lib/logger', () => ({
  log: () => {}, warn: () => {}, error: () => {},
}));
vi.mock('@/src/services/app-mode-service', () => ({
  getCycleAppMode: (...args: unknown[]) => state.mode(...args),
  setCycleAppMode: async () => ({ ok: true }),
}));

import { getCycleReport } from '@/src/services/reports-service';

const LOGS = [
  { is_period: true, energy: 4, mood: 3 },
  { is_period: true, energy: 2, mood: 5 },
  { is_period: false, energy: null, mood: null },
];

function setup(sex: string | null, mode: 'propio' | 'acompanante' | null): FakeSupabase {
  const fake = makeFakeSupabase({
    client_profiles: { data: sex ? { biological_sex: sex } : null, error: null },
    cycle_daily_logs: { data: LOGS, error: null },
  });
  state.fake = fake;
  state.mode = async () => mode;
  return fake;
}

describe('getCycleReport — gate de la sección Ciclo de /reports', () => {
  it('female propio: agrega y devuelve métricas', async () => {
    setup('female', 'propio');
    const r = await getCycleReport('month');
    expect(r.logsCount).toBe(3);
    expect(r.periodDays).toBe(2);
    expect(r.avgEnergy).toBe(3);
    expect(r.avgMood).toBe(4);
  });

  it('ACOMPAÑANTE: reporte vacío y NI SIQUIERA consulta cycle_daily_logs', async () => {
    // logsCount 0 → reports.tsx no pinta la sección Ciclo. El ciclo de otra
    // persona jamás aparece como métrica del usuario.
    const fake = setup('female', 'acompanante');
    const r = await getCycleReport('month');
    expect(r).toEqual({ periodDays: 0, avgEnergy: 0, avgMood: 0, logsCount: 0 });
    expect(fake.queried).not.toContain('cycle_daily_logs');
  });

  it('male (con o sin logs residuales): vacío, sin tocar cycle_daily_logs', async () => {
    const fake = setup('male', 'acompanante');
    const r = await getCycleReport('week');
    expect(r.logsCount).toBe(0);
    expect(fake.queried).not.toContain('cycle_daily_logs');
  });
});
