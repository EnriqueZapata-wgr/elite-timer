import { describe, it, expect } from 'vitest';
import {
  computeDxQuality,
  AREA_QUESTIONNAIRES_FOR_L3,
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
    ...p,
  };
}

describe('computeDxQuality — niveles', () => {
  it('sin historia básica → nivel 1 + hint de historia', () => {
    const r = computeDxQuality(sources({ hasBasicHistory: false }));
    expect(r.level).toBe(1);
    expect(r.nextHint).toContain('historia clínica básica');
    expect(r.missing).toContain('Historia clínica básica');
  });

  it('solo historia básica → nivel 1, hint integral', () => {
    const r = computeDxQuality(sources());
    expect(r.level).toBe(1);
    expect(r.nextHint).toContain('cuestionario integral');
  });

  it('+ integral → nivel 2', () => {
    const r = computeDxQuality(sources({ hasIntegralQuestionnaire: true }));
    expect(r.level).toBe(2);
  });

  it('nivel 3 requiere áreas Y hábitos', () => {
    const base = { hasIntegralQuestionnaire: true, areaQuestionnairesCount: AREA_QUESTIONNAIRES_FOR_L3 };
    expect(computeDxQuality(sources({ ...base, hasConsistentHabits: false })).level).toBe(2);
    expect(computeDxQuality(sources({ ...base, hasConsistentHabits: true })).level).toBe(3);
  });

  it('áreas insuficientes no llegan a 3', () => {
    const r = computeDxQuality(sources({
      hasIntegralQuestionnaire: true,
      areaQuestionnairesCount: AREA_QUESTIONNAIRES_FOR_L3 - 1,
      hasConsistentHabits: true,
    }));
    expect(r.level).toBe(2);
    expect(r.nextHint).toContain('por área');
  });

  it('+ labs → nivel 4 (requiere haber alcanzado 3)', () => {
    const l3 = {
      hasIntegralQuestionnaire: true,
      areaQuestionnairesCount: AREA_QUESTIONNAIRES_FOR_L3,
      hasConsistentHabits: true,
    };
    expect(computeDxQuality(sources({ ...l3, hasLabs: true })).level).toBe(4);
    // labs sin llegar a 3 no saltan a 4
    expect(computeDxQuality(sources({ hasIntegralQuestionnaire: true, hasLabs: true })).level).toBe(2);
  });

  it('+ genéticos → nivel 5 (máximo)', () => {
    const r = computeDxQuality(sources({
      hasIntegralQuestionnaire: true,
      areaQuestionnairesCount: AREA_QUESTIONNAIRES_FOR_L3,
      hasConsistentHabits: true,
      hasLabs: true,
      hasGenetics: true,
    }));
    expect(r.level).toBe(5);
    expect(r.nextHint).toBeNull();
    expect(r.missing).toEqual([]);
  });
});
