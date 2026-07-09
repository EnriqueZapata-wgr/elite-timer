import { describe, it, expect } from 'vitest';
import {
  DOSE_PATTERNS,
  expectedDaysPerWeek,
  weeklyAdherencePct,
} from '@/src/services/supplements-adherence-core';
import { SUPPLEMENT_CATALOG, catalogByObjective, OBJECTIVE_LABELS } from '@/src/constants/supplement-catalog';

describe('expectedDaysPerWeek — patrón → días esperados (T4 #54)', () => {
  it('mapea los 4 patrones', () => {
    expect(expectedDaysPerWeek('1× diario')).toBe(7);
    expect(expectedDaysPerWeek('2× diario')).toBe(7); // binario por día (v1)
    expect(expectedDaysPerWeek('lun/mié/vie')).toBe(3);
    expect(expectedDaysPerWeek('semanal')).toBe(1);
  });
  it('legacy sin patrón → diario', () => {
    expect(expectedDaysPerWeek(null)).toBe(7);
    expect(expectedDaysPerWeek(undefined)).toBe(7);
    expect(expectedDaysPerWeek('otra cosa')).toBe(7);
  });
});

describe('weeklyAdherencePct', () => {
  it('adherencia perfecta multi-patrón → 100', () => {
    expect(weeklyAdherencePct([
      { dosePattern: '1× diario', takenDays: 7 },
      { dosePattern: 'lun/mié/vie', takenDays: 3 },
      { dosePattern: 'semanal', takenDays: 1 },
    ])).toBe(100);
  });
  it('parcial: diario 3.5/7 + semanal 1/1 → 75', () => {
    expect(weeklyAdherencePct([
      { dosePattern: '1× diario', takenDays: 3.5 },
      { dosePattern: 'semanal', takenDays: 1 },
    ])).toBe(75);
  });
  it('tomar de más NO compensa otro suplemento (cap por suplemento)', () => {
    expect(weeklyAdherencePct([
      { dosePattern: 'semanal', takenDays: 7 }, // cap a 100%
      { dosePattern: '1× diario', takenDays: 0 },
    ])).toBe(50);
  });
  it('sin suplementos → null (no aplica)', () => {
    expect(weeklyAdherencePct([])).toBeNull();
  });
});

describe('SUPPLEMENT_CATALOG — catálogo curado (review Mariana pendiente)', () => {
  it('todos los items tienen dosis, patrón válido, evidencia con [Nivel N] y objetivo válido', () => {
    for (const item of SUPPLEMENT_CATALOG) {
      expect(item.dose.length).toBeGreaterThan(0);
      expect(DOSE_PATTERNS).toContain(item.dosePattern);
      expect(item.evidence).toMatch(/\[Nivel [1-5]\]/);
      expect(Object.keys(OBJECTIVE_LABELS)).toContain(item.objective);
    }
  });
  it('ids únicos y cobertura de los 5 objetivos', () => {
    const ids = SUPPLEMENT_CATALOG.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    (Object.keys(OBJECTIVE_LABELS) as (keyof typeof OBJECTIVE_LABELS)[]).forEach(obj => {
      expect(catalogByObjective(obj).length).toBeGreaterThan(0);
    });
  });
  it('suplementos con riesgo conocido llevan cautions (ashwagandha, zinc, omega-3)', () => {
    const byId = (id: string) => SUPPLEMENT_CATALOG.find(s => s.id === id)!;
    expect(byId('ashwagandha').cautions).toBeTruthy();
    expect(byId('zinc').cautions).toBeTruthy();
    expect(byId('omega3').cautions).toBeTruthy();
  });
});
