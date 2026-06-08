import { describe, it, expect } from 'vitest';
import { score9Bands, computeSFGlobal } from '../sf-service';
import type { DomainKey } from '@/src/types/edad-atp-v2';

const ALL_DOMAINS: DomainKey[] = [
  'cardiovascular', 'composicion_corporal', 'habitos', 'inflamacion', 'inmunidad',
  'metabolismo', 'renal_micronutrientes', 'sistema_hormonal', 'sueno', 'vitalidad',
];

// Scores reales por dominio del paciente HOMBRES V7 (Reporte de resultados §7).
const PATIENT_HOMBRES_V7_SF_SCORES: Record<DomainKey, number> = {
  metabolismo: 52.87,
  habitos: 57.50,
  cardiovascular: 51.30,
  sueno: 60.08,
  sistema_hormonal: 62.00,
  vitalidad: 59.55,
  inflamacion: 66.22,
  composicion_corporal: 50.00,
  renal_micronutrientes: 82.42,
  inmunidad: 89.60,
};

describe('SF — score9Bands', () => {
  // 8 fronteras → 9 bandas. Banda central (óptimo_2) = 100.
  const thresholds = [10, 20, 30, 40, 60, 70, 80, 90];
  it('valor en banda central → 100', () => {
    expect(score9Bands(50, thresholds)).toBe(100);
  });
  it('valor crítico bajo → 0', () => {
    expect(score9Bands(5, thresholds)).toBe(0);
  });
  it('valor fuera de rango alto → 0', () => {
    expect(score9Bands(95, thresholds)).toBe(0);
  });
});

describe('SF — computeSFGlobal', () => {
  it('todo óptimo (100) → SF ~1.0', () => {
    const scores = Object.fromEntries(ALL_DOMAINS.map((d) => [d, 100])) as Record<DomainKey, number>;
    expect(computeSFGlobal(scores).sf).toBeCloseTo(1.0, 2);
  });

  it('todo crítico (0) → SF cerca de 0', () => {
    const scores = Object.fromEntries(ALL_DOMAINS.map((d) => [d, 0])) as Record<DomainKey, number>;
    expect(computeSFGlobal(scores).sf).toBeLessThan(0.1);
  });

  it('datos faltantes → CE proporcional', () => {
    const partial: Partial<Record<DomainKey, number>> = { metabolismo: 80, cardiovascular: 60 };
    const { ce_percent } = computeSFGlobal(partial);
    expect(ce_percent).toBeCloseTo(20, 1); // 2 de 10 dominios
  });

  it('paciente HOMBRES V7 — SF con pesos iguales (placeholder) = 0.6315', () => {
    // ⚠️ El valor VERIFICADO del Excel es 0.6083, que requiere los PESOS DE
    // DOMINIO reales (no uniformes) ausentes de los docs. Con pesos iguales el
    // mecanismo da 0.6315. Ver flag en COWORK_REPORT.
    const { sf } = computeSFGlobal(PATIENT_HOMBRES_V7_SF_SCORES);
    expect(sf).toBeCloseTo(0.6315, 3);
  });
});
