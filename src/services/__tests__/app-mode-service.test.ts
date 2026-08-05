/**
 * MB-22.1 P4 — app-mode-service: la fuente del modo del Ciclo.
 *
 * El contrato fail-soft es de seguridad, no de conveniencia: un error de
 * lectura (tabla ausente pre-push, RLS, red) debe dar null = comportamiento
 * de hoy por biological_sex. Si un error devolviera un modo inventado, un
 * fallo de red podría abrir el ciclo a quien no le toca o meter datos de
 * acompañante a salud.
 */
import { describe, it, expect, vi } from 'vitest';
import { makeFakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({ fake: null as any }));

vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({
  log: () => {}, warn: () => {}, error: () => {},
}));

import { getCycleAppMode, setCycleAppMode } from '@/src/services/app-mode-service';

describe('getCycleAppMode', () => {
  it('lee el modo válido de user_app_modes', async () => {
    state.fake = makeFakeSupabase({
      user_app_modes: { data: { mode: 'acompanante' }, error: null },
    });
    expect(await getCycleAppMode('u1')).toBe('acompanante');

    state.fake = makeFakeSupabase({
      user_app_modes: { data: { mode: 'propio' }, error: null },
    });
    expect(await getCycleAppMode('u1')).toBe('propio');
  });

  it('sin fila → null (female cae a propio por biological_sex, male queda fuera)', async () => {
    state.fake = makeFakeSupabase({
      user_app_modes: { data: null, error: null },
    });
    expect(await getCycleAppMode('u1')).toBe(null);
  });

  it('ERROR de lectura (tabla ausente/RLS/red) → null, jamás un modo inventado', async () => {
    state.fake = makeFakeSupabase({
      user_app_modes: { data: null, error: { code: '42P01', message: 'relation does not exist' } },
    });
    expect(await getCycleAppMode('u1')).toBe(null);
  });

  it('basura en DB → null (parse estricto, sin match laxo)', async () => {
    for (const raw of ['companion', 'PROPIO', '', 42, {}]) {
      state.fake = makeFakeSupabase({
        user_app_modes: { data: { mode: raw }, error: null },
      });
      expect(await getCycleAppMode('u1'), String(raw)).toBe(null);
    }
  });
});

describe('setCycleAppMode', () => {
  it('éxito → ok:true; error → ok:false (el caller no finge que guardó)', async () => {
    state.fake = makeFakeSupabase({ user_app_modes: { data: null, error: null } });
    expect((await setCycleAppMode('u1', 'acompanante')).ok).toBe(true);

    state.fake = makeFakeSupabase({
      user_app_modes: { data: null, error: { message: 'boom' } },
    });
    expect((await setCycleAppMode('u1', 'propio')).ok).toBe(false);
  });
});
