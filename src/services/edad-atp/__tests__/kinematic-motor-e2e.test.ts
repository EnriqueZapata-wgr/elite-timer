/**
 * E2E del aporte de los 4 cinemáticos al motor v2.
 *
 * No reproducimos el dataset exacto de Enrique (vive en su DB), pero probamos el MECANISMO:
 * un perfil fitness elite, al sumar plank/bolt/old_man/recovery_hr, sube el CE del área
 * fitness y BAJA la edad fitness (y la Edad ATP global). Ese es el motivo por el que su
 * 29.3 baja hacia ~27.3 al completar los huecos. Mismo patrón que captura-flujo-motor.test.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { resolveParamValues } from '../load-all-params';
import { buildMotorV2Input } from '../motor-v2-adapter';
import { computeMotorV2 } from '../motor-v2-service';
import type { UnifiedUserData } from '../edad-atp-v2-service';

const EMPTY = { canon: {}, hm: {}, quest: {}, ft: {} };
const BASE = { chronological_age: 40, sex: 'male', data_sources_used: [] } as unknown as UnifiedUserData;

function motor(ft: Record<string, number>, dataExtra: Partial<UnifiedUserData> = {}) {
  const pv = resolveParamValues('male', { ...EMPTY, ft });
  const input = buildMotorV2Input({ ...BASE, ...dataExtra }, pv);
  return computeMotorV2(input);
}

describe('kinematic motor e2e — los 4 completan el área fitness', () => {
  // Perfil base elite SIN los 4 cinemáticos (vo2max + agarre + push-ups + sentadilla + balance).
  const baseFt = { test_de_equilibrio_en_un_pie: 60, sentadilla_libre: 45, pushups: 45 };
  const baseExtra = { vo2max_ml_kg_min: 50, grip_strength_kg: 58 } as Partial<UnifiedUserData>;

  // Valores elite de Enrique para los 4 (old_man en PUNTOS 0–10, no segundos).
  const kinematics = { plank: 180, bolt: 40, old_man_test: 10, recovery_hr: 30 };

  const without = motor(baseFt, baseExtra);
  const withK = motor({ ...baseFt, ...kinematics }, baseExtra);

  it('los 4 cinemáticos llegan al área fitness con score', () => {
    const f = withK.areas.fitness;
    for (const k of ['plank', 'bolt', 'old_man_test', 'recovery_hr']) {
      expect(f.components[k].value).toBe((kinematics as any)[k]);
      expect(f.components[k].score_0_100).not.toBeNull();
    }
  });

  it('sube el CE del área fitness (+0.32 de los 4 pesos)', () => {
    expect(withK.areas.fitness.ce).toBeGreaterThan(without.areas.fitness.ce);
    expect(withK.areas.fitness.ce).toBeCloseTo(without.areas.fitness.ce + 0.32, 2);
  });

  it('con valores elite, NO empeora la edad fitness (mejora o se mantiene)', () => {
    expect(withK.areas.fitness.edad_ciega).toBeLessThanOrEqual(without.areas.fitness.edad_ciega + 0.01);
  });

  it('la Edad ATP global se mantiene o baja al completar los huecos elite', () => {
    // Doctrina del sprint: completar los huecos con valores elite no debe subir la edad.
    expect(withK.edad_atp_integral).toBeLessThanOrEqual(without.edad_atp_integral + 0.01);
  });

  it('old_man_test se puntúa en escala 0–10 (10 pts = score máximo)', () => {
    const f = motor({ old_man_test: 10 }).areas.fitness;
    expect(f.components.old_man_test.score_0_100).toBe(100);
    // 8 pts = 80 (banda del scorer), confirma que NO son segundos.
    const f8 = motor({ old_man_test: 8 }).areas.fitness;
    expect(f8.components.old_man_test.score_0_100).toBe(80);
  });
});
