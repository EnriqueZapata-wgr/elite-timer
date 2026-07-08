import { describe, expect, it } from 'vitest';

import {
  biomarkerFoodPriorities,
  buildAdvancedRecipeContext,
  cycleNutritionHint,
} from '../recipe-context-logic';

describe('biomarkerFoodPriorities', () => {
  it('ferritina baja → hierro heme', () => {
    const p = biomarkerFoodPriorities([{ key: 'ferritin', value: 18, unit: 'ng/mL' }]);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('hierro heme');
    expect(p[0]).toContain('18');
  });

  it('glucosa alta → low-carb; normal → nada', () => {
    expect(biomarkerFoodPriorities([{ key: 'glucose', value: 112, unit: 'mg/dL' }])[0]).toContain('low-carb');
    expect(biomarkerFoodPriorities([{ key: 'glucose', value: 85, unit: 'mg/dL' }])).toHaveLength(0);
  });

  it('vitamina D baja → pescados grasos', () => {
    const p = biomarkerFoodPriorities([{ key: 'vitamin_d', value: 22, unit: 'ng/mL' }]);
    expect(p[0]).toContain('salmón');
  });

  it('múltiples deficiencias acumulan prioridades', () => {
    const p = biomarkerFoodPriorities([
      { key: 'ferritin', value: 20, unit: 'ng/mL' },
      { key: 'triglycerides', value: 210, unit: 'mg/dL' },
      { key: 'hdl', value: 55, unit: 'mg/dL' }, // normal — no aplica
    ]);
    expect(p).toHaveLength(2);
  });

  it('biomarcadores desconocidos o NaN se ignoran', () => {
    expect(biomarkerFoodPriorities([
      { key: 'unicornio', value: 1, unit: 'x' },
      { key: 'glucose', value: NaN, unit: 'mg/dL' },
    ])).toHaveLength(0);
  });
});

describe('cycleNutritionHint', () => {
  it('cada fase tiene guía; null/desconocida no', () => {
    expect(cycleNutritionHint('menstrual')).toContain('hierro');
    expect(cycleNutritionHint('follicular')).toContain('carbohidratos');
    expect(cycleNutritionHint('luteal')).toContain('magnesio');
    expect(cycleNutritionHint(null)).toBeNull();
    expect(cycleNutritionHint('otra')).toBeNull();
  });
});

describe('buildAdvancedRecipeContext', () => {
  it('sin datos → null (usa flujo normal, más barato)', () => {
    expect(buildAdvancedRecipeContext({
      dietType: 'omnivore', allergies: [], dislikes: null,
      primaryGoal: null, biomarkerPriorities: [], cycleHint: null,
    })).toBeNull();
  });

  it('arma el bloque con alergias en mayúscula de prohibición', () => {
    const ctx = buildAdvancedRecipeContext({
      dietType: 'keto',
      allergies: ['cacahuate', 'mariscos'],
      dislikes: 'cilantro',
      primaryGoal: 'perder grasa',
      biomarkerPriorities: ['Ferritina baja (18 ng/mL): prioriza hierro heme'],
      cycleHint: 'Fase lútea: baja carbohidratos refinados',
    });
    expect(ctx).toContain('PERSONALIZACIÓN AVANZADA');
    expect(ctx).toContain('ALERGIAS (prohibido incluirlas): cacahuate, mariscos');
    expect(ctx).toContain('keto');
    expect(ctx).toContain('cilantro');
    expect(ctx).toContain('perder grasa');
    expect(ctx).toContain('LAB: Ferritina baja');
    expect(ctx).toContain('CICLO: Fase lútea');
  });

  it('dieta omnívora default no genera línea', () => {
    const ctx = buildAdvancedRecipeContext({
      dietType: 'omnivore', allergies: ['nuez'], dislikes: null,
      primaryGoal: null, biomarkerPriorities: [], cycleHint: null,
    });
    expect(ctx).not.toContain('omnivore');
    expect(ctx).toContain('nuez');
  });
});
