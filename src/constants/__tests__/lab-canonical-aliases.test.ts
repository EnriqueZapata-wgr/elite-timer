import { describe, it, expect } from 'vitest';
import {
  canonicalParameterKey,
  toCanonicalEntries,
} from '@/src/constants/lab-canonical-map';

/**
 * #labs-desmadre (23-jun) — colapso de duplicados en/es. canonicalParameterKey funde la key raw
 * inglesa a su canónica español SOLO para columnas de un destino; deja intactas las inglesas-
 * canónicas (PhenoAge) y las multi-key (ast/ggt).
 */
describe('canonicalParameterKey — colapso en/es', () => {
  it('colapsa los pares confirmados en el inventario', () => {
    expect(canonicalParameterKey('testosterone')).toBe('testosterona_total');
    expect(canonicalParameterKey('insulin')).toBe('insulina');
    expect(canonicalParameterKey('cortisol')).toBe('cortisol_matutino');
    expect(canonicalParameterKey('uric_acid')).toBe('acido_urico');
    expect(canonicalParameterKey('t3_free')).toBe('t3_libre');
    expect(canonicalParameterKey('total_cholesterol')).toBe('colesterol_total');
    expect(canonicalParameterKey('ldl')).toBe('colesterol_ldl');
    expect(canonicalParameterKey('hdl')).toBe('colesterol_hdl');
    expect(canonicalParameterKey('crp')).toBe('proteina_c_reactiva_cuantitativa_pcr');
    expect(canonicalParameterKey('glucose')).toBe('glucosa_en_ayuno');
    expect(canonicalParameterKey('creatinine')).toBe('creatinina_serica');
    expect(canonicalParameterKey('homocysteine')).toBe('homocisteina');
    expect(canonicalParameterKey('triglycerides')).toBe('trigliceridos');
    expect(canonicalParameterKey('wbc')).toBe('leucocitos_totales');
  });

  it('es idempotente para keys ya canónicas', () => {
    expect(canonicalParameterKey('testosterona_total')).toBe('testosterona_total');
    expect(canonicalParameterKey('glucosa_en_ayuno')).toBe('glucosa_en_ayuno');
  });

  it('NO colapsa inglesas-canónicas (PhenoAge/L2 sin equivalente español)', () => {
    expect(canonicalParameterKey('albumin')).toBe('albumin');
    expect(canonicalParameterKey('mcv')).toBe('mcv');
    expect(canonicalParameterKey('alp')).toBe('alp');
    expect(canonicalParameterKey('t4_free')).toBe('t4_free');
    expect(canonicalParameterKey('estradiol')).toBe('estradiol');
    // calcium es canónica inglesa en el map (keys:['calcium']) → NO se mapea a 'calcio'.
    expect(canonicalParameterKey('calcium')).toBe('calcium');
  });

  it('NO colapsa multi-key (ast/ggt escriben 2 filas — decisión de matriz)', () => {
    expect(canonicalParameterKey('ggt')).toBe('ggt');
    expect(canonicalParameterKey('ast')).toBe('ast');
  });

  it('devuelve la key sin cambios si es desconocida', () => {
    expect(canonicalParameterKey('biomarker_inexistente')).toBe('biomarker_inexistente');
  });
});

describe('toCanonicalEntries — el path de PDF ya canonicaliza en/es', () => {
  it('mapea keys inglesas del parser a la canónica español', () => {
    const out = toCanonicalEntries({ testosterone: 600, glucose: 90, hdl: 55 });
    expect(out).toContainEqual({ parameter_key: 'testosterona_total', value: 600 });
    expect(out).toContainEqual({ parameter_key: 'glucosa_en_ayuno', value: 90 });
    expect(out).toContainEqual({ parameter_key: 'colesterol_hdl', value: 55 });
  });
});
