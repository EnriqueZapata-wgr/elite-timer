import { describe, it, expect } from 'vitest';
import {
  computeDxQuality,
  computeDataDensityScore,
  AREA_QUESTIONNAIRES_FOR_L3,
  DENSITY_SCORE_FOR_L2,
  DENSITY_SCORE_FOR_L3,
  type DxSourcePresence,
} from '../dx-quality-core';

function sources(p: Partial<DxSourcePresence> = {}): DxSourcePresence {
  return {
    hasBasicHistory: true,
    hasIntegralQuestionnaire: false,
    areaQuestionnairesCount: 0,
    hasConsistentHabits: false,
    hasLabs: false,
    hasGenetics: false,
    hasBraverman: false,
    quizzesCount: 0,
    symptomsCount: 0,
    padecimientosCount: 0,
    supplementsCount: 0,
    ...p,
  };
}

describe('computeDataDensityScore', () => {
  it('vacío total → 0; solo historia básica → 1', () => {
    expect(computeDataDensityScore(sources({ hasBasicHistory: false }))).toBe(0);
    expect(computeDataDensityScore(sources())).toBe(1);
  });

  it('pesos: integral 3, braverman 2, labs 2, quizzes/áreas con tope', () => {
    expect(computeDataDensityScore(sources({ hasIntegralQuestionnaire: true }))).toBe(4);
    expect(computeDataDensityScore(sources({ hasBraverman: true }))).toBe(3);
    expect(computeDataDensityScore(sources({ hasLabs: true }))).toBe(3);
    // tope de quizzes en 2 y áreas en AREA_QUESTIONNAIRES_FOR_L3
    expect(computeDataDensityScore(sources({ quizzesCount: 9 }))).toBe(3);
    expect(computeDataDensityScore(sources({ areaQuestionnairesCount: 9 }))).toBe(1 + AREA_QUESTIONNAIRES_FOR_L3);
  });

  it('síntomas puntúan a partir de 3; padecimientos/suplementos desde 1', () => {
    expect(computeDataDensityScore(sources({ symptomsCount: 2 }))).toBe(1);
    expect(computeDataDensityScore(sources({ symptomsCount: 3 }))).toBe(2);
    expect(computeDataDensityScore(sources({ padecimientosCount: 1, supplementsCount: 4 }))).toBe(3);
  });
});

describe('computeDxQuality — niveles por densidad', () => {
  it('sin historia básica → nivel 1 + hint de historia', () => {
    const r = computeDxQuality(sources({ hasBasicHistory: false }));
    expect(r.level).toBe(1);
    expect(r.nextHint).toContain('historia clínica básica');
    expect(r.missing.map((m) => m.key)).toContain('historia_basica');
  });

  it('solo historia básica → nivel 1, hint integral', () => {
    const r = computeDxQuality(sources());
    expect(r.level).toBe(1);
    expect(r.nextHint).toContain('cuestionario integral');
  });

  it('+ integral → nivel 2 (como antes)', () => {
    const r = computeDxQuality(sources({ hasIntegralQuestionnaire: true }));
    expect(r.level).toBe(2);
    expect(r.densityScore).toBeGreaterThanOrEqual(DENSITY_SCORE_FOR_L2);
  });

  it('densidad SIN cuestionarios formales también sube (recalibración Enrique)', () => {
    // Braverman + 1 quiz + historia básica = 4 ≥ umbral L2 — antes se quedaba en 1.
    const r = computeDxQuality(sources({ hasBraverman: true, quizzesCount: 1 }));
    expect(r.level).toBe(2);
  });

  it('caso tester Enrique: braverman + quizzes + labs + síntomas + sups → nivel 4', () => {
    // 1 (básica) + 2 (braverman) + 2 (quizzes) + 2 (labs) + 1 (síntomas) + 1 (sups) = 9 ≥ L3, + labs → 4.
    const r = computeDxQuality(sources({
      hasBraverman: true,
      quizzesCount: 2,
      hasLabs: true,
      symptomsCount: 5,
      supplementsCount: 3,
    }));
    expect(r.densityScore).toBe(9);
    expect(r.level).toBe(4);
  });

  it('densidad sólida sin labs se queda en 3 (labs siguen siendo compuerta del 4)', () => {
    const r = computeDxQuality(sources({
      hasIntegralQuestionnaire: true,
      areaQuestionnairesCount: AREA_QUESTIONNAIRES_FOR_L3,
      hasConsistentHabits: true,
    }));
    expect(r.densityScore).toBeGreaterThanOrEqual(DENSITY_SCORE_FOR_L3);
    expect(r.level).toBe(3);
    expect(r.nextHint).toContain('laboratorio');
  });

  it('labs sin densidad no saltan a 4', () => {
    const r = computeDxQuality(sources({ hasLabs: true }));
    expect(r.level).toBe(2); // 1 + 2 = 3 → L2, no L4
  });

  it('+ genéticos → nivel 5 (máximo) sólo desde nivel 4', () => {
    const l4 = {
      hasIntegralQuestionnaire: true,
      areaQuestionnairesCount: AREA_QUESTIONNAIRES_FOR_L3,
      hasConsistentHabits: true,
      hasLabs: true,
    };
    expect(computeDxQuality(sources({ ...l4, hasGenetics: true })).level).toBe(5);
    // genéticos sin labs no llegan a 5
    expect(computeDxQuality(sources({ ...l4, hasLabs: false, hasGenetics: true })).level).toBe(3);
  });

  it('nivel 5 con todo → nextHint null y sin faltantes', () => {
    const r = computeDxQuality(sources({
      hasIntegralQuestionnaire: true,
      areaQuestionnairesCount: AREA_QUESTIONNAIRES_FOR_L3,
      hasConsistentHabits: true,
      hasBraverman: true,
      quizzesCount: 2,
      symptomsCount: 3,
      padecimientosCount: 1,
      supplementsCount: 1,
      hasLabs: true,
      hasGenetics: true,
    }));
    expect(r.level).toBe(5);
    expect(r.nextHint).toBeNull();
    expect(r.missing).toEqual([]);
  });
});

describe('computeDxQuality — missing con keys navegables', () => {
  it('cada faltante trae key estable + label de usuario', () => {
    const r = computeDxQuality(sources());
    const keys = r.missing.map((m) => m.key);
    expect(keys).toEqual(
      expect.arrayContaining(['integral', 'areas', 'habitos', 'braverman', 'quizzes', 'labs', 'geneticos']),
    );
    const areas = r.missing.find((m) => m.key === 'areas');
    expect(areas?.label).toContain(`0/${AREA_QUESTIONNAIRES_FOR_L3}`);
  });

  it('fuentes presentes desaparecen del missing', () => {
    const r = computeDxQuality(sources({ hasBraverman: true, hasLabs: true, quizzesCount: 2 }));
    const keys = r.missing.map((m) => m.key);
    expect(keys).not.toContain('braverman');
    expect(keys).not.toContain('labs');
    expect(keys).not.toContain('quizzes');
  });
});
