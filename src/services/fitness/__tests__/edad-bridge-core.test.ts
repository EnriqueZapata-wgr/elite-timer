import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import {
  tierAFunctionalEntries,
  computeTierBProjection,
  benchmarkInfo,
  NUDGE_CAP_TOTAL,
  NUDGE_MAX_POR_BENCHMARK,
  PUSHUPS_NORMA_FEMENINA_DISPONIBLE,
  type SessionSetLike,
} from '../edad-bridge-core';
import { resolveParamValues } from '@/src/services/edad-atp/load-all-params';
import { computeAreaFitness } from '@/src/services/edad-atp/area-fitness-service';
import type { MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const set = (slug: string, reps: number, weightKg: number | null = null): SessionSetLike => ({ slug, reps, weightKg });

// ── Tier A ──

describe('tierAFunctionalEntries', () => {
  it('push-ups: mejor set SIN lastre → test_key pushups (hombres)', () => {
    const r = tierAFunctionalEntries([set('push-up', 22), set('push-up', 31), set('push-up', 18)], 'male');
    expect(r.entries).toEqual([{ test_key: 'pushups', value_primary: 31 }]);
    expect(r.alimentado[0]).toContain('31');
  });

  it('sets con lastre NO alimentan la norma (es a peso corporal)', () => {
    const r = tierAFunctionalEntries([set('push-up', 15, 10)], 'male');
    expect(r.entries).toEqual([]);
  });

  it('mujeres: push-ups se omite con aviso (umbral derivado en hombres, sin banda propia)', () => {
    expect(PUSHUPS_NORMA_FEMENINA_DISPONIBLE).toBe(false);
    const r = tierAFunctionalEntries([set('push-up', 30)], 'female');
    expect(r.entries).toEqual([]);
    expect(r.avisos.length).toBe(1);
    expect(r.avisos[0]).toMatch(/omitir/i);
  });

  it('plancha estándar alimenta plank en ambos sexos (segundos)', () => {
    const h = tierAFunctionalEntries([set('hand-plank', 95)], 'male');
    const m = tierAFunctionalEntries([set('hand-plank', 95)], 'female');
    expect(h.entries).toEqual([{ test_key: 'plank', value_primary: 95 }]);
    expect(m.entries).toEqual(h.entries);
  });

  it('variantes Tier A NO estrictas (diamond/incline/side plank) no alimentan la norma', () => {
    const r = tierAFunctionalEntries(
      [set('diamond-push-ups', 20), set('incline-push-up', 30), set('elbow-side-plank', 60)],
      'male',
    );
    expect(r.entries).toEqual([]);
  });

  it('las test_key del puente son EXACTAMENTE las que el motor lee (cadena verificable)', () => {
    // 1. El puente produce entries con test_key 'pushups'/'plank'.
    const r = tierAFunctionalEntries([set('push-up', 40), set('hand-plank', 120)], 'male');
    const ft: Record<string, number> = {};
    for (const e of r.entries) ft[e.test_key] = e.value_primary;
    // 2. resolveParamValues (el MISMO camino que loadAllParamValues usa en
    //    producción) resuelve esas keys desde edad_atp_functional_tests.
    const params = resolveParamValues('male', { canon: {}, hm: {}, quest: {}, ft });
    expect(params.pushups).toBe(40);
    expect(params.plank).toBe(120);
  });
});

// ── Un PR de benchmark mueve la Edad ATP (Gate C) ──

describe('un PR de benchmark mueve la Edad ATP de forma verificable', () => {
  const base: MotorV2Input = {
    chronological_age: 40,
    sex: 'male',
    vo2max: 40, grip_strength_kg: 45, old_man_test: 8,
  } as MotorV2Input;

  it('subir push-ups de 10 a 40 baja la edad ciega del área fitness (motor intacto)', () => {
    const antes = computeAreaFitness({ ...base, push_ups: 10 });
    const despues = computeAreaFitness({ ...base, push_ups: 40 });
    expect(despues.edad_ciega).toBeLessThan(antes.edad_ciega);
  });

  it('cap duro: el nudge Tier B total NUNCA domina a una primaria', () => {
    // Efecto real de la primaria push-ups entre banda baja y alta:
    const antes = computeAreaFitness({ ...base, push_ups: 10 });
    const despues = computeAreaFitness({ ...base, push_ups: 40 });
    const efectoPrimaria = antes.edad_ciega - despues.edad_ciega;
    expect(NUDGE_CAP_TOTAL).toBeLessThan(efectoPrimaria);
  });
});

// ── Tier B ──

describe('computeTierBProjection', () => {
  it('relativo ×BW, nunca absoluto: deadlift 2×BW llega al target', () => {
    const p = computeTierBProjection([set('barbell-deadlift', 1, 160)], 80, 'male');
    expect(p.detalle).toHaveLength(1);
    expect(p.detalle[0].key).toBe('deadlift_xbw');
    expect(p.detalle[0].progreso).toBe(1);
    expect(p.detalle[0].years).toBe(-NUDGE_MAX_POR_BENCHMARK);
  });

  it('sin peso corporal, los benchmarks ×BW se omiten (relativo o nada)', () => {
    const p = computeTierBProjection([set('barbell-deadlift', 5, 180)], null, 'male');
    expect(p.detalle).toHaveLength(0);
    expect(p.texto).toBeNull();
  });

  it('wall-sit y pull-ups entran por reps/segundos máximos', () => {
    const p = computeTierBProjection([set('wall-sit', 60), set('pull-ups', 5)], 80, 'male');
    const keys = p.detalle.map((d) => d.key).sort();
    expect(keys).toEqual(['pullups_max', 'wall_sit']);
    const wallSit = p.detalle.find((d) => d.key === 'wall_sit')!;
    expect(wallSit.progreso).toBeCloseTo(0.5); // 60/120 s
  });

  it('cada benchmark se acota a su cap y el total al cap duro', () => {
    const sets = [
      set('barbell-deadlift', 1, 400),      // muy por encima del target → progreso 1
      set('pull-ups', 30),
      set('pull-ups-lastre', 5, 80),
      set('kettlebell-farmers-carry', 10, 120),
      set('wall-sit', 600),
    ];
    const p = computeTierBProjection(sets, 80, 'male');
    for (const d of p.detalle) {
      expect(Math.abs(d.years)).toBeLessThanOrEqual(NUDGE_MAX_POR_BENCHMARK);
    }
    expect(Math.abs(p.years)).toBeLessThanOrEqual(NUDGE_CAP_TOTAL);
    expect(p.texto).toMatch(/experto/);
  });

  it('pull-ups y chin-ups comparten key (no doble conteo)', () => {
    const p = computeTierBProjection([set('pull-ups', 8), set('chin-ups', 10)], 80, 'male');
    expect(p.detalle.filter((d) => d.key === 'pullups_max')).toHaveLength(1);
    expect(p.detalle[0].progreso).toBe(1); // el mejor de los dos (10/10)
  });
});

// ── Badge para UI ──

describe('benchmarkInfo', () => {
  it('Tier A estricto alimenta directo; variantes solo badge', () => {
    expect(benchmarkInfo({ slug: 'push-up', benchmark: { tier: 'A', variante: 'push-ups' } }).alimentaDirecto).toBe(true);
    expect(benchmarkInfo({ slug: 'diamond-push-ups', benchmark: { tier: 'A', variante: 'push-ups' } }).alimentaDirecto).toBe(false);
    expect(benchmarkInfo({ slug: 'pull-ups', benchmark: { tier: 'B', variante: 'max' } }).alimentaDirecto).toBe(false);
  });
});

// ── MB-3.6 Bloque 5: broad jump (distancia) + dead hang (segundos) ──

describe('broad jump activado (distancia ×estatura)', () => {
  const jump = (cm: number | null): SessionSetLike => ({ slug: 'broad-jump', reps: 1, weightKg: null, distanceCm: cm });

  it('con distancia y estatura: progreso = cm/estatura (target 1×estatura)', () => {
    const p = computeTierBProjection([jump(175)], 80, 'male', 175);
    const d = p.detalle.find((x) => x.key === 'broad_jump');
    expect(d).toBeDefined();
    expect(d!.progreso).toBe(1);
    expect(d!.years).toBeCloseTo(-NUDGE_MAX_POR_BENCHMARK, 5);
  });

  it('mejor intento de la sesión manda', () => {
    const p = computeTierBProjection([jump(120), jump(160), jump(140)], 80, 'male', 200);
    const d = p.detalle.find((x) => x.key === 'broad_jump')!;
    expect(d.progreso).toBeCloseTo(0.8, 5);
  });

  it('sin estatura declarada se OMITE (relativo o nada — mejor omitir que mentir)', () => {
    const p = computeTierBProjection([jump(180)], 80, 'male', null);
    expect(p.detalle.find((x) => x.key === 'broad_jump')).toBeUndefined();
  });

  it('sin distancia capturada (reps viejas) se omite', () => {
    const p = computeTierBProjection([set('broad-jump', 5)], 80, 'male', 175);
    expect(p.detalle.find((x) => x.key === 'broad_jump')).toBeUndefined();
  });
});

describe('dead hang desde el runner (isométrico: reps = segundos)', () => {
  it('120 s (hombre) llega al target; 60 s = progreso 0.5', () => {
    const full = computeTierBProjection([set('dead-hang', 120)], null, 'male');
    expect(full.detalle.find((x) => x.key === 'dead_hang')!.progreso).toBe(1);
    const half = computeTierBProjection([set('dead-hang', 60)], null, 'male');
    expect(half.detalle.find((x) => x.key === 'dead_hang')!.progreso).toBe(0.5);
  });

  it('mujer: target 90 s', () => {
    const p = computeTierBProjection([set('dead-hang', 90)], null, 'female');
    expect(p.detalle.find((x) => x.key === 'dead_hang')!.progreso).toBe(1);
  });

  it('no requiere peso corporal (es hold, no ×BW)', () => {
    const p = computeTierBProjection([set('dead-hang', 45)], null, 'male');
    expect(p.detalle).toHaveLength(1);
  });
});
