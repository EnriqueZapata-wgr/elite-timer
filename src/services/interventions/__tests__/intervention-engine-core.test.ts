import { describe, it, expect } from 'vitest';
import {
  resolveInterventionDef,
  matchInterventions,
  computeUniversalTime,
  subtractMinutes,
  type DxRoot,
} from '../intervention-engine-core';
import { CLINICAL_VALIDATION_PENDING, type Intervention } from '@/src/constants/interventions-catalog';
import { INTERVENTION_ROOTS } from '@/src/constants/intervention-vocab';

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
  // Gating clínico: pendientes de firma de Mariana → el motor NUNCA las devuelve.
  {
    key: 'p_pending', name: 'Pendiente clínica', how: 'x', benefit: 'y',
    categories: ['metabolismo'], roots: ['resistencia_insulina'],
    assignRule: 'r', priority: 1, requiresClinicalValidation: true,
  },
  {
    key: 'u_pending', name: 'Universal pendiente', how: 'x', benefit: 'y',
    categories: ['sueno'], roots: [], assignRule: 'todos',
    priority: 1, isUniversal: true, requiresClinicalValidation: true,
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

describe('gating clínico (requiresClinicalValidation)', () => {
  it('pendiente NO entra en suggestions aunque su raíz matchee con severidad máxima', () => {
    const dx: DxRoot[] = [{ root_key: 'resistencia_insulina', severity: 5 }];
    const res = matchInterventions(dx, {}, TEST_CATALOG);
    expect(res.suggestions.map(s => s.intervention.key)).not.toContain('p_pending');
  });

  it('universal pendiente NO entra en universals', () => {
    const res = matchInterventions([], {}, TEST_CATALOG);
    expect(res.universals.map(u => u.key)).not.toContain('u_pending');
  });

  it('el catálogo real nunca filtra pendientes hacia el motor (todas las raíces activas)', () => {
    const dx: DxRoot[] = INTERVENTION_ROOTS.map(r => ({ root_key: r, severity: 5 }));
    const res = matchInterventions(dx); // catálogo real completo
    const pendingKeys = new Set(CLINICAL_VALIDATION_PENDING.map(i => i.key));
    for (const s of res.suggestions) {
      expect(pendingKeys.has(s.intervention.key), `${s.intervention.key} pendiente sugerida`).toBe(false);
    }
    for (const u of res.universals) {
      expect(pendingKeys.has(u.key), `${u.key} universal pendiente`).toBe(false);
    }
  });

  it('resolveInterventionDef SÍ resuelve keys pendientes (data existente del user intacta)', () => {
    for (const iv of CLINICAL_VALIDATION_PENDING) {
      const def = resolveInterventionDef({ intervention_key: iv.key });
      expect(def, `${iv.key} debe resolverse para user_interventions existentes`).not.toBeNull();
      expect(def!.name).toBe(iv.name);
    }
  });
});

describe('matchInterventions × catálogo v3 real (smoke integral)', () => {
  // DX sintético que toca TODAS las raíces del vocabulario con severidades variadas.
  const FULL_DX: DxRoot[] = INTERVENTION_ROOTS.map((r, i) => ({
    root_key: r,
    severity: ((i % 5) + 1) as number,
    confidence: 0.5 + (i % 3) * 0.25,
  }));

  it('devuelve sugerencias ordenadas (score desc → priority asc → nombre), sin duplicados ni universales', () => {
    const res = matchInterventions(FULL_DX);
    expect(res.suggestions.length).toBeGreaterThan(30); // el DX total activa la mayoría del catálogo
    const keys = res.suggestions.map(s => s.intervention.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of res.suggestions) {
      expect(s.intervention.isUniversal).toBeFalsy();
      expect(s.matchedRoots.length).toBeGreaterThan(0);
      expect(s.score).toBeGreaterThan(0);
    }
    for (let i = 1; i < res.suggestions.length; i++) {
      const prev = res.suggestions[i - 1];
      const cur = res.suggestions[i];
      expect(prev.score >= cur.score, `orden roto en posición ${i}`).toBe(true);
      if (prev.score === cur.score) {
        expect(prev.intervention.priority <= cur.intervention.priority).toBe(true);
      }
    }
  });

  it('universals = los 7 P1 exactos, incluso con DX completo', () => {
    const res = matchInterventions(FULL_DX);
    expect(res.universals.map(u => u.key).sort()).toEqual([
      'apagar_pantallas_noche',
      'exposicion_solar_matutina',
      'grounding_earthing',
      'hidratacion_matutina',
      'recordatorio_comer',
      'recordatorio_dormir',
      'respiracion_nocturna',
    ]);
  });

  it('families: modalidades de la misma familia coexisten en el orden sin romperlo', () => {
    const res = matchInterventions(FULL_DX);
    const byFamily = new Map<string, string[]>();
    for (const s of res.suggestions) {
      const fam = s.intervention.family;
      if (!fam) continue;
      byFamily.set(fam, [...(byFamily.get(fam) ?? []), s.intervention.key]);
    }
    // Al menos las familias multi-modalidad clásicas aparecen con ≥2 modalidades.
    expect((byFamily.get('ayuno') ?? []).length).toBeGreaterThanOrEqual(2);
    expect((byFamily.get('box_breathing') ?? []).length).toBeGreaterThanOrEqual(2);
    // Ninguna familia repite key (cada modalidad es una intervención distinta).
    for (const [fam, keys] of byFamily) {
      expect(new Set(keys).size, `familia ${fam} con keys repetidas`).toBe(keys.length);
    }
  });

  it('smoke de performance trivial: 200 matches completos < 1s', () => {
    const t0 = Date.now();
    for (let i = 0; i < 200; i++) matchInterventions(FULL_DX);
    expect(Date.now() - t0).toBeLessThan(1000);
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
