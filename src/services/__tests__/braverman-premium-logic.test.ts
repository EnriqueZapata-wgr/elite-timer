import { describe, expect, it } from 'vitest';

import {
  buildPremiumReportPrompt,
  computeProportions,
  formatProportions,
} from '../braverman-premium-logic';

describe('computeProportions', () => {
  it('suma exactamente 100 con residuos repartidos', () => {
    const props = computeProportions({ dopamine: 31, acetylcholine: 11, gaba: 5, serotonin: 3 });
    expect(props.reduce((s, p) => s + p.pct, 0)).toBe(100);
  });

  it('ordena descendente por porcentaje', () => {
    const props = computeProportions({ dopamine: 5, acetylcholine: 30, gaba: 10, serotonin: 15 });
    expect(props[0].key).toBe('acetylcholine');
    expect(props[props.length - 1].key).toBe('dopamine');
    for (let i = 1; i < props.length; i++) {
      expect(props[i - 1].pct).toBeGreaterThanOrEqual(props[i].pct);
    }
  });

  it('todo en cero → 25/25/25/25 (sin división por cero)', () => {
    const props = computeProportions({ dopamine: 0, acetylcholine: 0, gaba: 0, serotonin: 0 });
    expect(props.every((p) => p.pct === 25)).toBe(true);
  });

  it('dominancia total → 100/0/0/0', () => {
    const props = computeProportions({ dopamine: 20, acetylcholine: 0, gaba: 0, serotonin: 0 });
    expect(props[0]).toMatchObject({ key: 'dopamine', pct: 100 });
  });

  it('scores negativos se tratan como 0', () => {
    const props = computeProportions({ dopamine: 10, acetylcholine: -5, gaba: 10, serotonin: 0 });
    expect(props.reduce((s, p) => s + p.pct, 0)).toBe(100);
    expect(props.find((p) => p.key === 'acetylcholine')?.pct).toBe(0);
  });
});

describe('formatProportions', () => {
  it('formato "62% Dopamina, …" del spec', () => {
    const props = computeProportions({ dopamine: 62, acetylcholine: 22, gaba: 10, serotonin: 6 });
    expect(formatProportions(props)).toBe('62% Dopamina, 22% Acetilcolina, 10% GABA, 6% Serotonina');
  });
});

describe('buildPremiumReportPrompt', () => {
  const input = {
    dominance: computeProportions({ dopamine: 62, acetylcholine: 22, gaba: 10, serotonin: 6 }),
    deficiency: computeProportions({ dopamine: 5, acetylcholine: 10, gaba: 50, serotonin: 35 }),
    dominantLabel: 'Dopamina',
    primaryDeficiencyLabel: 'GABA',
    deficiencyLevel: 'moderada',
    age: 38,
    sex: 'male',
  };

  it('el user prompt incluye proporciones y datos del perfil', () => {
    const { user } = buildPremiumReportPrompt(input);
    expect(user).toContain('62% Dopamina');
    expect(user).toContain('Deficiencia principal: GABA (nivel: moderada)');
    expect(user).toContain('Edad: 38');
    expect(user).toContain('hombre');
  });

  it('el system exige las 5 secciones y guardas de medicina funcional', () => {
    const { system } = buildPremiumReportPrompt(input);
    expect(system).toContain('## Tu perfil dominante');
    expect(system).toContain('## Análisis por naturaleza');
    expect(system).toContain('## Tu deficiencia principal');
    expect(system).toContain('## Recomendaciones específicas');
    expect(system).toContain('## Compatibilidad con tu perfil ATP');
    expect(system).toContain('NO recetes fármacos');
    expect(system).toContain('NO diagnostiques');
  });

  it('sin edad/sexo el prompt no mete basura', () => {
    const { user } = buildPremiumReportPrompt({ ...input, age: null, sex: null, deficiencyLevel: null });
    expect(user).not.toContain('Edad:');
    expect(user).not.toContain('nivel:');
  });
});
