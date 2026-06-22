import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    rpc: (...a: any[]) => rpcMock(...a),
    from: (...a: any[]) => fromMock(...a),
  },
}));

import { spendProtons, awardProtons, getActionCost } from '@/src/services/economy/proton-service';
import { previewProtons, convertElectronsToProtons } from '@/src/services/economy/electron-to-proton-converter';
import { joinChallenge, evaluateCriteria } from '@/src/services/economy/challenge-service';
import { generateReferralCode } from '@/src/services/economy/referral-service';
import { awardElectrons } from '@/src/services/economy/electron-service';

/** Chain de Supabase configurable: cada método encadena; los terminales resuelven `result`. */
function chain(result: any) {
  const c: any = {};
  for (const m of ['select', 'eq', 'in', 'order', 'limit', 'lte', 'gte', 'update']) c[m] = () => c;
  c.maybeSingle = () => Promise.resolve(result);
  c.insert = () => Promise.resolve(result);
  c.then = (r: any) => Promise.resolve(result).then(r);
  return c;
}

beforeEach(() => { rpcMock.mockReset(); fromMock.mockReset(); });

describe('proton-service — spendProtons', () => {
  it('éxito → success + newBalance', async () => {
    rpcMock.mockResolvedValue({ data: { success: true, new_balance: 100 }, error: null });
    const r = await spendProtons('u1', 2800, 'chat');
    expect(r).toEqual({ success: true, newBalance: 100, error: undefined });
  });
  it('insuficiente → success false', async () => {
    rpcMock.mockResolvedValue({ data: { success: false, new_balance: 5, error: 'insufficient_protons' }, error: null });
    const r = await spendProtons('u1', 2800, 'chat');
    expect(r.success).toBe(false);
    expect(r.error).toBe('insufficient_protons');
  });
});

describe('proton-service — awardProtons (refund)', () => {
  it('llama award_protons con el tipo', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const r = await awardProtons('u1', 2800, 'refund', 'chat', { reason: 'llm_failed' });
    expect(r.success).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('award_protons', expect.objectContaining({ p_type: 'refund', p_amount: 2800 }));
  });
});

describe('proton-service — getActionCost', () => {
  it('usa la tabla cuando responde', async () => {
    fromMock.mockReturnValue(chain({ data: { cost_h_plus: 1234, enabled: true }, error: null }));
    expect(await getActionCost('chat')).toBe(1234);
  });
  it('cae al fallback del seed si no hay fila', async () => {
    fromMock.mockReturnValue(chain({ data: null, error: { message: 'x' } }));
    expect(await getActionCost('chat')).toBe(2800);
  });
});

describe('converter — preview + convert', () => {
  it('previewProtons base y con multiplier', () => {
    expect(previewProtons(100)).toBe(3000);
    expect(previewProtons(100, 2)).toBe(6000);
    expect(previewProtons(300)).toBe(9000);
  });
  it('convert dispara RPC con electrones', async () => {
    rpcMock.mockResolvedValue({ data: { success: true, protons_gained: 3000, multiplier: 1 }, error: null });
    const r = await convertElectronsToProtons('u1', 100);
    expect(r.success).toBe(true);
    expect(r.protonsGained).toBe(3000);
    expect(rpcMock).toHaveBeenCalledWith('convert_electrons_to_protons', { p_user_id: 'u1', p_electrons: 100 });
  });
});

describe('challenge-service', () => {
  it('evaluateCriteria: completo cuando current >= target', () => {
    expect(evaluateCriteria({ days_required: 21 }, { days_completed: 21 }).completed).toBe(true);
    expect(evaluateCriteria({ days_required: 21 }, { days_completed: 10 }).completed).toBe(false);
    expect(evaluateCriteria({ days_required: 21 }, null).completed).toBe(false);
  });
  it('joinChallenge mapea el resultado del RPC', async () => {
    rpcMock.mockResolvedValue({ data: { success: true, cost: 50000 }, error: null });
    const r = await joinChallenge('u1', 'c1');
    expect(r).toEqual({ success: true, cost: 50000, error: undefined });
  });
});

describe('referral-service — generateReferralCode', () => {
  it('genera código con formato ATPxxxxxx', async () => {
    fromMock.mockReturnValue(chain({ data: null, error: null })); // sin código previo + insert ok
    const code = await generateReferralCode('u1');
    expect(code).toMatch(/^ATP[A-HJ-NP-Z2-9]{6}$/);
  });
  it('devuelve el código existente sin recrear', async () => {
    fromMock.mockReturnValue(chain({ data: { referral_code: 'ATPABC234' }, error: null }));
    expect(await generateReferralCode('u1')).toBe('ATPABC234');
  });
});

describe('electron-service — awardElectrons', () => {
  it('llama award_electrons y reporta éxito', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const r = await awardElectrons('u1', 10, 'habit_sleep', undefined, 'habit_sleep_2026-06-21');
    expect(r.success).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('award_electrons', expect.objectContaining({
      p_amount: 10, p_reason: 'habit_sleep', p_idempotency_key: 'habit_sleep_2026-06-21',
    }));
  });
});
