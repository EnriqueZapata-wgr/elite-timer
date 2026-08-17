import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * #143 — Braverman PREMIUM. Se mockea el perímetro completo (supabase arrastra
 * react-native y no carga en node; el resto para aislar).
 *
 * PREMIUM (16-ago-2026): este archivo era el guardián del COBRO (1,000 H+ antes
 * del LLM, idempotencia contra el doble cargo, desenlace de saldo insuficiente).
 * El cobro se fue con la moneda, así que los tests se reapuntan a lo que sigue
 * importando y ahora importa MÁS: que el reporte no se genere dos veces, que el
 * cache mande, y que nada del flujo hable de saldo.
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

// HOTFIX Sonnet 5: el servicio ahora usa extractResponseText (helper puro) —
// se re-exporta el real desde el core para que el parse siga siendo el de prod.
vi.mock('../anthropic-client', async () => {
  const { extractResponseText } = await import('../anthropic-response-core');
  return { callAnthropic: vi.fn(), extractResponseText };
});
vi.mock('../argos-service', () => ({ getArgosCallMetadata: vi.fn(async () => ({})) }));
vi.mock('../client-profile-service', () => ({ getClientProfile: vi.fn(async () => null) }));
import { callAnthropic } from '../anthropic-client';
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

const llmMock = vi.mocked(callAnthropic);

beforeEach(() => {
  vi.clearAllMocks();
  state.bravermanResult = { ...RESULT_ROW };
  state.cachedReport = null;
  state.inserted = [];
  // Shape real de Anthropic (incluye bloque thinking de Sonnet 5 adaptive).
  llmMock.mockResolvedValue({
    content: [
      { type: 'thinking', thinking: 'razonando…' },
      { type: 'text', text: '## Reporte generado' },
    ],
  });
});

describe('#143 · generateBravermanPremiumReport — sin cobro, con cache', () => {
  it('sin test completo → no_test y NO llama al modelo', async () => {
    state.bravermanResult = null;
    const r = await generateBravermanPremiumReport('u1');
    expect(r).toEqual({ status: 'no_test' });
    expect(llmMock).not.toHaveBeenCalled();
  });

  it('cache hit → devuelve lo guardado sin volver a llamar al modelo', async () => {
    state.cachedReport = { report_markdown: '## Cacheado' };
    const r = await generateBravermanPremiumReport('u1');
    expect(r).toEqual({ status: 'ok', markdown: '## Cacheado', cached: true });
    expect(llmMock).not.toHaveBeenCalled();
  });

  it('primera vez → LLM una sola vez → cache → ok', async () => {
    const r = await generateBravermanPremiumReport('u1');
    expect(llmMock).toHaveBeenCalledTimes(1);
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0].table).toBe('braverman_premium_reports');
    expect(r).toEqual({ status: 'ok', markdown: '## Reporte generado', cached: false });
  });

  it('PREMIUM: el reporte YA NO puede terminar en "te falta saldo"', async () => {
    // El desenlace 'insufficient_h_plus' se borró del tipo. Se comprueba en el
    // camino real: con test completo y sin cache, el único final es 'ok'.
    const r = await generateBravermanPremiumReport('u1');
    expect(r.status).toBe('ok');
  });

  it('el action_key sobrevive: el proxy lo usa para rutear modelo y telemetría', () => {
    // Ya no es una clave de precio, pero sigue identificando la llamada.
    expect(BRAVERMAN_PREMIUM_ACTION_KEY).toBeTruthy();
  });

  it('LLM falla → error SIN cachear, para que el retry pueda regenerar', async () => {
    llmMock.mockRejectedValueOnce(new Error('ARGOS_TIMEOUT'));
    const first = await generateBravermanPremiumReport('u1');
    expect(first.status).toBe('error');
    expect(state.inserted).toHaveLength(0);

    const second = await generateBravermanPremiumReport('u1');
    expect(second.status).toBe('ok');
    expect(llmMock).toHaveBeenCalledTimes(2);
  });
});

describe('#143 · getBravermanPremiumQuote', () => {
  it('el quote ya no trae precio ni saldo: solo si hay test y si hay cache', async () => {
    const q = await getBravermanPremiumQuote('u1');
    expect(q).toEqual({ hasCachedReport: false, hasCompletedTest: true });
  });

  it('con cache → hasCachedReport true; sin test → hasCompletedTest false', async () => {
    state.cachedReport = { report_markdown: 'x' };
    expect((await getBravermanPremiumQuote('u1')).hasCachedReport).toBe(true);
    state.bravermanResult = null;
    state.cachedReport = null;
    expect((await getBravermanPremiumQuote('u1')).hasCompletedTest).toBe(false);
  });
});
