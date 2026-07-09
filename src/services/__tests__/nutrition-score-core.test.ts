import { describe, it, expect } from 'vitest';
import {
  computeNutritionScore,
  proteinTargetG,
  macroPercents,
  macrosInAtpRange,
  scoreColor,
  detectMicrosFromDescriptions,
  mealsWithinWindows,
  qualityRatioFromMealScores,
  ATP_MACRO_RANGES,
  DEFAULT_WEIGHT_KG,
  type ScoreInputs,
} from '@/src/services/nutrition-score-core';
import { DEFAULT_MEAL_TIMES } from '@/src/services/meal-times-core';

/** Día ATP-perfecto para un usuario de 80kg (target proteína 144g). */
const PERFECT_SIMPLE: ScoreInputs = {
  mode: 'simple',
  weightKg: 80,
  proteinG: 150,  // >= target
  carbsG: 60,     // %kcal dentro de 0-25
  fatG: 120,      // grasas dominantes (50-75%)
  waterMl: 2500,
  waterGoalMl: 2500,
  mealsLogged: 3,
};

describe('proteinTargetG — target por peso (1.8 g/kg)', () => {
  it('80kg → 144g · 60kg → 108g', () => {
    expect(proteinTargetG(80)).toBe(144);
    expect(proteinTargetG(60)).toBe(108);
  });
  it('sin peso → fallback documentado (70kg → 126g)', () => {
    expect(proteinTargetG(null)).toBe(Math.round(DEFAULT_WEIGHT_KG * 1.8));
    expect(proteinTargetG(0)).toBe(126);
    expect(proteinTargetG(NaN)).toBe(126);
  });
});

describe('macroPercents + macrosInAtpRange — filosofía ATP', () => {
  it('calcula % de kcal (proteína/carbos 4, grasa 9)', () => {
    // 100g P (400) + 50g C (200) + 44.4g F (400) ≈ 1000 kcal
    const p = macroPercents(100, 50, 44.44)!;
    expect(p.protein).toBeCloseTo(40, 0);
    expect(p.carbs).toBeCloseTo(20, 0);
    expect(p.fat).toBeCloseTo(40, 0);
  });
  it('sin kcal → null (no hay qué evaluar)', () => {
    expect(macroPercents(0, 0, 0)).toBeNull();
  });
  it('día keto-ATP: carbos 10% / grasa 65% / proteína 25% → 3 de 3 en rango', () => {
    expect(macrosInAtpRange({ carbs: 10, fat: 65, protein: 25 })).toBe(3);
  });
  it('dieta alta en carbos (55%) viola el rango ATP', () => {
    expect(macrosInAtpRange({ carbs: 55, fat: 25, protein: 20 })).toBe(1); // solo proteína
    expect(ATP_MACRO_RANGES.carbs.max).toBe(25);
  });
});

describe('computeNutritionScore — modo SIMPLE (40/30/30)', () => {
  it('día perfecto → 100', () => {
    const s = computeNutritionScore(PERFECT_SIMPLE);
    expect(s.total).toBe(100);
    expect(s.protein).toBe(40);
    expect(s.hydration).toBe(30);
    expect(s.macroBalance).toBe(30);
    expect(s.micros).toBeNull(); // bloques de completo apagados
    expect(s.highlights).toContain('Proteína al 100%');
  });

  it('día vacío → solo cuenta hidratación', () => {
    const s = computeNutritionScore({
      mode: 'simple', weightKg: 80, proteinG: 0, carbsG: 0, fatG: 0,
      waterMl: 1250, waterGoalMl: 2500, mealsLogged: 0,
    });
    expect(s.protein).toBe(0);
    expect(s.macroBalance).toBe(0); // sin comidas no hay balance que premiar
    expect(s.hydration).toBe(15);   // 50% del bloque
    expect(s.total).toBe(15);
    expect(s.redFlags).toContain('Sin comidas registradas');
  });

  it('proteína proporcional al target (72g de 144g → 20 de 40 pts)', () => {
    const s = computeNutritionScore({ ...PERFECT_SIMPLE, proteinG: 72, carbsG: 0, fatG: 0, waterMl: 0 });
    expect(s.protein).toBe(20);
  });

  it('proteína por encima del target no da puntos extra (cap 100%)', () => {
    const s = computeNutritionScore({ ...PERFECT_SIMPLE, proteinG: 400 });
    expect(s.protein).toBe(40);
  });

  it('carbos altos → red flag ATP', () => {
    const s = computeNutritionScore({ ...PERFECT_SIMPLE, carbsG: 300, fatG: 30 });
    expect(s.redFlags.some(f => f.includes('Carbohidratos'))).toBe(true);
    expect(s.macroBalance).toBeLessThan(30);
  });
});

