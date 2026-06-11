/**
 * Fase B (sprint captura unificada) — GATE de integración: capturar un valor →
 * el param aparece con valor en `components` del motor y el CE del área SUBE.
 *
 * Audita que cada formulario guarde EXACTAMENTE en la key que el motor lee:
 *  - test_de_equilibrio_en_un_pie / sentadilla_libre → matriz (Tests) → adapter
 *  - plank / bolt / old_man_test / recovery_hr → MOTOR_PASSTHROUGH_FT_KEYS
 *  - one_leg_balance (legacy) → alias de lectura → balance_1leg_s
 *  - Cooper → health_measurements.vo2max_estimate → loadUserData → adapter vo2max
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { resolveParamValues } from '../load-all-params';
import { buildMotorV2Input } from '../motor-v2-adapter';
import { computeMotorV2 } from '../motor-v2-service';
import type { UnifiedUserData } from '../edad-atp-v2-service';

const EMPTY = { lab: {}, bio: {}, ext: {}, hm: {}, quest: {}, ft: {} };
const BASE_DATA = { chronological_age: 40, sex: 'male', data_sources_used: [] } as unknown as UnifiedUserData;

function motorFrom(ft: Record<string, number>, dataExtra: Partial<UnifiedUserData> = {}) {
  const pv = resolveParamValues('male', { ...EMPTY, ft });
  const input = buildMotorV2Input({ ...BASE_DATA, ...dataExtra }, pv);
  return { pv, input, result: computeMotorV2(input) };
}

describe('captura → motor v2 (gate Fase B)', () => {
  const sinDatos = motorFrom({});

  it('balance (key de matriz test_de_equilibrio_en_un_pie) llega al motor y sube CE', () => {
    const { pv, input, result } = motorFrom({ test_de_equilibrio_en_un_pie: 45 });
    expect(pv.test_de_equilibrio_en_un_pie).toBe(45);
    expect(input.balance_1leg_s).toBe(45);
    const comp = result.areas.fitness.components.balance;
    expect(comp.value).toBe(45);
    expect(comp.score_0_100).not.toBeNull();
    expect(result.areas.fitness.ce).toBeGreaterThan(sinDatos.result.areas.fitness.ce);
  });

  it('legacy one_leg_balance se lee por alias (capturas previas no se pierden)', () => {
    const { input, result } = motorFrom({ one_leg_balance: 30 });
    expect(input.balance_1leg_s).toBe(30);
    expect(result.areas.fitness.components.balance.value).toBe(30);
  });

  it('la key nueva GANA sobre la legacy si ambas existen', () => {
    const { input } = motorFrom({ test_de_equilibrio_en_un_pie: 50, one_leg_balance: 10 });
    expect(input.balance_1leg_s).toBe(50);
  });

  it('passthrough plank/bolt/old_man_test/recovery_hr llegan con valor y suben CE', () => {
    const { result } = motorFrom({ plank: 95, bolt: 32, old_man_test: 9, recovery_hr: 28 });
    const f = result.areas.fitness;
    expect(f.components.plank.value).toBe(95);
    expect(f.components.bolt.value).toBe(32);
    expect(f.components.old_man_test.value).toBe(9);
    expect(f.components.recovery_hr.value).toBe(28);
    for (const k of ['plank', 'bolt', 'old_man_test', 'recovery_hr']) {
      expect(f.components[k].score_0_100).not.toBeNull();
    }
    // pesos presentes: plank 0.07 + bolt 0.05 + old_man 0.15 + recovery 0.05 = 0.32
    expect(f.ce).toBeCloseTo(0.32, 2);
  });

  it('sentadilla_libre (matriz) → squat_60s → componente sentadilla', () => {
    const { input, result } = motorFrom({ sentadilla_libre: 35 });
    expect(input.squat_60s).toBe(35);
    const comp = result.areas.fitness.components.sentadilla;
    expect(comp.value).toBe(35);
    expect(comp.score_0_100).toBe(80); // hombre, 30-39 reps → 80
  });

  it('Cooper → vo2max_estimate (health_measurements) → componente vo2max y CE +0.25', () => {
    const { input, result } = motorFrom({}, { vo2max_ml_kg_min: 38 });
    expect(input.vo2max).toBe(38);
    const comp = result.areas.fitness.components.vo2max;
    expect(comp.value).toBe(38);
    expect(comp.score_0_100).toBe(50); // hombre, 35-44 → 50
    expect(result.areas.fitness.ce).toBeCloseTo(sinDatos.result.areas.fitness.ce + 0.25, 2);
  });

  it('subjetivos inline (claridad/energía/memoria 1-7) llegan al área cognición', () => {
    const pv = resolveParamValues('male', { ...EMPTY, quest: { claridad_mental: 6, energia_mental: 5, memoria_autopercibida: 6 } });
    const input = buildMotorV2Input(BASE_DATA, pv);
    const result = computeMotorV2(input);
    const comp = result.areas.cognicion.components.subjetivos;
    expect(comp.value).toBeCloseTo(17 / 3, 4);
    expect(comp.score_0_100).not.toBeNull();
    expect(result.areas.cognicion.ce).toBeCloseTo(0.15, 2);
  });
});
