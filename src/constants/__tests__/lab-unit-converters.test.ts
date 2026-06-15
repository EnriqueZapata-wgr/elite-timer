import { describe, it, expect } from 'vitest';
import { normalizeLabValue } from '@/src/constants/lab-unit-converters';

describe('lab-unit-converters — normalizeLabValue', () => {
  describe('conversión explícita (unidad detectada en el catálogo)', () => {
    it('testosterona 9.93 ng/mL → 993 ng/dL', () => {
      expect(normalizeLabValue('testosterone', 9.93, 'ng/mL').value).toBeCloseTo(993);
    });
    it('glucosa 5 mmol/L → 90 mg/dL', () => {
      expect(normalizeLabValue('glucose', 5, 'mmol/L').value).toBe(90);
    });
    it('vitamina D 75 nmol/L → 30 ng/mL', () => {
      expect(normalizeLabValue('vitamin_d', 75, 'nmol/L').value).toBe(30);
    });
    it('marca el método como explicit', () => {
      expect(normalizeLabValue('glucose', 5, 'mmol/L').method).toBe('explicit');
    });
    it('normaliza unidad con mayúsculas/espacios (mMol/L)', () => {
      expect(normalizeLabValue('glucose', 5, ' mMol/L ').value).toBe(90);
    });
    it('LDL 3.85 mmol/L → ~149 mg/dL', () => {
      expect(normalizeLabValue('ldl', 3.85, 'mmol/L').value).toBeCloseTo(148.88, 1);
    });
    it('PCR 5 mg/L → 0.5 mg/dL', () => {
      expect(normalizeLabValue('pcr', 5, 'mg/L').value).toBeCloseTo(0.5);
    });
    it('WBC 7.5 ×10³/µL → 7500 /µL (explícito)', () => {
      expect(normalizeLabValue('wbc', 7.5, '×10³/µL').value).toBe(7500);
    });
  });

  describe('heurística por magnitud (sin unidad)', () => {
    it('HbA1c 0.057 (fracción) → 5.7 %', () => {
      expect(normalizeLabValue('hba1c', 0.057, null).value).toBeCloseTo(5.7);
    });
    it('hematocrito 0.45 (fracción) → 45 %', () => {
      expect(normalizeLabValue('hematocrit', 0.45, null).value).toBe(45);
    });
    it('WBC 7.5 (miles) → 7500 /µL', () => {
      expect(normalizeLabValue('wbc', 7.5, null).value).toBe(7500);
    });
    it('marca el método como heuristic', () => {
      expect(normalizeLabValue('hba1c', 0.057, null).method).toBe('heuristic');
    });
    it('testosterona 9.93 sin unidad → ~993 ng/dL (heurística <20)', () => {
      expect(normalizeLabValue('testosterone', 9.93, null).value).toBeCloseTo(993);
    });
  });

  describe('identity (ya viene en canónica)', () => {
    it('HbA1c 5.7 % → 5.7', () => {
      const r = normalizeLabValue('hba1c', 5.7, '%');
      expect(r.value).toBe(5.7);
      expect(r.method).toBe('explicit');
    });
    it('glucosa 90 mg/dL → 90', () => {
      expect(normalizeLabValue('glucose', 90, 'mg/dL').value).toBe(90);
    });
    it('valor normal sin unidad cae a identity (no dispara heurística)', () => {
      const r = normalizeLabValue('glucose', 90, null);
      expect(r.value).toBe(90);
      expect(r.method).toBe('identity');
    });
    it('biomarker sin canónica definida → identity, valor intacto', () => {
      const r = normalizeLabValue('parametro_desconocido', 123, 'foo');
      expect(r.value).toBe(123);
      expect(r.method).toBe('identity');
    });
  });
});