describe('computeNutritionScore — modo COMPLETO (25/15/20/15/10/15)', () => {
  const BASE: ScoreInputs = {
    ...PERFECT_SIMPLE,
    mode: 'complete',
    microsPresent: ['vitamina_d', 'b12', 'magnesio', 'zinc'],
    mealsInWindow: 3,
    qualityRatio: 1,
  };

  it('día perfecto → 100 con todos los bloques activos', () => {
    const s = computeNutritionScore(BASE);
    expect(s.total).toBe(100);
    expect(s.protein).toBe(25);
    expect(s.hydration).toBe(15);
    expect(s.macroBalance).toBe(20);
    expect(s.micros).toBe(15);
    expect(s.timing).toBe(10);
    expect(s.quality).toBe(15);
  });

  it('micros parciales: 2 de 4 → 7.5 pts', () => {
    const s = computeNutritionScore({ ...BASE, microsPresent: ['b12', 'zinc'] });
    expect(s.micros).toBe(7.5);
  });

  it('timing: 1 de 3 comidas en ventana → 1/3 del bloque + red flag', () => {
    const s = computeNutritionScore({ ...BASE, mealsInWindow: 1 });
    expect(s.timing).toBeCloseTo(10 / 3, 1);
    expect(s.redFlags.some(f => f.includes('ventana'))).toBe(true);
  });

  it('calidad SIN dato → mitad del bloque (neutral, no castiga)', () => {
    const s = computeNutritionScore({ ...BASE, qualityRatio: null });
    expect(s.quality).toBe(7.5);
  });

  it('predominio de procesados → red flag', () => {
    const s = computeNutritionScore({ ...BASE, qualityRatio: 0.2 });
    expect(s.quality).toBe(3);
    expect(s.redFlags.some(f => f.includes('procesados'))).toBe(true);
  });

  it('total siempre en [0, 100] y entero', () => {
    const s = computeNutritionScore({ ...BASE, proteinG: 999, waterMl: 99999 });
    expect(Number.isInteger(s.total)).toBe(true);
    expect(s.total).toBeLessThanOrEqual(100);
    expect(s.total).toBeGreaterThanOrEqual(0);
  });
});

describe('scoreColor — semáforo del hub', () => {
  it('<50 rojo tenue · 50-69 gris · 70+ lima', () => {
    expect(scoreColor(30)).toBe('#fb7185');
    expect(scoreColor(50)).toBe('#888888');
    expect(scoreColor(69)).toBe('#888888');
    expect(scoreColor(70)).toBe('#A8E02A');
    expect(scoreColor(100)).toBe('#A8E02A');
  });
});

describe('mealsWithinWindows — timing modo completo', () => {
  it('comida dentro de su ventana (± tolerancia 60min) cuenta', () => {
    // DEFAULT_MEAL_TIMES.lunch típico ~13:00-15:00 → 12:30 entra con tolerancia
    const n = mealsWithinWindows(
      [{ mealType: 'lunch', mealTime: '13:30:00' }],
      DEFAULT_MEAL_TIMES,
    );
    expect(n).toBe(1);
  });
  it('comida muy fuera de ventana NO cuenta', () => {
    const n = mealsWithinWindows(
      [{ mealType: 'breakfast', mealTime: '23:50:00' }],
      DEFAULT_MEAL_TIMES,
    );
    expect(n).toBe(0);
  });
  it('sin hora o sin ventana configurada → cuenta como dentro (no castigar data faltante)', () => {
    const n = mealsWithinWindows(
      [
        { mealType: 'lunch', mealTime: null },
        { mealType: 'tipo_libre', mealTime: '03:00:00' },
        { mealType: null, mealTime: '03:00:00' },
      ],
      DEFAULT_MEAL_TIMES,
    );
    expect(n).toBe(3);
  });
});

describe('qualityRatioFromMealScores', () => {
  it('promedia scores 0-100 disponibles → ratio 0..1', () => {
    expect(qualityRatioFromMealScores([80, 60, null, undefined])).toBeCloseTo(0.7, 5);
  });
  it('sin ningún dato → null (neutral en el core)', () => {
    expect(qualityRatioFromMealScores([])).toBeNull();
    expect(qualityRatioFromMealScores([null, undefined])).toBeNull();
  });
  it('clamp a [0,1]', () => {
    expect(qualityRatioFromMealScores([150])).toBe(1);
  });
});

describe('detectMicrosFromDescriptions — heurística v1', () => {
  it('detecta micros por keywords es-MX', () => {
    const micros = detectMicrosFromDescriptions(['Salmón con espinacas y aguacate', 'Tacos de res']);
    expect(micros).toContain('vitamina_d'); // salmón
    expect(micros).toContain('magnesio');   // espinaca/aguacate
    expect(micros).toContain('b12');        // res/salmón
    expect(micros).toContain('zinc');       // res
  });
  it('descripciones vacías o sin matches → []', () => {
    expect(detectMicrosFromDescriptions([])).toEqual([]);
    expect(detectMicrosFromDescriptions(['pan blanco con mermelada'])).toEqual([]);
  });
});
