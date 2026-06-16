import { describe, it, expect, vi, beforeEach } from 'vitest';

// Estado configurable de la fila hydration_logs existente + captura de writes.
let existingRow: any = null;
const inserted: any[] = [];
const updated: any[] = [];

vi.mock('react-native', () => ({ DeviceEventEmitter: { emit: vi.fn() } }));
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          // hydration_logs: .eq().eq().maybeSingle(); user_day_preferences: .eq().maybeSingle()
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: existingRow }) }),
          maybeSingle: () => Promise.resolve({ data: { goals: { water_goal_ml: 2500 } } }),
        }),
      }),
      update: (vals: any) => { updated.push(vals); return { eq: () => Promise.resolve({ error: null }) }; },
      insert: (vals: any) => { inserted.push(vals); return Promise.resolve({ error: null }); },
    }),
  },
}));

import { DeviceEventEmitter } from 'react-native';
import { addWater } from '@/src/services/hydration-service';

const emit = DeviceEventEmitter.emit as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  existingRow = null;
  inserted.length = 0;
  updated.length = 0;
  emit.mockClear();
});

describe('hydration-service — addWater (F01.10 + F03.7)', () => {
  it('+250 sobre 500 → actualiza a 750 y emite day_changed + electrons_changed', async () => {
    existingRow = { id: 'h1', total_ml: 500, entries: [] };
    const total = await addWater('u1', 250);
    expect(total).toBe(750);
    expect(updated[0].total_ml).toBe(750);
    expect(emit).toHaveBeenCalledWith('day_changed');
    expect(emit).toHaveBeenCalledWith('electrons_changed');
  });

  it('-250 sobre 0 → no permite negativo (queda 0) y NO escribe ni emite', async () => {
    existingRow = { id: 'h1', total_ml: 0, entries: [] };
    const total = await addWater('u1', -250);
    expect(total).toBe(0);
    expect(updated).toHaveLength(0);
    expect(emit).not.toHaveBeenCalled();
  });

  it('-250 sobre 200 → clampa a 0 (no -50)', async () => {
    existingRow = { id: 'h1', total_ml: 200, entries: [] };
    const total = await addWater('u1', -250);
    expect(total).toBe(0);
    expect(updated[0].total_ml).toBe(0);
  });

  it('+500 sin fila previa → inserta 500 y emite', async () => {
    existingRow = null;
    const total = await addWater('u1', 500);
    expect(total).toBe(500);
    expect(inserted[0]).toMatchObject({ user_id: 'u1', total_ml: 500 });
    expect(emit).toHaveBeenCalledWith('day_changed');
    expect(emit).toHaveBeenCalledWith('electrons_changed');
  });
});
