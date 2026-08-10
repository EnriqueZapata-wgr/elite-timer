/**
 * MB-32 · PIEZA 5 — el candado de escritura, ejercitado de verdad.
 *
 * Las familias del brief que viven aquí:
 *   1. UNA escritura, UN camino: el drenador ejecuta por los writers
 *      canónicos y el ledger recibe exactamente una escritura por acción.
 *   2. SIN doble conteo: widget + app el mismo día = la MISMA idempotency
 *      key → un solo electrón (semántica del índice único replicada).
 *   3. NO PISA EL DÍA (el test que más importa): mapa viejo del caller no
 *      borra estados, y dos escrituras concurrentes se serializan con
 *      lectura fresca en medio.
 *   6. SIN SESIÓN: el drenador no escribe nada, la cola muere y el widget
 *      queda en "abre ATP".
 *
 * supabase se fake-ea STATEFUL (el blob evoluciona con cada upsert) para
 * que la carrera sea real y no un mock que siempre contesta lo mismo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const S = vi.hoisted(() => {
  const state = {
    blob: null as Record<string, boolean> | null,
    ops: [] as string[],
    upserts: [] as any[],
    hydrationRow: null as any,
    hydrationWrites: [] as any[],
    session: { user: { id: 'u1' } } as { user: { id: string } } | null,
    store: {} as Record<string, string>,
    queueJson: '[]',
    handled: [] as string[],
    native: null as any,
  };
  state.native = {
    setSnapshot: (k: string, j: string) => {
      state.store[k] = j;
      return true;
    },
    getSnapshot: (k: string) => state.store[k] ?? null,
    getPendingActions: () => state.queueJson,
    markActionsHandled: (ids: string[]) => {
      state.handled.push(...ids);
      return true;
    },
    clearAll: () => true,
    refreshWidgets: () => true,
  };
  return state;
});

vi.mock('react-native', () => ({ DeviceEventEmitter: { emit: vi.fn() } }));
vi.mock('@/src/lib/logger', () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock('@/src/services/electron-service', () => ({
  awardBooleanElectron: vi.fn(async () => true),
  revokeBooleanElectron: vi.fn(async () => true),
  awardPracticeElectron: vi.fn(async () => true),
}));
vi.mock('@/src/services/agenda-service', () => ({
  syncCompletionFromElectron: vi.fn(async () => ({ affected: 0 })),
}));
vi.mock('@/src/services/fitness-service', () => ({ logCardioSession: vi.fn() }));
vi.mock('@/src/services/economy/electron-award-client', () => ({ fireElectronAward: vi.fn() }));
vi.mock('@/src/services/widgets/widget-bridge', () => ({
  getWidgetsNative: () => S.native,
}));
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: S.session } }) },
    from: (table: string) => {
      if (table === 'daily_electrons') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  S.ops.push('read');
                  return { data: S.blob === null ? null : { electrons: { ...S.blob } }, error: null };
                },
              }),
            }),
          }),
          upsert: async (row: any) => {
            S.ops.push('write');
            S.upserts.push(row);
            S.blob = { ...row.electrons };
            return { error: null };
          },
        };
      }
      if (table === 'hydration_logs') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: S.hydrationRow, error: null }) }),
            }),
          }),
          insert: async (row: any) => {
            S.hydrationWrites.push(row);
            return { error: null };
          },
          update: (vals: any) => {
            S.hydrationWrites.push(vals);
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      // user_day_preferences (meta de agua) y cualquier otra lectura menor.
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      };
    },
  },
}));

import { persistBooleanToggle } from '@/src/services/hoy/tarea-actions';
import { drainWidgetActions } from '@/src/services/widgets/widget-actions';
import { awardBooleanElectron, revokeBooleanElectron } from '@/src/services/electron-service';
import { getLocalToday } from '@/src/utils/date-helpers';

const award = awardBooleanElectron as unknown as ReturnType<typeof vi.fn>;
const revoke = revokeBooleanElectron as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  S.blob = null;
  S.ops.length = 0;
  S.upserts.length = 0;
  S.hydrationRow = null;
  S.hydrationWrites.length = 0;
  S.session = { user: { id: 'u1' } };
  for (const k of Object.keys(S.store)) delete S.store[k];
  S.queueJson = '[]';
  S.handled.length = 0;
  award.mockClear();
  revoke.mockClear();
});

describe('3 · NO PISA EL DÍA (el test que más importa del run)', () => {
  it('un mapa viejo del caller NO borra lo que otro escribió: la mezcla parte de la lectura fresca', async () => {
    // El widget (u otra superficie) ya palomeó sunlight; el caller llega con
    // un mapa RANCIO vacío (compilado antes de esa escritura).
    S.blob = { sunlight: true };
    await persistBooleanToggle('u1', 'cold_shower', true, {});
    expect(S.upserts).toHaveLength(1);
    // Sin la lectura fresca, esto sería { cold_shower: true } y sunlight
    // desaparecería — la corrupción exacta de B6b.
    expect(S.upserts[0].electrons).toEqual({ sunlight: true, cold_shower: true });
  });

  it('dos escrituras concurrentes se SERIALIZAN: lectura fresca entre una y otra, y las dos sobreviven', async () => {
    S.blob = {};
    // Sin candado, ambas leerían {} a la vez y la segunda pisaría a la primera.
    await Promise.all([
      persistBooleanToggle('u1', 'sunlight', true, {}),
      persistBooleanToggle('u1', 'cold_shower', true, {}),
    ]);
    expect(S.blob).toEqual({ sunlight: true, cold_shower: true });
    // El orden de operaciones prueba la serialización real: read-write-read-write,
    // nunca read-read-write-write.
    expect(S.ops).toEqual(['read', 'write', 'read', 'write']);
  });

  it('el primer write del día (sin blob) siembra con el mapa del caller: no hay nada que pisar', async () => {
    S.blob = null;
    await persistBooleanToggle('u1', 'sunlight', true, { no_alcohol: false });
    expect(S.upserts[0].electrons).toEqual({ no_alcohol: false, sunlight: true });
  });

  it('el despalomeo también mezcla fresco y revoca por la puerta de siempre', async () => {
    S.blob = { sunlight: true, cold_shower: true };
    await persistBooleanToggle('u1', 'cold_shower', false, {});
    expect(S.blob).toEqual({ sunlight: true, cold_shower: false });
    expect(revoke).toHaveBeenCalledWith('u1', 'cold_shower');
  });
});

describe('1 · UNA escritura, UN camino: el drenador ejecuta por los writers canónicos', () => {
  it('drenar un toggle + un agua produce EXACTAMENTE una escritura por acción, vía los writers', async () => {
    S.queueJson = JSON.stringify([
      { id: 'a1', kind: 'toggle_habit', source: 'cold_shower', next: true },
      { id: 'a2', kind: 'add_water', ml: 250 },
    ]);
    // Snapshots sembrados: el drenador corrige con el resultado REAL.
    S.store['habitos'] = JSON.stringify({
      v: 1, date: getLocalToday(), signedIn: true, done: 0, total: 1,
      habits: [{ key: 'cold_shower', name: 'Baño frío', momento: 'manana', timeMin: 465, completed: false, palomeable: true }],
    });
    S.store['agua'] = JSON.stringify({
      v: 1, date: getLocalToday(), signedIn: true, water: { current: 0, target: 2500 },
    });

    const r = await drainWidgetActions();
    expect(r.ejecutadas).toBe(2);
    // daily_electrons: una lectura fresca + UN upsert (persistBooleanToggle).
    expect(S.ops).toEqual(['read', 'write']);
    expect(S.blob).toEqual({ cold_shower: true });
    // hydration_logs: UNA escritura (addWater), con el delta del widget.
    expect(S.hydrationWrites).toHaveLength(1);
    expect(S.hydrationWrites[0].total_ml).toBe(250);
    // El electrón entró por la puerta canónica con la key determinística.
    expect(award).toHaveBeenCalledTimes(1);
    expect(award).toHaveBeenCalledWith('u1', 'cold_shower', {
      idempotencyKey: `u1:cold_shower:${getLocalToday()}`,
    });
    // Ambas acciones atendidas (dedup del replay).
    expect(S.handled).toEqual(expect.arrayContaining(['a1', 'a2']));
    // Y el snapshot quedó con el resultado REAL de las mutaciones.
    expect(JSON.parse(S.store['habitos']).habits[0].completed).toBe(true);
    expect(JSON.parse(S.store['agua']).water.current).toBe(250);
  });

  it('una acción de toggle sobre un VERIFICADO se tira como malformada: jamás llega al writer', async () => {
    S.queueJson = JSON.stringify([
      { id: 'v1', kind: 'toggle_habit', source: 'meditation', next: true },
    ]);
    const r = await drainWidgetActions();
    expect(r.ejecutadas).toBe(0);
    expect(S.ops).toEqual([]);
    expect(award).not.toHaveBeenCalled();
    // Y NO se queda a vivir en la cola: se marca atendida aunque se tire.
    expect(S.handled).toContain('v1');
  });
});

describe('2 · SIN doble conteo: widget y app el mismo día colapsan en UN electrón', () => {
  it('la key de idempotencia es la MISMA venga del drenador o del tap en HOY', async () => {
    S.queueJson = JSON.stringify([
      { id: 'w1', kind: 'toggle_habit', source: 'cold_shower', next: true },
    ]);
    await drainWidgetActions();
    // Después el usuario abre la app y palomea lo mismo (mapa ya fresco).
    await persistBooleanToggle('u1', 'cold_shower', true, { cold_shower: true });

    expect(award).toHaveBeenCalledTimes(2);
    const keys = award.mock.calls.map((c: any[]) => c[2].idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
    // La semántica del índice único (23505 colapsa) sobre esa key: UN electrón.
    const ledger = new Set(keys);
    expect(ledger.size).toBe(1);
  });
});

describe('6 · SIN SESIÓN: el widget no truena y no escribe', () => {
  it('cola con acciones + sesión muerta → cero escrituras, cola atendida, snapshot "abre ATP"', async () => {
    S.session = null;
    S.queueJson = JSON.stringify([
      { id: 'x1', kind: 'toggle_habit', source: 'cold_shower', next: true },
      { id: 'x2', kind: 'add_water', ml: 250 },
    ]);
    const r = await drainWidgetActions();
    expect(r.ejecutadas).toBe(0);
    expect(S.ops).toEqual([]);
    expect(S.hydrationWrites).toHaveLength(0);
    expect(award).not.toHaveBeenCalled();
    expect(S.handled).toEqual(expect.arrayContaining(['x1', 'x2']));
    expect(JSON.parse(S.store['habitos']).signedIn).toBe(false);
  });
});
