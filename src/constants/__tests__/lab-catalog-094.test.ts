import { describe, it, expect } from 'vitest';
import {
  isLabValueValid,
  isClinicalOnlyParam,
  LAB_ABSOLUTE_RANGES,
} from '@/src/constants/lab-clinical-ranges';
import {
  LAB_COLUMN_TO_CANONICAL,
  EXTRACTED_KEY_ALIASES,
  normalizeExtractedKey,
  toCanonicalEntries,
} from '@/src/constants/lab-canonical-map';

/**
 * Sprint 094 — ATP LABS catálogo extendido (+68 parámetros) + flag clinical_only.
 */
describe('094 — rangos clínicos extendidos (isLabValueValid)', () => {
  it('PSA: rechaza 1000 (fuera de 0-200), acepta 4.5', () => {
    expect(isLabValueValid('psa', 1000)).toBe(false);
    expect(isLabValueValid('psa', 4.5)).toBe(true);
  });

  it('Troponinas: rechaza valores absurdos, acepta plausibles', () => {
    expect(isLabValueValid('troponin_i', 999)).toBe(false);
    expect(isLabValueValid('troponin_i', 0.02)).toBe(true);
    expect(isLabValueValid('troponin_t', 0.01)).toBe(true);
  });

  it('NT-proBNP: acepta un valor alto real (insuficiencia), rechaza imposible', () => {
    expect(isLabValueValid('nt_pro_bnp', 12000)).toBe(true);
    expect(isLabValueValid('nt_pro_bnp', 99999)).toBe(false);
  });

  it('Lote 1 con matriz (anti_tpo): acepta valores elevados reales de Hashimoto', () => {
    // Decisión 094: rango ABSOLUTO amplio (no la banda funcional 0-35 de la matriz).
    expect(isLabValueValid('anti_tpo', 500)).toBe(true);
    expect(isLabValueValid('anti_tpo', 4)).toBe(true);
  });
});

describe('094 — flag clinical_only', () => {
  it('los nuevos marcadores tumorales/cardio son clinical_only (por key inglesa)', () => {
    for (const k of ['psa', 'troponin_i', 'bnp', 'ca_125', 'cea', 'amh', 'pth']) {
      expect(LAB_ABSOLUTE_RANGES[k]?.clinical_only, k).toBe(true);
    }
  });

  it('isClinicalOnlyParam resuelve por key inglesa Y por key canónica español', () => {
    expect(isClinicalOnlyParam('psa')).toBe(true); // key inglesa del parser
    expect(isClinicalOnlyParam('antigeno_prostatico_especifico')).toBe(true); // key canónica de lab_values
    expect(isClinicalOnlyParam('troponina_i')).toBe(true);
  });

  it('los params CON banda funcional NO son clinical_only', () => {
    expect(isClinicalOnlyParam('anti_tpo')).toBe(false);
    expect(isClinicalOnlyParam('progesterone')).toBe(false);
    expect(isClinicalOnlyParam('glucose')).toBe(false);
  });

  it('t4_free y platelets (ya existían) ahora son clinical_only', () => {
    expect(LAB_ABSOLUTE_RANGES.t4_free.clinical_only).toBe(true);
    expect(LAB_ABSOLUTE_RANGES.platelets.clinical_only).toBe(true);
  });
});

describe('094 — canonical map: nuevos params Lote 2B', () => {
  it('mapea la columna inglesa a la clave canónica español', () => {
    expect(LAB_COLUMN_TO_CANONICAL.psa.keys).toEqual(['antigeno_prostatico_especifico']);
    expect(LAB_COLUMN_TO_CANONICAL.afp.keys).toEqual(['alfa_fetoproteina']);
    expect(LAB_COLUMN_TO_CANONICAL.pth.keys).toEqual(['parathormona']);
  });

  it('normaliza alias español → columna inglesa', () => {
    expect(normalizeExtractedKey('antigeno_prostatico_especifico')).toBe('psa');
    expect(normalizeExtractedKey('dimero_d')).toBe('d_dimer');
  });

  it('conflictos: tibc/ige_total NO duplican — alias a iron_binding/ige existentes', () => {
    // No deben tener su propia entrada en el canonical map (evitar biomarcador duplicado).
    expect(LAB_COLUMN_TO_CANONICAL.tibc).toBeUndefined();
    expect(LAB_COLUMN_TO_CANONICAL.ige_total).toBeUndefined();
    // Se resuelven vía alias a las columnas existentes.
    expect(EXTRACTED_KEY_ALIASES.tibc).toBe('iron_binding');
    expect(EXTRACTED_KEY_ALIASES.capacidad_total_fijacion_hierro).toBe('iron_binding');
    expect(EXTRACTED_KEY_ALIASES.ige_total).toBe('ige');
  });

  it('toCanonicalEntries convierte un parser español nuevo a su clave canónica', () => {
    const out = toCanonicalEntries({ antigeno_prostatico_especifico: 4.5, dimero_d: 0.3 });
    expect(out).toContainEqual({ parameter_key: 'antigeno_prostatico_especifico', value: 4.5 });
    expect(out).toContainEqual({ parameter_key: 'dimero_d', value: 0.3 });
  });

  it('toCanonicalEntries: tibc cae en iron_binding (canónico capacidad_de_fijacion_de_hierro)', () => {
    const out = toCanonicalEntries({ tibc: 300 });
    expect(out).toContainEqual({ parameter_key: 'capacidad_de_fijacion_de_hierro', value: 300 });
  });
});
