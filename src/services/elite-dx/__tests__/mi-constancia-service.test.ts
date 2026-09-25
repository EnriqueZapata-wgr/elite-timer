/**
 * mi-constancia-service (25-sep-2026, APP_ELITE_DX).
 *
 * EL CANDADO QUE IMPORTA: el número que ve el cliente en PROGRESO es el mismo
 * que ve Enrique en su consola. Por eso cada escenario corre las DOS lecturas
 * (`leerMiConstancia` y `cargarClientes` de la consola) contra los mismos
 * datos y exige la misma adherencia. Si alguien cambia las fuentes de señal de
 * un lado y no del otro, este test se cae.
 *
 * Además: un error de lectura es 'error', nunca un cero ni un "no tienes".
 */
import { describe, it, expect, vi } from 'vitest';
import { makeFakeSupabase, type FakeResp } from '@/src/services/__tests__/supabase-fake';

const state = vi.hoisted(() => ({ fake: null as any }));

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (t: string) => state.fake.from(t),
    rpc: (fn: string, p?: Record<string, unknown>) => state.fake.rpc(fn, p),
  },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));
vi.mock('@/src/utils/date-helpers', () => ({ getLocalToday: () => '2026-09-25' }));

import { leerMiConstancia, leerMisMedidas } from '@/src/services/elite-dx/mi-constancia-service';
import { cargarClientes } from '@/src/services/consola/consola-service';
import { restarDias } from '@/src/services/consola/consola-core';
import { resumenCuerpo } from '@/src/services/elite-dx/progreso-core';

const C = 'cliente-1';
const vacio: FakeResp = { data: [], error: null };

/** Todas las tablas que lee la consola, vacías, más la relación con Enrique. */
function base(extra: Record<string, FakeResp>): Record<string, FakeResp> {
  return {
    coach_clients: { data: [{ client_id: C }], error: null },
    profiles: { data: [{ id: C, email: 'c@x.com', full_name: 'Cliente', tier: 'elite', tier_expires_at: null, is_test: false }], error: null },
    functional_dx: vacio,
    user_interventions: vacio,
    intervention_completions: vacio,
    user_supplements: vacio,
    user_master_quiz: vacio,
    lab_uploads: vacio,
    user_symptoms: vacio,
    food_logs: vacio,
    hydration_logs: vacio,
    electron_logs: vacio,
    argos_daily_usage: vacio,
    mind_sessions: vacio,
    supplement_logs: vacio,
    ...extra,
  };
}

async function ambas(tablas: Record<string, FakeResp>) {
  state.fake = makeFakeSupabase(tablas);
  const cliente = await leerMiConstancia(C);
  state.fake = makeFakeSupabase(tablas);
  const consola = await cargarClientes('coach-1');
  if (consola.estado !== 'ok') throw new Error('la consola no leyó');
  return { cliente, coach: consola.datos[0]?.adherencia };
}

const ACTIVA = { data: [{ id: 'iv1', user_id: C, activated_at: '2026-01-10T10:00:00+00:00' }], error: null };

