import { describe, it, expect } from 'vitest';
import {
  expectedDaysPerWeek,
  weeklyAdherencePct,
  doseCountFor,
  takenDaysBySupplement,
  supplementsTodayProgress,
} from '@/src/services/supplements-adherence-core';

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

// NOTA Sprint SUPS+BHA: el catálogo curado (SUPPLEMENT_CATALOG) se degradó —
// doctrina "suplementos son REGISTRO, no recomendación". Biblioteca vacía por
// default; sus tests se eliminaron junto con src/constants/supplement-catalog.ts.

describe('doseCountFor — multi-dosis (188)', () => {
  it('legacy sin dose_times → 1 toma', () => {
    expect(doseCountFor(null)).toBe(1);
    expect(doseCountFor(undefined)).toBe(1);
    expect(doseCountFor([])).toBe(1);
  });
  it('N etiquetas válidas → N tomas', () => {
    expect(doseCountFor(['mañana'])).toBe(1);
    expect(doseCountFor(['mañana', 'comida', 'noche'])).toBe(3);
  });
  it('ignora entradas vacías/no-string', () => {
    expect(doseCountFor(['mañana', '', '  '])).toBe(1);
    expect(doseCountFor(['08:00', '20:00'])).toBe(2);
  });
});

describe('takenDaysBySupplement — dedupe por fecha (adherencia sigue por días)', () => {
  it('N logs multi-dosis en el mismo día cuentan como 1 día', () => {
    const days = takenDaysBySupplement([
      { supplement_id: 'a', date: '2026-07-10', taken: true },
      { supplement_id: 'a', date: '2026-07-10', taken: true }, // 2ª toma, mismo día
      { supplement_id: 'a', date: '2026-07-09', taken: true },
      { supplement_id: 'b', date: '2026-07-10', taken: true },
    ]);
    expect(days['a']).toBe(2);
    expect(days['b']).toBe(1);
  });
  it('ignora taken=false y filas sin fecha', () => {
    const days = takenDaysBySupplement([
      { supplement_id: 'a', date: '2026-07-10', taken: false },
      { supplement_id: 'a', date: '', taken: true },
    ]);
    expect(days['a']).toBeUndefined();
  });
});

describe('supplementsTodayProgress — N tomas = N checks (card HOY)', () => {
  const supps = [
    { id: 'vitc', dose_times: ['mañana', 'comida', 'noche'] }, // 3 tomas
    { id: 'mg', dose_times: null },                             // legacy 1 toma
  ];
  it('total = Σ tomas; taken cuenta tomas individuales', () => {
    expect(supplementsTodayProgress(supps, [])).toEqual({ total: 4, taken: 0 });
    expect(supplementsTodayProgress(supps, [
      { supplement_id: 'vitc', dose_index: 0, taken: true },
      { supplement_id: 'vitc', dose_index: 2, taken: true },
      { supplement_id: 'mg', dose_index: 0, taken: true },
    ])).toEqual({ total: 4, taken: 3 });
  });
  it('dedupe por (supp, dose_index) y cap al nº de tomas (logs huérfanos no inflan)', () => {
    expect(supplementsTodayProgress(supps, [
      { supplement_id: 'mg', dose_index: 0, taken: true },
      { supplement_id: 'mg', dose_index: 0, taken: true }, // duplicado
      { supplement_id: 'mg', dose_index: 5, taken: true }, // huérfano de dosis eliminada
    ])).toEqual({ total: 4, taken: 1 });
  });
  it('logs de suplementos inactivos no cuentan; dose_index null → 0 (legacy)', () => {
    expect(supplementsTodayProgress(supps, [
      { supplement_id: 'inactivo', dose_index: 0, taken: true },
      { supplement_id: 'vitc', dose_index: null, taken: true },
    ])).toEqual({ total: 4, taken: 1 });
  });
});
