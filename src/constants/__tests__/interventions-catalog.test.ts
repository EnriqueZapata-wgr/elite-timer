import { describe, it, expect } from 'vitest';
import {
  INTERVENTIONS_CATALOG,
  INTERVENTION_BY_KEY,
  UNIVERSAL_INTERVENTIONS,
  CLINICAL_VALIDATION_PENDING,
} from '../interventions-catalog';
import { ROOT_KEYS, CATEGORY_KEYS } from '../intervention-vocab';

describe('interventions-catalog structure', () => {
  it('catálogo v3 completo (85+ entradas)', () => {
    expect(INTERVENTIONS_CATALOG.length).toBeGreaterThanOrEqual(85);
  });

  it('keys únicos, no vacíos y en snake_case', () => {
    const keys = INTERVENTIONS_CATALOG.map(i => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      expect(k, `key inválida: "${k}"`).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
    }
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

  it('campos opcionales v3 en dominio válido (timeOfDay / evidenceLevel / circadian)', () => {
    const TODS = ['morning', 'noon', 'afternoon', 'evening', 'night'];
    const LEVELS = ['N1', 'N2', 'N3', 'N4'];
    for (const iv of INTERVENTIONS_CATALOG) {
      if (iv.timeOfDay !== undefined) {
        expect(TODS, `${iv.key} timeOfDay inválido`).toContain(iv.timeOfDay);
      }
      if (iv.evidenceLevel !== undefined) {
        expect(LEVELS, `${iv.key} evidenceLevel inválido`).toContain(iv.evidenceLevel);
      }
      if (iv.circadian !== undefined) {
        expect(['sleep', 'eat'], `${iv.key} circadian inválido`).toContain(iv.circadian);
        // circadiano y timeOfDay fijo son mutuamente excluyentes (el timing se calcula)
        expect(iv.timeOfDay, `${iv.key} circadiano no lleva timeOfDay fijo`).toBeUndefined();
      }
    }
  });

  it('DOCTRINA: ninguna entrada es suplemento ni fármaco', () => {
    // Suplementos/fármacos NO son intervención (doctrina ATP). Heurística por keywords
    // en key/name/how — alimentos enteros (sardinas, hígado, BPC) sí son válidos.
    const FORBIDDEN = /suplement|cápsula de|capsula de|tableta|pastilla|comprimido|fármaco|farmaco|melatonina exógena|ashwagandha|creatina|berberina|metformina|omeprazol|ibuprofeno|estatina/i;
    for (const iv of INTERVENTIONS_CATALOG) {
      const text = `${iv.key} ${iv.name} ${iv.how}`;
      expect(FORBIDDEN.test(text), `${iv.key} parece suplemento/fármaco: revisar con Mariana`).toBe(false);
    }
  });
});

describe('gating clínico (CLINICAL_VALIDATION_PENDING)', () => {
  it('la lista pendiente es EXACTAMENTE la firmada como pendiente (Mariana la reduce al firmar — task #9)', () => {
    // Al firmar una, Mariana/Cowork quita `requiresClinicalValidation` del catálogo
    // y su key de esta lista (edición consciente, nunca accidental).
    // Firma v4 epigenético (db206fd 2026-07-14): +agua_fuera_comidas, +ayuno_16_8
    // (post investigación Longo/OMAD), +hidratacion_ushapan_avanzado, +lentes_rojos,
    // +oil_pulling_oregano · jawzercise → omt_masticatorios (rename, sigue gateada).
    // La lista solo CRECIÓ (dirección segura): cero fuga clínica.
    expect(CLINICAL_VALIDATION_PENDING.map(i => i.key).sort()).toEqual([
      'agua_fuera_comidas',
      'ayuno_16_8',
      'ayuno_20_4_omad',
      'bulletproof_coffee',
      'dive_reflex_cara_hielo',
      'ejercicio_ayuno_fuerza',
      'hidratacion_ushapan_avanzado',
      'hiperventilacion_matutina',
      'lentes_rojos',
      'luz_roja_ojos',
      'oil_pulling_oregano',
      'omt_masticatorios',
      'protocolo_ayuno_sardinas',
      'tabla_co2',
      'tabla_o2',
      'wim_hof_basico',
      'wim_hof_extendido',
    ]);
  });

  it('ningún universal está pendiente de validación (el fallback garantizado siempre sale)', () => {
    for (const u of UNIVERSAL_INTERVENTIONS) {
      expect(u.requiresClinicalValidation, `${u.key} universal no puede estar pendiente`).toBeFalsy();
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