describe('paridad con la consola de Enrique', () => {
  it('con marcas en la ventana: el mismo porcentaje y la misma fracción', async () => {
    const { cliente, coach } = await ambas(base({
      user_interventions: ACTIVA,
      intervention_completions: { data: [
        { user_id: C, user_intervention_id: 'iv1', date: '2026-09-20' },
        { user_id: C, user_intervention_id: 'iv1', date: '2026-09-20' },
        { user_id: C, user_intervention_id: 'iv1', date: '2026-09-24' },
      ], error: null },
    }));
    expect(cliente).toEqual({ estado: 'ok', adherencia: coach });
    expect(coach).toEqual({ estado: 'ok', pct: 14, hechos: 2, esperados: 14 });
  });

  it('cero marcas pero registró comida en la ventana: 0% para los dos', async () => {
    const { cliente, coach } = await ambas(base({
      user_interventions: ACTIVA,
      food_logs: { data: [{ user_id: C, date: '2026-09-22' }], error: null },
    }));
    expect(cliente).toEqual({ estado: 'ok', adherencia: coach });
    expect(coach).toEqual({ estado: 'ok', pct: 0, hechos: 0, esperados: 14 });
  });

  it('cero marcas y la única señal es de antes de la ventana: sin dato para los dos', async () => {
    const { cliente, coach } = await ambas(base({
      user_interventions: ACTIVA,
      hydration_logs: { data: [{ user_id: C, created_at: '2026-09-01T08:00:00+00:00' }], error: null },
    }));
    expect(cliente).toEqual({ estado: 'ok', adherencia: coach });
    expect(coach).toEqual({ estado: 'sinDato', motivo: 'sin-senal' });
  });

  it('cada fuente de señal de la consola cuenta igual del lado del cliente', async () => {
    const fuentes: Record<string, Record<string, unknown>> = {
      electron_logs: { date: '2026-09-21' },
      argos_daily_usage: { usage_date: '2026-09-21' },
      food_logs: { date: '2026-09-21' },
      hydration_logs: { created_at: '2026-09-21T09:00:00+00:00' },
      supplement_logs: { date: '2026-09-21' },
      mind_sessions: { date: '2026-09-21' },
      user_symptoms: { created_at: '2026-09-21T09:00:00+00:00' },
      lab_uploads: { uploaded_at: '2026-09-21T09:00:00+00:00' },
      user_master_quiz: { question_code: 'X.1', answer: 1, answered_at: '2026-09-21T09:00:00+00:00' },
    };
    for (const [tabla, filaExtra] of Object.entries(fuentes)) {
      const { cliente, coach } = await ambas(base({
        user_interventions: ACTIVA,
        [tabla]: { data: [{ user_id: C, ...filaExtra }], error: null },
      }));
      expect(coach).toEqual({ estado: 'ok', pct: 0, hechos: 0, esperados: 14 });
      expect(cliente).toEqual({ estado: 'ok', adherencia: coach });
    }
  });

  it('marca de una práctica que ya no está activa: señal sí, número 0% para los dos', async () => {
    const { cliente, coach } = await ambas(base({
      user_interventions: ACTIVA,
      intervention_completions: { data: [{ user_id: C, user_intervention_id: 'vieja', date: '2026-09-23' }], error: null },
    }));
    expect(cliente).toEqual({ estado: 'ok', adherencia: coach });
    expect(coach).toEqual({ estado: 'ok', pct: 0, hechos: 0, esperados: 14 });
  });

  it('práctica activada hace 3 días: se mide con 3, no con 14', async () => {
    const { cliente, coach } = await ambas(base({
      user_interventions: { data: [{ id: 'iv1', user_id: C, activated_at: '2026-09-23T12:00:00+00:00' }], error: null },
      intervention_completions: { data: [{ user_id: C, user_intervention_id: 'iv1', date: '2026-09-24' }], error: null },
    }));
    expect(cliente).toEqual({ estado: 'ok', adherencia: coach });
    expect(coach).toEqual({ estado: 'ok', pct: 33, hechos: 1, esperados: 3 });
  });

  it('sin prácticas activas: el mismo motivo', async () => {
    const { cliente, coach } = await ambas(base({}));
    expect(cliente).toEqual({ estado: 'ok', adherencia: coach });
    expect(coach).toEqual({ estado: 'sinDato', motivo: 'sin-intervenciones' });
  });
});

