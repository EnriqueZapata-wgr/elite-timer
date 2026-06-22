import { describe, it, expect, vi, beforeEach } from 'vitest';

// Captura la cadena .from().update().eq().eq() para verificar la invalidación.
const calls: any = {};
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from(table: string) {
      calls.table = table;
      const c: any = {
        update(p: any) { calls.update = p; return c; },
        eq(col: string, val: any) { (calls.eq ??= {})[col] = val; return c; },
        then(res: any) { return Promise.resolve({ error: null }).then(res); },
      };
      return c;
    },
  },
}));

import { invalidateDailyInsight } from '@/src/services/argos-insight-cache';

describe('argos-service — invalidateDailyInsight (H7)', () => {
  beforeEach(() => { calls.table = undefined; calls.update = undefined; calls.eq = undefined; });

  it('marca el insight de HOY como viejo (created_at epoch), scoped al usuario', async () => {
    await invalidateDailyInsight('u1');
    expect(calls.table).toBe('argos_daily_insights');
    expect(new Date(calls.update.created_at).getTime()).toBe(0); // epoch → fuera de la ventana de 6h
    expect(calls.eq.user_id).toBe('u1'); // nunca toca otros usuarios
    expect(calls.eq.date).toBeTruthy(); // solo la fila de hoy
  });

  it('userId vacío → no-op (no toca DB)', async () => {
    await invalidateDailyInsight('');
    expect(calls.table).toBeUndefined();
  });
});
