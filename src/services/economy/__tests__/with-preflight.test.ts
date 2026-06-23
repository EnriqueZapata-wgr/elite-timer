import { describe, it, expect, vi, beforeEach } from 'vitest';

let flagOn = false;
vi.mock('@/src/services/economy/economy-config', () => ({
  get LAB_ECONOMY_ENABLED() { return flagOn; },
}));

const alert = vi.fn();
vi.mock('react-native', () => ({ Alert: { alert: (...a: any[]) => alert(...a) } }));

const push = vi.fn();
vi.mock('expo-router', () => ({ router: { push: (...a: any[]) => push(...a) } }));

vi.mock('@/src/utils/haptics', () => ({ haptic: { warning: vi.fn(), light: vi.fn(), medium: vi.fn(), success: vi.fn() } }));

const getUser = vi.fn();
vi.mock('@/src/lib/supabase', () => ({ supabase: { auth: { getUser: () => getUser() } } }));

const preflightAction = vi.fn();
vi.mock('@/src/services/economy/preflight', () => ({ preflightAction: (...a: any[]) => preflightAction(...a) }));

import { withPreflight, wasAborted } from '@/src/services/economy/with-preflight';

beforeEach(() => { flagOn = false; alert.mockReset(); push.mockReset(); getUser.mockReset(); preflightAction.mockReset(); });

describe('withPreflight', () => {
  it('flag OFF → proceed directo (sin auth ni Alert)', async () => {
    const proceed = vi.fn().mockResolvedValue('ok');
    const r = await withPreflight('chat', proceed);
    expect(r).toBe('ok');
    expect(getUser).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it('flag ON + balance suficiente → proceed', async () => {
    flagOn = true;
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    preflightAction.mockResolvedValue({ ok: true, required: 280, current: 9999 });
    const proceed = vi.fn().mockResolvedValue('done');
    const r = await withPreflight('chat', proceed);
    expect(r).toBe('done');
    expect(alert).not.toHaveBeenCalled();
  });

  it('flag ON + insuficiente → Alert; "Ir a la Tienda" navega y aborta', async () => {
    flagOn = true;
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    preflightAction.mockResolvedValue({ ok: false, required: 280, current: 50 });
    // Simula tap en "Ir a la Tienda" (2do botón).
    alert.mockImplementation((_t: string, _m: string, btns: any[]) => btns[1].onPress());
    const proceed = vi.fn();
    const r = await withPreflight('chat', proceed);
    expect(proceed).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/economy/shop');
    expect(wasAborted(r)).toBe(true);
  });

  it('flag ON + insuficiente → "Cancelar" aborta sin navegar', async () => {
    flagOn = true;
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    preflightAction.mockResolvedValue({ ok: false, required: 280, current: 50 });
    alert.mockImplementation((_t: string, _m: string, btns: any[]) => btns[0].onPress());
    const r = await withPreflight('chat', vi.fn());
    expect(push).not.toHaveBeenCalled();
    expect(wasAborted(r)).toBe(true);
  });
});
