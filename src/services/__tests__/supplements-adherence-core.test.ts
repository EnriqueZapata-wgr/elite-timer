import { describe, it, expect } from 'vitest';
import {
  expectedDaysPerWeek,
  weeklyAdherencePct,
  doseCountFor,
  takenDosesBySupplement,
  supplementsTodayProgress,
  isCustomDoseTime,
  normalizeDoseTimeInput,
  sortDoseTimes,
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

describe('weeklyAdherencePct — por TOMA (MB-2)', () => {
  it('adherencia perfecta multi-patrón → 100', () => {
    expect(weeklyAdherencePct([
      { dosePattern: '1× diario', doseCount: 1, takenDoses: 7 },
      { dosePattern: 'lun/mié/vie', doseCount: 1, takenDoses: 3 },
      { dosePattern: 'semanal', doseCount: 1, takenDoses: 1 },
    ])).toBe(100);
  });
  it('multi-dosis: 2 tomas/día diario espera 14 tomas — 7 tomadas = 50%', () => {
    // Esta es la costura del brief: en v1 (por días) 1 de 2 tomas contaba el día completo
    expect(weeklyAdherencePct([
      { dosePattern: '1× diario', doseCount: 2, takenDoses: 7 },
    ])).toBe(50);
  });
  it('parcial: diario 3.5/7 + semanal 1/1 → 75', () => {
    expect(weeklyAdherencePct([
      { dosePattern: '1× diario', doseCount: 1, takenDoses: 3.5 },
      { dosePattern: 'semanal', doseCount: 1, takenDoses: 1 },
    ])).toBe(75);
  });
  it('tomar de más NO compensa otro suplemento (cap por suplemento)', () => {
    expect(weeklyAdherencePct([
      { dosePattern: 'semanal', doseCount: 1, takenDoses: 7 }, // cap a 100%
      { dosePattern: '1× diario', doseCount: 1, takenDoses: 0 },
    ])).toBe(50);
  });
  it('doseCount 0/inválido se trata como 1 (legacy defensivo)', () => {
    expect(weeklyAdherencePct([
      { dosePattern: '1× diario', doseCount: 0, takenDoses: 7 },
    ])).toBe(100);
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

describe('takenDosesBySupplement — tomas reales, dedupe (fecha, dose_index) (MB-2)', () => {
  const doseCounts = { a: 2, b: 1 };
  it('cuenta tomas individuales por día (2 tomas mismo día = 2)', () => {
    const doses = takenDosesBySupplement([
      { supplement_id: 'a', date: '2026-07-10', dose_index: 0, taken: true },
      { supplement_id: 'a', date: '2026-07-10', dose_index: 1, taken: true },
      { supplement_id: 'a', date: '2026-07-09', dose_index: 0, taken: true },
      { supplement_id: 'b', date: '2026-07-10', dose_index: 0, taken: true },
    ], doseCounts);
    expect(doses['a']).toBe(3);
    expect(doses['b']).toBe(1);
  });
  it('dedupe por (fecha, dose_index) y cap por día al nº de tomas (huérfanos no inflan)', () => {
    const doses = takenDosesBySupplement([
      { supplement_id: 'b', date: '2026-07-10', dose_index: 0, taken: true },
      { supplement_id: 'b', date: '2026-07-10', dose_index: 0, taken: true }, // duplicado
      { supplement_id: 'b', date: '2026-07-10', dose_index: 5, taken: true }, // huérfano de dosis eliminada
    ], doseCounts);
    expect(doses['b']).toBe(1);
  });
  it('dose_index null → 0 (legacy); suplementos fuera de doseCounts (inactivos) no cuentan', () => {
    const doses = takenDosesBySupplement([
      { supplement_id: 'b', date: '2026-07-10', dose_index: null, taken: true },
      { supplement_id: 'inactivo', date: '2026-07-10', dose_index: 0, taken: true },
    ], doseCounts);
    expect(doses['b']).toBe(1);
    expect(doses['inactivo']).toBeUndefined();
  });
  it('ignora taken=false y filas sin fecha', () => {
    const doses = takenDosesBySupplement([
      { supplement_id: 'a', date: '2026-07-10', dose_index: 0, taken: false },
      { supplement_id: 'a', date: '', dose_index: 0, taken: true },
    ], doseCounts);
    expect(doses['a']).toBeUndefined();
  });
});

describe('hora custom HH:MM en dose_times (MB-2 §4)', () => {
  it('isCustomDoseTime distingue horas de etiquetas', () => {
    expect(isCustomDoseTime('08:30')).toBe(true);
    expect(isCustomDoseTime('8:30')).toBe(true);
    expect(isCustomDoseTime('mañana')).toBe(false);
  });
  it('normalizeDoseTimeInput acepta 8:30 / 08:30 / 830 / 0830 → HH:MM', () => {
    expect(normalizeDoseTimeInput('8:30')).toBe('08:30');
    expect(normalizeDoseTimeInput('08:30')).toBe('08:30');
    expect(normalizeDoseTimeInput('830')).toBe('08:30');
    expect(normalizeDoseTimeInput('0830')).toBe('08:30');
    expect(normalizeDoseTimeInput(' 21:05 ')).toBe('21:05');
    expect(normalizeDoseTimeInput('0:00')).toBe('00:00');
  });
  it('rechaza inválidos y fuera de rango', () => {
    expect(normalizeDoseTimeInput('24:00')).toBeNull();
    expect(normalizeDoseTimeInput('12:60')).toBeNull();
    expect(normalizeDoseTimeInput('abc')).toBeNull();
    expect(normalizeDoseTimeInput('')).toBeNull();
    expect(normalizeDoseTimeInput(null)).toBeNull();
    expect(normalizeDoseTimeInput('12345')).toBeNull();
  });
  it('sortDoseTimes ordena cronológicamente mezclando etiquetas y horas', () => {
    // mañana=08:00, comida=14:00, tarde=17:00, noche=21:00 (mismos que agenda)
    expect(sortDoseTimes(['noche', '06:30', 'comida', '15:00', 'mañana']))
      .toEqual(['06:30', 'mañana', 'comida', '15:00', 'noche']);
    expect(sortDoseTimes(['rarito', '09:00'])).toEqual(['09:00', 'rarito']);
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
