/**
 * MB-28A P3 — nutrition-mode-service con supabase-fake (deuda B2).
 *
 * El contrato fail-soft es filosofía, no conveniencia: si el modo no se puede
 * leer (red, RLS, tabla), la app cae a 'simple' — el default guiado — y nunca
 * a un 'complete' inventado. Y setNutritionMode devuelve la verdad: un error
 * no emite eventos ni finge que guardó.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({
  fake: null as any,
  emitted: [] as string[],
}));

vi.mock('react-native', () => ({
  DeviceEventEmitter: { emit: (e: string) => state.emitted.push(e) },
}));
vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));
vi.mock('@/src/hooks/useMacroMode', () => ({ MACRO_MODE_EVENT: 'macro_mode_changed' }));

import { getNutritionMode, setNutritionMode } from '@/src/services/nutrition-mode-service';

beforeEach(() => {
  state.emitted = [];
});

describe('getNutritionMode', () => {
  it('lee el modo de client_profiles', async () => {
    state.fake = makeFakeSupabase({
      client_profiles: { data: { nutrition_mode: 'complete', macro_mode: true }, error: null },
    });
    expect(await getNutritionMode('u1')).toBe('complete');
    expect(state.fake.queried).toContain('client_profiles');
  });

  it('perfil pre-166 (sin nutrition_mode) → deriva de macro_mode', async () => {
    state.fake = makeFakeSupabase({
      client_profiles: { data: { nutrition_mode: null, macro_mode: true }, error: null },
    });
    expect(await getNutritionMode('u1')).toBe('complete');
  });

  it('sin fila o error de lectura → simple (default filosofía, jamás complete inventado)', async () => {
    state.fake = makeFakeSupabase({ client_profiles: { data: null, error: null } });
    expect(await getNutritionMode('u1')).toBe('simple');

    state.fake = makeFakeSupabase({
      client_profiles: { data: null, error: { code: '42P01', message: 'relation does not exist' } },
    });
    expect(await getNutritionMode('u1')).toBe('simple');
  });
});

describe('setNutritionMode', () => {
  it('éxito → true + propaga NUTRITION_MODE_EVENT y MACRO_MODE_EVENT', async () => {
    state.fake = makeFakeSupabase({ client_profiles: { data: null, error: null } });
    expect(await setNutritionMode('u1', 'complete')).toBe(true);
    expect(state.emitted).toContain('nutrition_mode_changed');
    expect(state.emitted).toContain('macro_mode_changed');
    // Sincroniza el precursor macro_mode en el MISMO update (transicional).
    const update = state.fake.calls.find((c: any) => c.method === 'update');
    expect(update?.args[0]).toEqual({ nutrition_mode: 'complete', macro_mode: true });
  });

  it('error → false y CERO eventos (nadie se entera de un cambio que no pasó)', async () => {
    state.fake = makeFakeSupabase({
      client_profiles: { data: null, error: { message: 'boom' } },
    });
    expect(await setNutritionMode('u1', 'simple')).toBe(false);
    expect(state.emitted).toEqual([]);
  });
});
