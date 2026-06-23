/**
 * E2E economía con flag simulado. Compone los helpers reales mockeando solo los bordes
 * (supabase, react-native, expo-router). Cubre los 5 flujos del handoff.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Flag mutable (getter → binding vivo) ──
let flagOn = false;
vi.mock('@/src/services/economy/economy-config', async (orig) => {
  const actual = await (orig as any)();
  return { ...actual, get LAB_ECONOMY_ENABLED() { return flagOn; } };
});

// ── react-native (DeviceEventEmitter + Alert) ──
const emit = vi.fn();
const alert = vi.fn();
vi.mock('react-native', () => ({ DeviceEventEmitter: { emit: (...a: any[]) => emit(...a) }, Alert: { alert: (...a: any[]) => alert(...a) } }));

// ── expo-router ──
const push = vi.fn();
vi.mock('expo-router', () => ({ router: { push: (...a: any[]) => push(...a) } }));

vi.mock('@/src/utils/haptics', () => ({ haptic: { warning: vi.fn(), light: vi.fn(), medium: vi.fn(), success: vi.fn() } }));

// ── supabase configurable ──
const sb: any = {};
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve(sb.user ?? { data: { user: { id: 'u1' } } }) },
    functions: { invoke: (...a: any[]) => { (sb.invokeCalls ??= []).push(a); return Promise.resolve(sb.invokeResult ?? { data: { success: true, electrons_awarded: 30 }, error: null }); } },
    rpc: (...a: any[]) => { (sb.rpcCalls ??= []).push(a); return Promise.resolve(sb.rpcResult ?? { data: {}, error: null }); },
    from: () => {
      const c: any = {
        select: () => c, eq: () => c, in: () => c, order: () => c, limit: () => c, lte: () => c, gte: () => c,
        maybeSingle: () => Promise.resolve(sb.single ?? { data: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
        then: (r: any) => Promise.resolve({ data: sb.rows ?? [] }).then(r),
      };
      return c;
    },
  },
}));

import { requestElectronAward } from '@/src/services/economy/electron-award-client';
import { withPreflight, wasAborted } from '@/src/services/economy/with-preflight';
import { writeChallengeProgress } from '@/src/services/economy/challenge-progress-writer';
import { previewProtons } from '@/src/services/economy/electron-to-proton-converter';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  flagOn = false;
  emit.mockReset(); alert.mockReset(); push.mockReset();
  sb.user = undefined; sb.invokeResult = undefined; sb.rpcResult = undefined; sb.single = undefined; sb.rows = [];
  sb.invokeCalls = []; sb.rpcCalls = [];
});

describe('E2E — Flujo 1: hábito → award → balance', () => {
  it('flag ON: award invoca Edge Function y emite balance_changed', async () => {
    flagOn = true;
    sb.invokeResult = { data: { success: true, electrons_awarded: 2, new_balance: 102 }, error: null };
    await requestElectronAward({ habit_type: 'hydration_tap', evidence_tier: 'self', idempotency_key: 'k1' });
    expect(sb.invokeCalls[0][0]).toBe('award-electrons');
    expect(emit).toHaveBeenCalledWith('balance_changed');
  });
});

describe('E2E — Flujo 2: chat con H+ insuficiente', () => {
  it('flag ON + balance bajo → Alert con opción tienda, aborta', async () => {
    flagOn = true;
    // Mismo objeto sirve a getActionCost (cost_h_plus) y getProtonBalance (current_protons).
    sb.single = { data: { cost_h_plus: 280, enabled: true, current_protons: 50, lifetime_earned: 0, lifetime_spent: 0 } };
    alert.mockImplementation((_t: string, _m: string, btns: any[]) => btns[1].onPress()); // "Ir a la Tienda"
    const proceed = vi.fn();
    const r = await withPreflight('chat', proceed);
    expect(proceed).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/economy/shop');
    expect(wasAborted(r)).toBe(true);
  });
});

describe('E2E — Flujo 3: conversión con campaña activa (×2)', () => {
  it('100 E- con multiplier 2 → 600 H+ (no 300)', () => {
    expect(previewProtons(100, 1)).toBe(300);
    expect(previewProtons(100, 2)).toBe(600);
  });
});

describe('E2E — Flujo 4: reto cumplido dispara settle', () => {
  it('progreso alcanza criteria → invoca settle-challenge', async () => {
    flagOn = true;
    sb.rows = [{ id: 'p1', challenge_id: 'c1', progress: { days_completed: 2, last_date: '2026-06-19' }, challenges: { criteria: { type: 'daily_steps', target: 20000, days_required: 3 } } }];
    await writeChallengeProgress({ userId: 'u1', type: 'daily_steps', value: 21000, date: '2026-06-20' });
    const settle = sb.invokeCalls.find((c: any[]) => c[0] === 'settle-challenge');
    expect(settle).toBeTruthy();
    expect(settle[1]).toEqual({ body: { participant_id: 'p1' } });
  });
});

describe('E2E — Flujo 5: flag OFF byte-idéntico (todo no-op)', () => {
  it('award/preflight/challenge no tocan red ni UI', async () => {
    flagOn = false;
    const award = await requestElectronAward({ habit_type: 'hydration_tap', evidence_tier: 'self', idempotency_key: 'k' });
    expect(award.reason).toBe('feature_disabled');

    const proceed = vi.fn().mockResolvedValue('ok');
    const r = await withPreflight('chat', proceed);
    expect(r).toBe('ok'); // proceed directo

    await writeChallengeProgress({ userId: 'u1', type: 'daily_steps', value: 21000, date: '2026-06-20' });

    expect(sb.invokeCalls.length).toBe(0); // cero red
    expect(emit).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });
});
