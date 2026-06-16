import { describe, it, expect } from 'vitest';
import { mealAgendaItems, sleepAgendaItem } from '@/src/utils/agenda-extras';
import { DEFAULT_MEAL_TIMES, type MealTimes } from '@/src/services/meal-times-core';

describe('agenda-extras — mealAgendaItems', () => {
  it('genera un item por las 5 comidas (defaults)', () => {
    const items = mealAgendaItems(DEFAULT_MEAL_TIMES);
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.id)).toEqual([
      'meal-breakfast', 'meal-snack_am', 'meal-lunch', 'meal-snack_pm', 'meal-dinner',
    ]);
  });
  it('usa el start time y marca informational + category nutrition', () => {
    const items = mealAgendaItems(DEFAULT_MEAL_TIMES);
    const desayuno = items[0];
    expect(desayuno.time).toBe('07:00');
    expect(desayuno.name).toBe('Desayuno');
    expect(desayuno.informational).toBe(true);
    expect(desayuno.category).toBe('nutrition');
    expect(desayuno.isNext).toBe(false);
  });
  it('respeta horarios custom del usuario', () => {
    const custom: MealTimes = { ...DEFAULT_MEAL_TIMES, breakfast: { start: '06:30', end: '08:00' } };
    expect(mealAgendaItems(custom)[0].time).toBe('06:30');
  });
});

describe('agenda-extras — sleepAgendaItem', () => {
  it('acepta "23:00"', () => {
    const it = sleepAgendaItem('23:00');
    expect(it?.time).toBe('23:00');
    expect(it?.name).toBe('Dormir');
    expect(it?.informational).toBe(true);
    expect(it?.category).toBe('rest');
  });
  it('recorta "23:00:00" → "23:00"', () => {
    expect(sleepAgendaItem('23:00:00')?.time).toBe('23:00');
  });
  it('null/undefined/vacío → null', () => {
    expect(sleepAgendaItem(null)).toBeNull();
    expect(sleepAgendaItem(undefined)).toBeNull();
    expect(sleepAgendaItem('')).toBeNull();
  });
  it('valor no horario → null (defensivo)', () => {
    expect(sleepAgendaItem('madrugada')).toBeNull();
  });
});
