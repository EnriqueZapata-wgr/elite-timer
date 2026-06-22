import { describe, it, expect, vi, beforeEach } from 'vitest';

// react-native real no parsea bajo vitest → mock (mismo patrón que hydration-service.test).
vi.mock('react-native', () => ({ DeviceEventEmitter: { emit: vi.fn() } }));

// Flag mutable (getter → binding vivo): permite probar OFF y ON en el mismo archivo.
let flagOn = false;
vi.mock('@/src/services/economy/economy-config', () => ({
  get LAB_ECONOMY_ENABLED() { return flagOn; },
}));

const invoke = vi.fn();
vi.mock('@/src/lib/supabase', () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

import { DeviceEventEmitter } from 'react-native';
import { requestElectronAward } from '@/src/services/economy/electron-award-client';
const emit = DeviceEventEmitter.emit as unknown as ReturnType<typeof vi.fn>;

const base = { habit_type: 'sleep_wearable', evidence_tier: 'wearable' as const, idempotency_key: 'k1' };

beforeEach(() => { flagOn = false; invoke.mockReset(); emit.mockReset(); });

describe('requestElectronAward', () => {
  it('flag OFF → no-op silencioso, sin invoke', async () => {
    const r = await requestElectronAward(base);
    expect(r).toEqual({ success: false, electrons_awarded: 0, reason: 'feature_disabled' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('flag ON + éxito con award → emite balance_changed', async () => {
    flagOn = true;
    invoke.mockResolvedValue({ data: { success: true, electrons_awarded: 30, new_balance: 130, new_rank: 5 }, error: null });
    const r = await requestElectronAward(base);
    expect(invoke).toHaveBeenCalledWith('award-electrons', { body: base });
    expect(r.electrons_awarded).toBe(30);
    expect(emit).toHaveBeenCalledWith('balance_changed');
  });

  it('flag ON + award 0 (idempotente) → NO emite', async () => {
    flagOn = true;
    invoke.mockResolvedValue({ data: { success: true, electrons_awarded: 0, idempotent: true }, error: null });
    await requestElectronAward(base);
    expect(emit).not.toHaveBeenCalled();
  });

  it('flag ON + error de red → no rompe, retorna network_error', async () => {
    flagOn = true;
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const r = await requestElectronAward(base);
    expect(r).toEqual({ success: false, electrons_awarded: 0, reason: 'network_error' });
  });
});
