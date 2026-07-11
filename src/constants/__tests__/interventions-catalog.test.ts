import { describe, it, expect } from 'vitest';
import {
  INTERVENTIONS_CATALOG,
  INTERVENTION_BY_KEY,
  UNIVERSAL_INTERVENTIONS,
} from '../interventions-catalog';
import { ROOT_KEYS, CATEGORY_KEYS } from '../intervention-vocab';

describe('interventions-catalog structure', () => {
  it('keys únicos y no vacíos', () => {
    const keys = INTERVENTIONS_CATALOG.map(i => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k.length).toBeGreaterThan(0);
  });

  it('INTERVENTION_BY_KEY cubre todo el catálogo', () => {
    expect(Object.keys(INTERVENTION_BY_KEY)).toHaveLength(INTERVENTIONS_CATALOG.length);
    for (const iv of INTERVENTIONS_CATALOG) {
      expect(INTERVENTION_BY_KEY[iv.key]).toBe(iv);
    }
  });

  it('toda raíz referenciada existe en el vocabulario', () => {
    for (const iv of INTERVENTIONS_CATALOG) {
      for (const r of iv.roots) {
        expect(ROOT_KEYS.has(r), `${iv.key} → raíz desconocida ${r}`).toBe(true);
      }
    }
  });

  it('toda categoría referenciada existe en el vocabulario', () => {
    for (const iv of INTERVENTIONS_CATALOG) {
      expect(iv.categories.length).toBeGreaterThan(0);
      for (const c of iv.categories) {
        expect(CATEGORY_KEYS.has(c), `${iv.key} → categoría desconocida ${c}`).toBe(true);
      }
    }
  });

  it('prioridad válida (1-3) y campos accionables presentes', () => {
    for (const iv of INTERVENTIONS_CATALOG) {
      expect([1, 2, 3]).toContain(iv.priority);
      expect(iv.name.length).toBeGreaterThan(0);
      expect(iv.how.length).toBeGreaterThan(0);
      expect(iv.benefit.length).toBeGreaterThan(0);
      expect(iv.assignRule.length).toBeGreaterThan(0);
    }
  });
});

describe('universales (fallback garantizado)', () => {
  it('son exactamente los 7 universales P1 (doctrina dx-f3)', () => {
    expect(UNIVERSAL_INTERVENTIONS.map(u => u.key).sort()).toEqual([
      'apagar_pantallas_noche',
      'exposicion_solar_matutina',
      // Catálogo v3 (cc12ceb, Cowork): key renombrada grounding → grounding_earthing.
      'grounding_earthing',
      'hidratacion_matutina',
      'recordatorio_comer',
      'recordatorio_dormir',
      'respiracion_nocturna',
    ]);
    for (const u of UNIVERSAL_INTERVENTIONS) {
      expect(u.isUniversal).toBe(true);
      expect(u.priority, `${u.key} debe ser P1`).toBe(1);
    }
  });

  it('universales circadianos declaran circadian y no timeOfDay fijo', () => {
    const circadianos = UNIVERSAL_INTERVENTIONS.filter(u => u.circadian);
    expect(circadianos.length).toBeGreaterThanOrEqual(2); // dormir + comer
    for (const c of circadianos) {
      expect(['sleep', 'eat']).toContain(c.circadian);
      expect(c.timeOfDay).toBeUndefined();
    }
  });

  it('las modalidades comparten family', () => {
    const ayunos = INTERVENTIONS_CATALOG.filter(i => i.family === 'ayuno');
    expect(ayunos.length).toBeGreaterThanOrEqual(2);
    // cada modalidad es un registro distinto (keys distintos)
    expect(new Set(ayunos.map(a => a.key)).size).toBe(ayunos.length);
  });
});
