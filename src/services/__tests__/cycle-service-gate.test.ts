/**
 * MB-22.1 P4 — el blindaje amarrado DONDE VIVE EL RIESGO, no solo en la capa
 * pura. getCycleInfo es la raíz de TODOS los consumidores de salud (ARGOS,
 * day-compiler, recetas, prescripción, emociones): si devuelve datos en modo
 * acompañante, el ciclo de OTRA persona entra al contexto del usuario.
 *
 * Antes de este test, aflojar la raíz no tronaba nada. Ahora truena aquí.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase, type FakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({
  fake: null as any,
  mode: (async () => null) as (...args: unknown[]) => Promise<unknown>,
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (t: string) => state.fake.from(t),
    auth: { getUser: () => state.fake.auth.getUser() },
  },
}));
vi.mock('@/src/lib/logger', () => ({
  log: () => {}, warn: () => {}, error: () => {},
}));
vi.mock('@/src/services/app-mode-service', () => ({
  getCycleAppMode: (...args: unknown[]) => state.mode(...args),
  setCycleAppMode: async () => ({ ok: true }),
}));

import { getCycleInfo } from '@/src/services/cycle-service';

/**
 * 1-sep-2026: el periodo del fixture era una fecha FIJA (2026-07-20) y
 * getCycleInfo usa el reloj real. La guarda de frescura de resolverCiclo
 * (cycleLen + FRESCURA_DIAS_EXTRA = 42 dias) es correcta y no cambio, pero el
 * test caducaba solo: el 30 de agosto era el dia 42 y pasaba, el 1 de
 * septiembre era el 44 y devolvia null. Un test que se rompe por el calendario
 * no vigila nada. Ahora el periodo empezo hace 12 dias, siempre.
 */
function fechaHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function setup(sex: string | null, mode: 'propio' | 'acompanante' | null): FakeSupabase {
  const fake = makeFakeSupabase({
    client_profiles: { data: sex ? { biological_sex: sex } : null, error: null },
    cycle_periods: {
      data: [{ start_date: fechaHaceDias(12), end_date: fechaHaceDias(8) }],
      error: null,
    },
    cycle_settings: {
      data: { avg_cycle_length: 28, avg_period_length: 5 },
      error: null,
    },
  });
  state.fake = fake;
  state.mode = async () => mode;
  return fake;
}

beforeEach(() => { state.fake = null; });

describe('getCycleInfo: la raíz del ciclo hacia salud', () => {
  it('female en modo propio devuelve datos (lo de siempre)', async () => {
    setup('female', 'propio');
    const info = await getCycleInfo('user-test');
    expect(info).not.toBeNull();
    expect(info!.currentDay).toBeGreaterThan(0);
    expect(info!.currentPhase).toBeTruthy();
  });

  it('female sin fila de modo = propio (backfill 249 / usuaria nueva)', async () => {
    setup('female', null);
    expect(await getCycleInfo('user-test')).not.toBeNull();
  });

  it('ACOMPAÑANTE devuelve null AUNQUE sea female, y ni siquiera consulta las tablas de ciclo', async () => {
    // LA mutación que este test entierra: quitarle el modo al gate de la
    // raíz. Si esto pasa, los datos del calendario de otra persona entran a
    // ARGOS, day-compiler, recetas y prescripción como salud del usuario.
    const fake = setup('female', 'acompanante');
    expect(await getCycleInfo('user-test')).toBeNull();
    expect(fake.queried).not.toContain('cycle_periods');
    expect(fake.queried).not.toContain('cycle_settings');
  });

  it('male devuelve null en cualquier modo, sin tocar tablas de ciclo', async () => {
    const fake = setup('male', null);
    expect(await getCycleInfo('user-test')).toBeNull();
    expect(fake.queried).not.toContain('cycle_periods');

    const fake2 = setup('male', 'acompanante');
    expect(await getCycleInfo('user-test')).toBeNull();
    expect(fake2.queried).not.toContain('cycle_periods');
  });

  it('sin perfil → null (fail-safe)', async () => {
    setup(null, null);
    expect(await getCycleInfo('user-test')).toBeNull();
  });
});
