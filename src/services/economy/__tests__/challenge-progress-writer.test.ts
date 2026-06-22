import { describe, it, expect, vi, beforeEach } from 'vitest';

let flagOn = false;
vi.mock('@/src/services/economy/economy-config', () => ({
  get LAB_ECONOMY_ENABLED() { return flagOn; },
}));

// Chain configurable + spies de update/invoke.
const state: any = {};
const updateSpy = vi.fn();
const invoke = vi.fn();
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: () => {
      const c: any = {
        select: () => c, eq: () => c,
        update: (payload: any) => { updateSpy(payload); return { eq: () => Promise.resolve({ error: null }) }; },
        then: (r: any) => Promise.resolve({ data: state.participants ?? [] }).then(r),
      };
      return c;
    },
    functions: { invoke: (...a: any[]) => invoke(...a) },
  },
}));

import { writeChallengeProgress } from '@/src/services/economy/challenge-progress-writer';

beforeEach(() => { flagOn = false; state.participants = []; updateSpy.mockReset(); invoke.mockReset(); });

describe('challenge-progress-writer', () => {
  it('flag OFF → no-op (no lee ni escribe)', async () => {
    await writeChallengeProgress({ userId: 'u1', type: 'daily_steps', value: 21000, date: '2026-06-20' });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('flag ON + evento que NO matchea criterio → no actualiza', async () => {
    flagOn = true;
    state.participants = [{ id: 'p1', challenge_id: 'c1', progress: null, challenges: { criteria: { type: 'cardio_minutes', target: 150 } } }];
    await writeChallengeProgress({ userId: 'u1', type: 'daily_steps', value: 21000, date: '2026-06-20' });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('flag ON + evento matchea → actualiza progress; no completa aún → no settle', async () => {
    flagOn = true;
    state.participants = [{ id: 'p1', challenge_id: 'c1', progress: null, challenges: { criteria: { type: 'daily_steps', target: 20000, days_required: 3 } } }];
    await writeChallengeProgress({ userId: 'u1', type: 'daily_steps', value: 21000, date: '2026-06-20' });
    expect(updateSpy).toHaveBeenCalledWith({ progress: expect.objectContaining({ days_completed: 1 }) });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('flag ON + criterio cumplido → invoca settle-challenge', async () => {
    flagOn = true;
    state.participants = [{ id: 'p1', challenge_id: 'c1', progress: { days_completed: 2, last_date: '2026-06-19' }, challenges: { criteria: { type: 'daily_steps', target: 20000, days_required: 3 } } }];
    await writeChallengeProgress({ userId: 'u1', type: 'daily_steps', value: 21000, date: '2026-06-20' });
    expect(invoke).toHaveBeenCalledWith('settle-challenge', { body: { participant_id: 'p1' } });
  });
});
