import { describe, it, expect } from 'vitest';
import {
  resolveInterventionDef,
  matchInterventions,
  computeUniversalTime,
  subtractMinutes,
  type DxRoot,
} from '../intervention-engine-core';
import type { Intervention } from '@/src/constants/interventions-catalog';

// Catálogo de prueba (aislado del real) para scoring determinístico
const TEST_CATALOG: Intervention[] = [
  {
    key: 'u1', name: 'Universal', how: 'x', benefit: 'y',
    categories: ['hidratacion'], roots: [], assignRule: 'todos',
    priority: 1, isUniversal: true, timeOfDay: 'morning',
  },
  {
    key: 'u_sleep', name: 'Dormir', how: 'x', benefit: 'y',
    categories: ['sueno'], roots: ['ritmo_circadiano_desregulado'],
    assignRule: 'todos', priority: 1, isUniversal: true, circadian: 'sleep',
  },
  {
    key: 'a', name: 'Alfa', how: 'x', benefit: 'y',
    categories: ['metabolismo'], roots: ['resistencia_insulina'],
    assignRule: 'r', priority: 2,
  },
  {
    key: 'b', name: 'Beta', how: 'x', benefit: 'y',
    categories: ['sueno'], roots: ['deficit_sueno_profundo', 'resistencia_insulina'],
    assignRule: 'r', priority: 1,
  },
  {
    key: 'c', name: 'Gamma', how: 'x', benefit: 'y',
    categories: ['piel'], roots: ['toxicidad_ambiental'],
    assignRule: 'r', priority: 3,
  },
];

describe('resolveInterventionDef', () => {
  it('resuelve del catálogo curado', () => {
    const def = resolveInterventionDef({ intervention_key: 'pausas_activas_60min' });
    expect(def).not.toBeNull();
    expect(def!.isCustom).toBe(false);
    expect(def!.name).toContain('Pausas activas');
  });

  it('resuelve custom desde custom_definition', () => {
    const def = resolveInterventionDef({
      intervention_key: 'custom_abc',
      is_custom: true,
      custom_definition: { name: 'Mi ritual', how: 'algo', benefit: 'bien', categories: ['ritual'], roots: [] },
    });
    expect(def).not.toBeNull();
    expect(def!.isCustom).toBe(true);
    expect(def!.name).toBe('Mi ritual');
  });

  it('custom sin definición válida → null', () => {
    expect(resolveInterventionDef({ intervention_key: 'custom_x', is_custom: true, custom_definition: null })).toBeNull();
    expect(resolveInterventionDef({ intervention_key: 'custom_x', is_custom: true, custom_definition: { how: 'x' } })).toBeNull();
  });

  it('key curado inexistente → null', () => {
    expect(resolveInterventionDef({ intervention_key: 'no_existe' })).toBeNull();
  });
});

describe('matchInterventions', () => {
  it('universales siempre presentes, aun sin raíces en el DX', () => {
    const res = matchInterventions([], {}, TEST_CATALOG);
    expect(res.universals.map(u => u.key).sort()).toEqual(['u1', 'u_sleep']);
    expect(res.suggestions).toEqual([]);
  });

  it('solo sugiere curadas con raíz en común', () => {
    const dx: DxRoot[] = [{ root_key: 'resistencia_insulina', severity: 3 }];
    const res = matchInterventions(dx, {}, TEST_CATALOG);
    const keys = res.suggestions.map(s => s.intervention.key);
    expect(keys).toContain('a');
    expect(keys).toContain('b');
    expect(keys).not.toContain('c'); // toxicidad no está en el DX
    expect(keys).not.toContain('u1'); // universales no van en suggestions
  });

  it('ordena por score (prioridad + severidad×confianza)', () => {
    const dx: DxRoot[] = [
      { root_key: 'resistencia_insulina', severity: 4 },
      { root_key: 'deficit_sueno_profundo', severity: 5 },
    ];
    const res = matchInterventions(dx, {}, TEST_CATALOG);
    // b (P1, 2 raíces: 4+5) supera a a (P2, 1 raíz: 4)
    expect(res.suggestions[0].intervention.key).toBe('b');
    expect(res.suggestions[0].matchedRoots).toHaveLength(2);
  });

  it('confidence baja reduce el score', () => {
    const alta = matchInterventions([{ root_key: 'resistencia_insulina', severity: 5, confidence: 1 }], {}, TEST_CATALOG);
    const baja = matchInterventions([{ root_key: 'resistencia_insulina', severity: 5, confidence: 0.2 }], {}, TEST_CATALOG);
    const scoreAlta = alta.suggestions.find(s => s.intervention.key === 'a')!.score;
    const scoreBaja = baja.suggestions.find(s => s.intervention.key === 'a')!.score;
    expect(scoreAlta).toBeGreaterThan(scoreBaja);
  });
});

describe('timing circadiano', () => {
  it('subtractMinutes con wrap de medianoche', () => {
    expect(subtractMinutes('22:00', 30)).toBe('21:30');
    expect(subtractMinutes('00:15', 30)).toBe('23:45');
    expect(subtractMinutes('07:05', 10)).toBe('06:55');
  });

  it('subtractMinutes inválido → null', () => {
    expect(subtractMinutes('nope', 30)).toBeNull();
    expect(subtractMinutes('25:00', 30)).toBeNull();
  });

  it('computeUniversalTime sleep = 60 min antes de dormir (dx-f3)', () => {
    expect(computeUniversalTime('sleep', { sleep_time: '23:00' })).toBe('22:00');
    expect(computeUniversalTime('sleep', { sleep_time: '00:30' })).toBe('23:30');
    expect(computeUniversalTime('sleep', {})).toBeNull();
  });

  it('computeUniversalTime eat = hora de despertar', () => {
    expect(computeUniversalTime('eat', { wake_time: '07:00' })).toBe('07:00');
    expect(computeUniversalTime('eat', {})).toBeNull();
  });
});