describe('errores: nunca un cero', () => {
  it('falla la lectura de prácticas: error', async () => {
    state.fake = makeFakeSupabase(base({ user_interventions: { data: null, error: { message: 'red' } } }));
    expect(await leerMiConstancia(C)).toEqual({ estado: 'error' });
  });

  it('falla la lectura de marcas: error', async () => {
    state.fake = makeFakeSupabase(base({ user_interventions: ACTIVA, intervention_completions: { data: null, error: { message: 'red' } } }));
    expect(await leerMiConstancia(C)).toEqual({ estado: 'error' });
  });

  it('cero marcas y falla una fuente de señal: error, no "sin registro" ni 0%', async () => {
    state.fake = makeFakeSupabase(base({ user_interventions: ACTIVA, mind_sessions: { data: null, error: { message: 'red' } } }));
    expect(await leerMiConstancia(C)).toEqual({ estado: 'error' });
  });

  it('con marcas no se leen las fuentes extra (ya hay señal): una fuente caída no importa', async () => {
    state.fake = makeFakeSupabase(base({
      user_interventions: ACTIVA,
      intervention_completions: { data: [{ user_id: C, user_intervention_id: 'iv1', date: '2026-09-24' }], error: null },
      food_logs: { data: null, error: { message: 'red' } },
    }));
    const r = await leerMiConstancia(C);
    expect(r.estado).toBe('ok');
    expect(state.fake.queried).toEqual(['user_interventions', 'intervention_completions']);
  });

  it('sin usuario: error', async () => {
    expect(await leerMiConstancia('')).toEqual({ estado: 'error' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 25-sep-2026 (revisión en frío): una base en memoria que SÍ respeta los
// filtros, el orden, el límite y el tope de filas de PostgREST (max-rows, que
// se aplica después del orden). El fake encadenable ignora todo eso, y los dos
// bugs de esta ronda viven justo ahí: el hueco de las medidas y el corte de
// 1000 filas de la consola.
// ─────────────────────────────────────────────────────────────────────────────

type Fila = Record<string, unknown>;

function enMemoria(
  tablas: Record<string, Fila[]>,
  op: { maxFilas?: number; ignorarOrden?: boolean; fallan?: string[] } = {},
) {
  const queried: string[] = [];
  return {
    queried,
    from(tabla: string) {
      queried.push(tabla);
      const filtros: ((f: Fila) => boolean)[] = [];
      let orden: { col: string; asc: boolean } | null = null;
      let limite: number | null = null;
      const b: any = {
        select: () => b,
        eq: (c: string, v: unknown) => { filtros.push((f) => f[c] === v); return b; },
        in: (c: string, vs: unknown[]) => { filtros.push((f) => vs.includes(f[c])); return b; },
        gte: (c: string, v: unknown) => { filtros.push((f) => f[c] != null && String(f[c]) >= String(v)); return b; },
        gt: (c: string, v: number) => { filtros.push((f) => typeof f[c] === 'number' && (f[c] as number) > v); return b; },
        order: (c: string, o?: { ascending?: boolean }) => { orden = { col: c, asc: o?.ascending !== false }; return b; },
        limit: (n: number) => { limite = n; return b; },
        then: (ok: (r: unknown) => unknown, ko?: (e: unknown) => unknown) => {
          if (op.fallan?.includes(tabla)) return Promise.resolve({ data: null, error: { message: 'red' } }).then(ok, ko);
          let filas = (tablas[tabla] ?? []).filter((f) => filtros.every((fn) => fn(f)));
          const o = orden as { col: string; asc: boolean } | null;
          if (o && !op.ignorarOrden) {
            filas = [...filas].sort((x, y) => {
              const a = String(x[o.col] ?? ''); const z = String(y[o.col] ?? '');
              return o.asc ? a.localeCompare(z) : z.localeCompare(a);
            });
          }
          if (op.maxFilas != null) filas = filas.slice(0, op.maxFilas);
          if (limite != null) filas = filas.slice(0, limite);
          return Promise.resolve({ data: filas, error: null }).then(ok, ko);
        },
      };
      return b;
    },
    rpc: async () => ({ data: null, error: null }),
  };
}

describe('paridad con la consola cuando PostgREST corta en N filas', () => {
  const C2 = 'cliente-2';
  // 60 comidas VIEJAS de otro cliente, cargadas antes en la tabla, y una sola
  // comida reciente del cliente que mira. Tope: 50 filas por respuesta.
  const tablas = (): Record<string, Fila[]> => ({
    coach_clients: [
      { coach_id: 'coach-1', client_id: C2, status: 'active' },
      { coach_id: 'coach-1', client_id: C, status: 'active' },
    ],
    profiles: [
      { id: C, email: 'c@x.com', full_name: 'Cliente', tier: 'elite', tier_expires_at: null, is_test: false },
      { id: C2, email: 'd@x.com', full_name: 'Otro', tier: 'elite', tier_expires_at: null, is_test: false },
    ],
    user_interventions: [{ id: 'iv1', user_id: C, status: 'active', activated_at: '2026-01-10T10:00:00+00:00' }],
    food_logs: [
      ...Array.from({ length: 60 }, (_, i) => ({ user_id: C2, date: restarDias('2026-06-30', i) })),
      { user_id: C, date: '2026-09-22' },
    ],
  });

  it('con el orden descendente de la consola, el corte tira lo viejo y los dos dicen 0%', async () => {
    state.fake = enMemoria(tablas());
    const cliente = await leerMiConstancia(C);
    state.fake = enMemoria(tablas(), { maxFilas: 50 });
    const consola = await cargarClientes('coach-1');
    if (consola.estado !== 'ok') throw new Error('la consola no leyó');
    const coach = consola.datos.find((d) => d.id === C)?.adherencia;
    expect(coach).toEqual({ estado: 'ok', pct: 0, hechos: 0, esperados: 14 });
    expect(cliente).toEqual({ estado: 'ok', adherencia: coach });
  });

  it('control: si la consola no ordenara, el mismo corte tiraría la comida nueva y dirían cosas distintas', async () => {
    state.fake = enMemoria(tablas(), { maxFilas: 50, ignorarOrden: true });
    const consola = await cargarClientes('coach-1');
    if (consola.estado !== 'ok') throw new Error('la consola no leyó');
    expect(consola.datos.find((d) => d.id === C)?.adherencia).toEqual({ estado: 'sinDato', motivo: 'sin-senal' });
  });
});

describe('leerMisMedidas', () => {
  const HOY_M = '2026-09-25';
  const dia = (k: number) => restarDias('2026-09-24', 100 - k); // día 1..100

  it('peso diario 100 días + cintura solo el día 40 y el 100: la cintura cambia contra el día 40', async () => {
    const filas: Fila[] = [];
    for (let k = 1; k <= 100; k++) {
      filas.push({
        user_id: C, date: dia(k),
        weight_kg: Math.round((90 - (k - 1) * 0.1) * 10) / 10,
        waist_cm: k === 40 ? 96 : k === 100 ? 93.5 : null,
        body_fat_pct: null,
      });
    }
    state.fake = enMemoria({ health_measurements: filas });
    const r = await leerMisMedidas(C);
    if (r.estado !== 'ok') throw new Error('no leyó');
    expect(r.filas.length).toBe(4); // peso viejo y nuevo, cintura vieja y nueva
    const cuerpo = resumenCuerpo(r.filas, HOY_M);
    const cintura = cuerpo.find((m) => m.key === 'cintura');
    const peso = cuerpo.find((m) => m.key === 'peso');
    expect(cintura?.valor).toBe('93.5 cm');
    expect(dia(40)).toBe('2026-07-26');
    expect(cintura?.cambio).toBe('-2.5 cm desde el 26 jul');
    expect(peso?.valor).toBe('80.1 kg');
    expect(peso?.cambio).toBe('-9.9 kg desde el 17 jun');
    expect(cuerpo.find((m) => m.key === 'grasa')).toBeUndefined();
  });

  it('una sola cintura: es de verdad su primer registro (sin cambio inventado)', async () => {
    state.fake = enMemoria({ health_measurements: [
      { user_id: C, date: '2026-09-01', weight_kg: 80, waist_cm: null, body_fat_pct: null },
      { user_id: C, date: '2026-09-20', weight_kg: 79, waist_cm: 91, body_fat_pct: null },
    ] });
    const r = await leerMisMedidas(C);
    if (r.estado !== 'ok') throw new Error('no leyó');
    const cintura = resumenCuerpo(r.filas, HOY_M).find((m) => m.key === 'cintura');
    expect(cintura?.cambio).toBe(null);
    expect(cintura?.fecha).toBe('2026-09-20');
  });

  it('un 0 guardado no cuenta como la medida más nueva ni la más vieja', async () => {
    state.fake = enMemoria({ health_measurements: [
      { user_id: C, date: '2026-08-01', weight_kg: 0, waist_cm: null, body_fat_pct: null },
      { user_id: C, date: '2026-08-10', weight_kg: 82, waist_cm: null, body_fat_pct: null },
      { user_id: C, date: '2026-09-20', weight_kg: 80, waist_cm: null, body_fat_pct: null },
      { user_id: C, date: '2026-09-24', weight_kg: 0, waist_cm: null, body_fat_pct: null },
    ] });
    const r = await leerMisMedidas(C);
    if (r.estado !== 'ok') throw new Error('no leyó');
    expect(resumenCuerpo(r.filas, HOY_M)[0].cambio).toBe('-2 kg desde el 10 ago');
  });

  it('solo filas propias', async () => {
    state.fake = enMemoria({ health_measurements: [
      { user_id: 'otra', date: '2026-09-20', weight_kg: 70, waist_cm: null, body_fat_pct: null },
    ] });
    expect(await leerMisMedidas(C)).toEqual({ estado: 'ok', filas: [] });
  });

  it('seis consultas, una fila cada una', async () => {
    const fake = enMemoria({ health_measurements: [] });
    state.fake = fake;
    await leerMisMedidas(C);
    expect(fake.queried.length).toBe(6);
  });

  it('error de lectura: error (no "aún no registras")', async () => {
    state.fake = makeFakeSupabase({ health_measurements: { data: null, error: { message: 'red' } } });
    expect(await leerMisMedidas(C)).toEqual({ estado: 'error' });
    state.fake = enMemoria({ health_measurements: [] }, { fallan: ['health_measurements'] });
    expect(await leerMisMedidas(C)).toEqual({ estado: 'error' });
  });

  it('sin filas: ok vacío', async () => {
    state.fake = makeFakeSupabase({ health_measurements: vacio });
    expect(await leerMisMedidas(C)).toEqual({ estado: 'ok', filas: [] });
  });

  it('sin usuario: error', async () => {
    expect(await leerMisMedidas('')).toEqual({ estado: 'error' });
  });
});
