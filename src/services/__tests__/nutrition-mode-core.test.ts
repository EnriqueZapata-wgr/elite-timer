import { describe, it, expect } from 'vitest';
import {
  resolveNutritionMode,
  macroModeFor,
  isFeatureVisible,
} from '@/src/services/nutrition-mode-core';

describe('resolveNutritionMode — verdad + fallback macro_mode (T2 #52)', () => {
  it('nutrition_mode explícito gana', () => {
    expect(resolveNutritionMode({ nutrition_mode: 'complete', macro_mode: false })).toBe('complete');
    expect(resolveNutritionMode({ nutrition_mode: 'simple', macro_mode: true })).toBe('simple');
  });
  it('perfil pre-166 → deriva de macro_mode', () => {
    expect(resolveNutritionMode({ nutrition_mode: null, macro_mode: true })).toBe('complete');
    expect(resolveNutritionMode({ nutrition_mode: null, macro_mode: false })).toBe('simple');
  });
  it('sin fila / valores basura → simple (default filosofía)', () => {
    expect(resolveNutritionMode(null)).toBe('simple');
    expect(resolveNutritionMode(undefined)).toBe('simple');
    expect(resolveNutritionMode({ nutrition_mode: 'garbage' as any })).toBe('simple');
  });
});

describe('macroModeFor — sync transicional', () => {
  it('complete → macros visibles; simple → ocultos', () => {
    expect(macroModeFor('complete')).toBe(true);
    expect(macroModeFor('simple')).toBe(false);
  });
});

describe('isFeatureVisible — mapa de cards del hub (T1)', () => {
  it('SIMPLE: solo score, registrar, ayuno y ARGOS', () => {
    expect(isFeatureVisible('score', 'simple')).toBe(true);
    expect(isFeatureVisible('register', 'simple')).toBe(true);
    expect(isFeatureVisible('fasting', 'simple')).toBe(true);
    expect(isFeatureVisible('argos', 'simple')).toBe(true);
    expect(isFeatureVisible('recipes', 'simple')).toBe(false);
    expect(isFeatureVisible('supplements', 'simple')).toBe(false);
    expect(isFeatureVisible('glucose', 'simple')).toBe(false);
    expect(isFeatureVisible('scanner', 'simple')).toBe(false);
  });
  it('COMPLETO: todo visible', () => {
    (['score', 'register', 'fasting', 'recipes', 'supplements', 'argos', 'glucose', 'scanner'] as const)
      .forEach(f => expect(isFeatureVisible(f, 'complete')).toBe(true));
  });
});
