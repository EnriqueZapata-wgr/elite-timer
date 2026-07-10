import { describe, it, expect } from 'vitest';
import {
  INTERVENTION_CATEGORIES,
  INTERVENTION_ROOTS,
  CATEGORY_LABELS,
  ROOT_LABELS,
  CATEGORY_KEYS,
  ROOT_KEYS,
  isValidRoot,
  isValidCategory,
  sanitizeRoots,
} from '../intervention-vocab';

describe('intervention-vocab integrity', () => {
  it('cada categoría tiene label', () => {
    for (const c of INTERVENTION_CATEGORIES) {
      expect(CATEGORY_LABELS[c]).toBeTruthy();
    }
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(INTERVENTION_CATEGORIES.length);
  });

  it('cada raíz tiene label', () => {
    for (const r of INTERVENTION_ROOTS) {
      expect(ROOT_LABELS[r]).toBeTruthy();
    }
    expect(Object.keys(ROOT_LABELS)).toHaveLength(INTERVENTION_ROOTS.length);
  });

  it('no hay keys duplicados', () => {
    expect(new Set(INTERVENTION_CATEGORIES).size).toBe(INTERVENTION_CATEGORIES.length);
    expect(new Set(INTERVENTION_ROOTS).size).toBe(INTERVENTION_ROOTS.length);
  });

  it('los Set reflejan los arrays', () => {
    expect(CATEGORY_KEYS.size).toBe(INTERVENTION_CATEGORIES.length);
    expect(ROOT_KEYS.size).toBe(INTERVENTION_ROOTS.length);
  });
});

describe('validadores', () => {
  it('isValidRoot / isValidCategory', () => {
    expect(isValidRoot('disbiosis')).toBe(true);
    expect(isValidRoot('inventada_por_argos')).toBe(false);
    expect(isValidCategory('sueno')).toBe(true);
    expect(isValidCategory('xyz')).toBe(false);
  });

  it('sanitizeRoots filtra inválidas y deduplica', () => {
    const out = sanitizeRoots([
      'disbiosis',
      'disbiosis',           // dup
      'raiz_alucinada',      // inválida
      'sedentarismo',
    ]);
    expect(out).toContain('disbiosis');
    expect(out).toContain('sedentarismo');
    expect(out).not.toContain('raiz_alucinada');
    expect(out).toHaveLength(2);
  });

  it('sanitizeRoots vacío → []', () => {
    expect(sanitizeRoots([])).toEqual([]);
    expect(sanitizeRoots(['nada_valida'])).toEqual([]);
  });
});
