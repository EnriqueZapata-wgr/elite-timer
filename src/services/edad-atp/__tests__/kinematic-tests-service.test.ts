import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase: captura inserts y sirve datos por tabla para los selects encadenados.
const inserted: Array<{ table: string; row: any }> = [];
const tableData: Record<string, any[]> = {};
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: any) => { inserted.push({ table, row }); return Promise.resolve({ error: null }); },
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: tableData[table] ?? [], error: null }),
        }),
      }),
    }),
  },
}));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import {
  validateKinematic, saveKinematicTest, getLatestKinematicTests, KINEMATIC_KEYS,
} from '../kinematic-tests-service';

beforeEach(() => {
  inserted.length = 0;
  for (const k of Object.keys(tableData)) delete tableData[k];
});

describe('kinematic-tests-service — validateKinematic', () => {
  it('acepta plank en rango', () => { expect(validateKinematic('plank', 180).ok).toBe(true); });
  it('rechaza plank fuera de rango (>600)', () => { expect(validateKinematic('plank', 999).ok).toBe(false); });
  it('rechaza bolt >120', () => { expect(validateKinematic('bolt', 130).ok).toBe(false); });
  it('acepta old_man_test 10 pts', () => { expect(validateKinematic('old_man_test', 10).ok).toBe(true); });
  it('rechaza old_man_test 11 (escala 0–10)', () => { expect(validateKinematic('old_man_test', 11).ok).toBe(false); });
  it('rechaza NaN', () => { expect(validateKinematic('recovery_hr', NaN).ok).toBe(false); });
  it('cubre los 4 keys cinemáticos', () => {
    expect(KINEMATIC_KEYS).toEqual(['plank', 'bolt', 'old_man_test', 'recovery_hr']);
  });
});

describe('kinematic-tests-service — saveKinematicTest (dual-write)', () => {
  it('escribe a la fuente del motor Y a la tabla dedicada', async () => {
    const r = await saveKinematicTest('u1', 'plank', 180, 'seconds');
    expect(r.ok).toBe(true);
    expect(inserted).toHaveLength(2);
    // 1º: fuente del motor (passthrough)
    expect(inserted[0].table).toBe('edad_atp_functional_tests');
    expect(inserted[0].row).toMatchObject({ user_id: 'u1', test_key: 'plank', value_primary: 180 });
    // 2º: expediente dedicado
    expect(inserted[1].table).toBe('fitness_kinematic_tests');
    expect(inserted[1].row).toMatchObject({ user_id: 'u1', test_key: 'plank', value: 180, unit: 'seconds' });
  });

  it('valida ANTES de escribir: valor fuera de rango → no inserta', async () => {
    const r = await saveKinematicTest('u1', 'plank', 99999, 'seconds');
    expect(r.ok).toBe(false);
    expect(inserted).toHaveLength(0);
  });

  it('recovery_hr guarda el delta con unidad bpm', async () => {
    await saveKinematicTest('u1', 'recovery_hr', 30, 'bpm', 'pico 170 / 1min 140');
    expect(inserted[0].row).toMatchObject({ test_key: 'recovery_hr', value_primary: 30 });
    expect(inserted[1].row).toMatchObject({ value: 30, unit: 'bpm', notes: 'pico 170 / 1min 140' });
  });
});

describe('kinematic-tests-service — getLatestKinematicTests', () => {
  it('lee de la tabla dedicada y rellena faltantes desde la fuente del motor', async () => {
    tableData.fitness_kinematic_tests = [{ test_key: 'plank', value: 180, measured_at: '2026-06-14T10:00:00Z' }];
    tableData.edad_atp_functional_tests = [{ test_key: 'bolt', value_primary: 40, measured_at: '2026-06-13T10:00:00Z' }];
    const out = await getLatestKinematicTests('u1');
    expect(out.plank?.value).toBe(180);   // dedicada
    expect(out.bolt?.value).toBe(40);     // fallback motor-source
  });

  it('sin datos → objeto vacío (no crashea)', async () => {
    const out = await getLatestKinematicTests('u1');
    expect(out).toEqual({});
  });

  it('la tabla dedicada gana sobre la fuente del motor para el mismo key', async () => {
    tableData.fitness_kinematic_tests = [{ test_key: 'plank', value: 200, measured_at: '2026-06-14T10:00:00Z' }];
    tableData.edad_atp_functional_tests = [{ test_key: 'plank', value_primary: 150, measured_at: '2026-06-10T10:00:00Z' }];
    const out = await getLatestKinematicTests('u1');
    expect(out.plank?.value).toBe(200);
  });
});
