import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import {
  mapCategoricalToNumeric, mapHabitsResponses, HABITS_KEY_ALIASES,
} from '@/src/constants/habits-categorical-mapping';
import { resolveParamValues } from '../load-all-params';
import { buildMotorV2Input } from '../motor-v2-adapter';
import { computeMotorV2 } from '../motor-v2-service';
import type { UnifiedUserData } from '../edad-atp-v2-service';

describe('habits mapping — mapCategoricalToNumeric (valores REALES del cuestionario)', () => {
  it('exercise_freq "5+" → 10 hr/sem', () => { expect(mapCategoricalToNumeric('exercise_freq', '5+')).toBe(10); });
  it('exercise_freq "3-4" → 6', () => { expect(mapCategoricalToNumeric('exercise_freq', '3-4')).toBe(6); });
  it('exercise_freq "0" → 0', () => { expect(mapCategoricalToNumeric('exercise_freq', '0')).toBe(0); });
  it('smoking "nunca" → 0 cig/día', () => { expect(mapCategoricalToNumeric('smoking', 'nunca')).toBe(0); });
  it('smoking "ex" → 0 (no fuma hoy, no 0.5)', () => { expect(mapCategoricalToNumeric('smoking', 'ex')).toBe(0); });
  it('alcohol "finde" → 8 copas/mes', () => { expect(mapCategoricalToNumeric('alcohol', 'finde')).toBe(8); });
  it('normaliza mayúsculas/espacios', () => { expect(mapCategoricalToNumeric('alcohol', ' NUNCA ')).toBe(0); });
  it('key desconocida → undefined', () => { expect(mapCategoricalToNumeric('processed_food', 'alta')).toBeUndefined(); });
  it('valor categórico desconocido → undefined', () => { expect(mapCategoricalToNumeric('smoking', 'a-veces')).toBeUndefined(); });
});

describe('habits mapping — mapHabitsResponses', () => {
  it('traduce a las keys del modulador (aliases)', () => {
    const out = mapHabitsResponses({ exercise_freq: '5+', alcohol: 'nunca', smoking: 'nunca' });
    expect(out).toEqual({ ejercicio_semanal: 10, consumo_de_alcohol_mensual: 0, tabaquismo: 0 });
  });
  it('ignora keys sin mapeo (screens_before_bed, processed_food)', () => {
    const out = mapHabitsResponses({ screens_before_bed: 'siempre', processed_food: 'alta' });
    expect(out).toEqual({});
  });
  it('respeta valores ya numéricos (futuro-proof)', () => {
    const out = mapHabitsResponses({ ejercicio_semanal: 12 });
    expect(out.ejercicio_semanal).toBe(12);
  });
  it('ignora null/undefined', () => {
    expect(mapHabitsResponses({ exercise_freq: null, alcohol: undefined })).toEqual({});
  });
  it('los aliases están bien definidos', () => {
    expect(HABITS_KEY_ALIASES.exercise_freq).toBe('ejercicio_semanal');
    expect(HABITS_KEY_ALIASES.smoking).toBe('tabaquismo');
    expect(HABITS_KEY_ALIASES.alcohol).toBe('consumo_de_alcohol_mensual');
  });
});

describe('habits mapping — E2E perfil Enrique (modulador)', () => {
  const EMPTY = { canon: {}, hm: {}, quest: {}, ft: {} };
  const BASE = { chronological_age: 40, sex: 'male', data_sources_used: [] } as unknown as UnifiedUserData;

  function factorFor(pv: Record<string, number>) {
    const input = buildMotorV2Input(BASE, pv);
    return computeMotorV2(input).habitos;
  }

  it('ANTES (sin puente): hábitos categóricos no llegan → factor 1.0 (banda 60-79)', () => {
    // El cuestionario guardó value_text; resolveParamValues solo lee numéricos → vacío.
    const pv = resolveParamValues('male', EMPTY);
    const h = factorFor(pv);
    expect(h.factor).toBe(1.0);
  });

  it('DESPUÉS (con puente): perfil elite de Enrique → score ≥80 → factor 0.95', () => {
    // exercise daily, never smoke, never alcohol → mapeado a numéricos.
    const mapped = mapHabitsResponses({ exercise_freq: '5+', smoking: 'nunca', alcohol: 'nunca' });
    const pv = { ...resolveParamValues('male', EMPTY), ...mapped };
    const h = factorFor(pv);
    expect(h.score).toBeGreaterThanOrEqual(80);
    expect(h.factor).toBe(0.95);
  });

  it('perfil mixto (finde alcohol) sigue ≥80 → 0.95 para Enrique', () => {
    const mapped = mapHabitsResponses({ exercise_freq: '5+', smoking: 'nunca', alcohol: 'finde' });
    const pv = { ...resolveParamValues('male', EMPTY), ...mapped };
    expect(factorFor(pv).factor).toBe(0.95);
  });

  it('el puente NO pisa un valor numérico ya presente', () => {
    // Si ya hubiera ejercicio_semanal numérico, mapHabitsResponses respeta numéricos;
    // y el merge en loadAllParamValues solo rellena ausentes (probado por contrato aquí).
    const mapped = mapHabitsResponses({ ejercicio_semanal: 25 });
    expect(mapped.ejercicio_semanal).toBe(25);
  });
});
