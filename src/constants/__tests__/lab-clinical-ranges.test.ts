import { describe, it, expect } from 'vitest';
import { isLabValueValid, LAB_ABSOLUTE_RANGES } from '@/src/constants/lab-clinical-ranges';

describe('lab-clinical-ranges — isLabValueValid', () => {
  describe('casos reales de Mariana (beta test) → deben rechazarse', () => {
    it('rechaza LDL 2.27 mg/dL (rango 30-400)', () => {
      expect(isLabValueValid('ldl', 2.27)).toBe(false);
    });
    it('rechaza HDL 2.15 mg/dL (rango 15-150)', () => {
      expect(isLabValueValid('hdl', 2.15)).toBe(false);
    });
    it('rechaza Colesterol total 672 mg/dL (rango 80-500)', () => {
      expect(isLabValueValid('cholesterol_total', 672)).toBe(false);
    });
  });

  describe('valores plausibles → deben aceptarse', () => {
    it('acepta LDL 105 mg/dL', () => {
      expect(isLabValueValid('ldl', 105)).toBe(true);
    });
    it('acepta HDL 60 mg/dL', () => {
      expect(isLabValueValid('hdl', 60)).toBe(true);
    });
    it('acepta Colesterol total 190 mg/dL', () => {
      expect(isLabValueValid('cholesterol_total', 190)).toBe(true);
    });
    it('acepta glucosa 95 mg/dL', () => {
      expect(isLabValueValid('glucose', 95)).toBe(true);
    });
    it('acepta HbA1c 5.7 %', () => {
      expect(isLabValueValid('hba1c', 5.7)).toBe(true);
    });
  });

  describe('límites inclusivos (>= min, <= max)', () => {
    it('acepta exactamente el min', () => {
      expect(isLabValueValid('ldl', LAB_ABSOLUTE_RANGES.ldl.min)).toBe(true);
    });
    it('acepta exactamente el max', () => {
      expect(isLabValueValid('ldl', LAB_ABSOLUTE_RANGES.ldl.max)).toBe(true);
    });
    it('rechaza justo por debajo del min', () => {
      expect(isLabValueValid('ldl', LAB_ABSOLUTE_RANGES.ldl.min - 0.01)).toBe(false);
    });
    it('rechaza justo por encima del max', () => {
      expect(isLabValueValid('ldl', LAB_ABSOLUTE_RANGES.ldl.max + 0.01)).toBe(false);
    });
  });

  describe('valores nulos / no finitos → false (mejor null que basura)', () => {
    it('rechaza null', () => {
      expect(isLabValueValid('ldl', null)).toBe(false);
    });
    it('rechaza undefined', () => {
      expect(isLabValueValid('ldl', undefined)).toBe(false);
    });
    it('rechaza NaN', () => {
      expect(isLabValueValid('ldl', NaN)).toBe(false);
    });
    it('rechaza Infinity', () => {
      expect(isLabValueValid('ldl', Infinity)).toBe(false);
    });
  });

  describe('biomarker sin rango definido → acepta (no inventa rangos)', () => {
    it('acepta una key desconocida con valor finito', () => {
      expect(isLabValueValid('biomarker_inexistente', 123)).toBe(true);
    });
    it('pero sigue rechazando null en key desconocida', () => {
      expect(isLabValueValid('biomarker_inexistente', null)).toBe(false);
    });
  });

  describe('cobertura del catálogo', () => {
    it('cubre los 30+ biomarkers principales', () => {
      expect(Object.keys(LAB_ABSOLUTE_RANGES).length).toBeGreaterThanOrEqual(30);
    });
    it('todo rango tiene min < max y unidad', () => {
      for (const [key, r] of Object.entries(LAB_ABSOLUTE_RANGES)) {
        expect(r.min, key).toBeLessThan(r.max);
        expect(typeof r.unit, key).toBe('string');
        expect(r.unit.length, key).toBeGreaterThan(0);
      }
    });
  });
});
