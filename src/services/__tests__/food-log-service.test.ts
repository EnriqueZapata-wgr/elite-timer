/**
 * MB-28A P3 — food-log-service con supabase-fake (la deuda B2 se paga de a
 * poco: cada MB agrega los tests de servicio de lo que tocó).
 *
 * Lo que se cementa:
 *  - saveFoodLog chequea { error } (supabase-js no lanza en 4xx — MB-6) y
 *    devuelve resultado tipado; el caller nunca ve un "Registrado" en falso.
 *  - El camino rápido (frecuentes, un toque) escribe en food_logs con la MISMA
 *    forma de fila que el camino largo — ninguna ruta paralela.
 *  - deleteFoodLogChecked: 0 filas ≠ éxito (RLS o id fantasma no borran nada
 *    y el caller se entera).
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
  supabase: {
    from: (t: string) => state.fake.from(t),
    auth: {
      getUser: () => state.fake.auth.getUser(),
      refreshSession: async () => ({ data: { user: null }, error: { message: 'no session' } }),
    },
  },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));

import { saveFoodLog, deleteFoodLogChecked } from '@/src/services/food-log-service';

beforeEach(() => {
  state.emitted = [];
});

describe('saveFoodLog', () => {
  it('inserta en food_logs y emite day_changed (regla #6)', async () => {
    state.fake = makeFakeSupabase({ food_logs: { data: { id: 'log-1' }, error: null } });
    const r = await saveFoodLog({
      userId: 'u1', mealType: 'lunch', description: 'Pollo con arroz', source: 'manual_text',
    });
    expect(r).toEqual({ ok: true, id: 'log-1' });
    expect(state.fake.queried).toContain('food_logs');
    expect(state.emitted).toContain('day_changed');
  });

  it('error de Postgres (4xx silencioso) → ok:false, sin emitir day_changed', async () => {
    state.fake = makeFakeSupabase({
      food_logs: { data: null, error: { message: 'new row violates row-level security' } },
    });
    const r = await saveFoodLog({
      userId: 'u1', mealType: 'lunch', description: 'x', source: 'manual_text',
    });
    expect(r.ok).toBe(false);
    expect(state.emitted).not.toContain('day_changed');
  });

  it('sin userId explícito resuelve de la sesión; sin sesión → ok:false', async () => {
    state.fake = makeFakeSupabase({ food_logs: { data: { id: 'log-2' }, error: null } }, 'user-auth');
    const conSesion = await saveFoodLog({ mealType: 'dinner', description: 'y', source: 'scan_raw' });
    expect(conSesion.ok).toBe(true);

    state.fake = makeFakeSupabase({ food_logs: { data: { id: 'nunca' }, error: null } }, null);
    const sinSesion = await saveFoodLog({ mealType: 'dinner', description: 'y', source: 'scan_raw' });
    expect(sinSesion).toEqual({ ok: false, message: 'Sesión expirada' });
    // Sin sesión NI SIQUIERA toca la tabla.
    expect(state.fake.queried).not.toContain('food_logs');
  });

  it('el camino rápido (frequent) escribe la MISMA forma de fila que el largo', async () => {
    // Camino largo: food-text con macros revisados.
    state.fake = makeFakeSupabase({ food_logs: { data: { id: 'a' }, error: null } });
    await saveFoodLog({
      userId: 'u1', mealType: 'lunch', description: 'Bowl', source: 'manual_text',
      wasEdited: true, mealTime: '13:30:00', calories: 520, proteinG: 42, carbsG: 40, fatG: 18,
      extras: { fiber_g: 6, quality_score: 80 },
    });
    const largo = state.fake.calls.find((c: any) => c.method === 'insert');

    // Camino rápido: food-register frecuentes, un toque.
    state.fake = makeFakeSupabase({ food_logs: { data: { id: 'b' }, error: null } });
    await saveFoodLog({
      userId: 'u1', mealType: 'lunch', description: 'Bowl', source: 'frequent',
      mealTime: '13:30', calories: 520, proteinG: 42, carbsG: 40, fatG: 18,
      extras: { items: [] },
    });
    const rapido = state.fake.calls.find((c: any) => c.method === 'insert');

    expect(largo).toBeTruthy();
    expect(rapido).toBeTruthy();
    const colsLargo = Object.keys(largo!.args[0] as object).sort();
    const colsRapido = Object.keys(rapido!.args[0] as object).sort();
    // Misma tabla, mismas columnas: si un camino agregara o quitara columnas,
    // habría dos formas de fila conviviendo — la deuda que MB-8 mató.
    expect(rapido!.table).toBe('food_logs');
    expect(colsRapido).toEqual(colsLargo);
    expect((rapido!.args[0] as any).source).toBe('frequent');
    expect((largo!.args[0] as any).source).toBe('manual_text');
  });
});

describe('deleteFoodLogChecked', () => {
  it('borrado real (1 fila) → ok:true + day_changed', async () => {
    state.fake = makeFakeSupabase({ food_logs: { data: [{ id: 'log-1' }], error: null } });
    expect((await deleteFoodLogChecked('log-1')).ok).toBe(true);
    expect(state.emitted).toContain('day_changed');
  });

  it('0 filas (RLS o id fantasma) → ok:false, sin day_changed', async () => {
    state.fake = makeFakeSupabase({ food_logs: { data: [], error: null } });
    expect((await deleteFoodLogChecked('log-x')).ok).toBe(false);
    expect(state.emitted).not.toContain('day_changed');
  });

  it('error → ok:false', async () => {
    state.fake = makeFakeSupabase({ food_logs: { data: null, error: { message: 'boom' } } });
    expect((await deleteFoodLogChecked('log-1')).ok).toBe(false);
  });
});
