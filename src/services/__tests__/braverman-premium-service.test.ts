import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * #143 — cobro H+ del Braverman PREMIUM. Se mockea el perímetro completo
 * (supabase arrastra react-native y no carga en node; el resto para aislar).
 */

const state = vi.hoisted(() => ({
  bravermanResult: null as Record<string, unknown> | null,
  cachedReport: null as { report_markdown: string } | null,
  inserted: [] as { table: string; rows: unknown }[],
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      Object.assign(chain, {
        select: self, eq: self, order: self, limit: self,
        maybeSingle: async () => {
          if (table === 'braverman_results') return { data: state.bravermanResult, error: null };
          if (table === 'braverman_premium_reports') return { data: state.cachedReport, error: null };
          return { data: null, error: null };
        },
        insert: async (rows: unknown) => {
          state.inserted.push({ table, rows });
          return { error: null };
        },
      });
      return chain;
    },
  },
}));

vi.mock('../anthropic-client', () => ({ callAnthropic: vi.fn() }));
vi.mock('../argos-service', () => ({ getArgosCallMetadata: vi.fn(async () => ({})) }));
vi.mock('../client-profile-service', () => ({ getClientProfile: vi.fn(async () => null) }));
vi.mock('../economy/proton-service', () => ({
  getActionCost: vi.fn(async () => 1000),
  getProtonBalance: vi.fn(async () => ({ current_protons: 5000 })),
  spendProtons: vi.fn(),
}));

import { callAnthropic } from '../anthropic-client';
import { getProtonBalance, spendProtons } from '../economy/proton-service';
import {
  BRAVERMAN_PREMIUM_ACTION_KEY,
  generateBravermanPremiumReport,
  getBravermanPremiumQuote,
} from '../braverman-premium-service';

const RESULT_ROW = {
  id: 'res-1',
  dominance_dopamine: 40, dominance_acetylcholine: 20, dominance_gaba: 10, dominance_serotonin: 10,
  dominant_type: 'dopamine',
  deficiency_dopamine: 5, deficiency_acetylcholine: 5, deficiency_gaba: 20, deficiency_serotonin: 10,
  primary_deficiency: 'gaba', deficiency_level: null, completed_at: '2026-07-01T00:00:00Z',
};

const spendMock = vi.mocked(spendProtons);
const llmMock = vi.mocked(callAnthropic);

beforeEach(() => {
  vi.clearAllMocks();
  state.bravermanResult = { ...RESULT_ROW };
  state.cachedReport = null;
  state.inserted = [];
  spendMock.mockResolvedValue({ success: true, newBalance: 4000 });
  llmMock.mockResolvedValue({ content: [{ text: '## Reporte generado' }] });
});

describe('#143 · generateBravermanPremiumReport — cobro H+', () => {
  it('sin test completo → no_test y NO cobra', async () => {
    state.bravermanResult = null;
    const r = await generateBravermanPremiumReport('u1');
    expect(r).toEqual({ status: 'no_test' });
    expect(spendMock).not.toHaveBeenCalled();
  });

  it('cache hit → gratis (no cobra, no LLM) y cached: true', async () => {
    state.cachedReport = { report_markdown: '## Cacheado' };
    const r = await generateBravermanPremiumReport('u1');
    expect(r).toEqual({ status: 'ok', markdown: '## Cacheado', cached: true });
    expect(spendMock).not.toHaveBeenCalled();
    expect(llmMock).not.toHaveBeenCalled();
  });

  it('balance insuficiente → status insufficient_h_plus con required + balance, sin LLM', async () => {
    spendMock.mockResolvedValue({ success: false, newBalance: 200, error: 'insufficient_protons' });
    const r = await generateBravermanPremiumReport('u1');
    expect(r).toEqual({ status: 'insufficient_h_plus', required: 1000, balance: 200 });
    expect(llmMock).not.toHaveBeenCalled();
  });

  it('error genérico del spend → status error con message', async () => {
    spendMock.mockResolvedValue({ success: false, newBalance: 0, error: 'forbidden' });
    const r = await generateBravermanPremiumReport('u1');
    expect(r).toEqual({ status: 'error', message: 'forbidden' });
    expect(llmMock).not.toHaveBeenCalled();
  });

  it('cobro exitoso → spend con idempotency_key por resultado → LLM → cache → ok', async () => {
    const r = await generateBravermanPremiumReport('u1');
    expect(spendMock).toHaveBeenCalledWith('u1', 1000, BRAVERMAN_PREMIUM_ACTION_KEY, {
      idempotency_key: 'braverman-premium-res-1',
      braverman_result_id: 'res-1',
    });
    expect(llmMock).toHaveBeenCalledTimes(1);
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0].table).toBe('braverman_premium_reports');
    expect(r).toEqual({ status: 'ok', markdown: '## Reporte generado', cached: false });
  });

  it('la idempotency_key es estable entre llamadas del mismo resultado (anti doble cobro)', async () => {
    await generateBravermanPremiumReport('u1');
    await generateBravermanPremiumReport('u1');
    const keys = spendMock.mock.calls.map((c) => (c[3] as any).idempotency_key);
    expect(keys[0]).toBe(keys[1]);
  });

  it('LLM falla tras el cobro → error; el retry (spend idempotente) regenera GRATIS', async () => {
    llmMock.mockRejectedValueOnce(new Error('ARGOS_TIMEOUT'));
    const first = await generateBravermanPremiumReport('u1');
    expect(first.status).toBe('error');
    expect(state.inserted).toHaveLength(0); // sin cache: el retry puede regenerar

    // retry: spend devuelve success idempotente (el server no vuelve a debitar)
    spendMock.mockResolvedValue({ success: true, newBalance: 4000 });
    const second = await generateBravermanPremiumReport('u1');
    expect(second.status).toBe('ok');
    expect(llmMock).toHaveBeenCalledTimes(2);
  });
});

describe('#143 · getBravermanPremiumQuote', () => {
  it('quote completo: cost + balance + flags', async () => {
    const q = await getBravermanPremiumQuote('u1');
    expect(q).toEqual({ cost: 1000, balance: 5000, hasCachedReport: false, hasCompletedTest: true });
  });

  it('con cache → hasCachedReport true; sin test → hasCompletedTest false', async () => {
    state.cachedReport = { report_markdown: 'x' };
    expect((await getBravermanPremiumQuote('u1')).hasCachedReport).toBe(true);
    state.bravermanResult = null;
    state.cachedReport = null;
    expect((await getBravermanPremiumQuote('u1')).hasCompletedTest).toBe(false);
  });

  it('balance null (cold start #134) se propaga como null, no como 0', async () => {
    vi.mocked(getProtonBalance).mockResolvedValueOnce(null as any);
    expect((await getBravermanPremiumQuote('u1')).balance).toBeNull();
  });
});
