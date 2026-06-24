import { describe, it, expect, beforeEach, vi } from 'vitest';

const state = vi.hoisted(() => ({
  counts: {} as Record<string, number>,
  errorTables: new Set<string>(),
  throwTables: new Set<string>(),
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (state.throwTables.has(table)) throw new Error('boom');
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        then: (resolve: any) => resolve(
          state.errorTables.has(table)
            ? { count: 0, error: { message: 'err' } }
            : { count: state.counts[table] ?? 0, error: null },
        ),
      };
      return chain;
    },
  },
}));
vi.mock('@/src/utils/date-helpers', () => ({ getLocalToday: () => '2026-06-23' }));

import { countUnreadNotifications } from '@/src/services/hoy/notifications-service';

beforeEach(() => { state.counts = {}; state.errorTables.clear(); state.throwTables.clear(); });

describe('countUnreadNotifications', () => {
  it('suma las 3 fuentes', async () => {
    state.counts = { argos_daily_insights: 2, lab_uploads: 1, agenda_event_logs: 3 };
    expect(await countUnreadNotifications('u1')).toBe(6);
  });

  it('0 si no hay nada', async () => {
    expect(await countUnreadNotifications('u1')).toBe(0);
  });

  it('resiliente: una tabla con error → las demás siguen contando', async () => {
    state.counts = { argos_daily_insights: 2, lab_uploads: 5 };
    state.errorTables.add('agenda_event_logs'); // tabla futura inexistente
    expect(await countUnreadNotifications('u1')).toBe(7);
  });

  it('resiliente: una tabla que lanza → cuenta 0 esa, no rompe', async () => {
    state.counts = { lab_uploads: 4 };
    state.throwTables.add('argos_daily_insights');
    expect(await countUnreadNotifications('u1')).toBe(4);
  });
});
