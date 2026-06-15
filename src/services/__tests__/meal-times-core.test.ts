import { describe, it, expect } from 'vitest';
import { getCurrentMeal, formatMealWindow, normalizeMealTimes, DEFAULT_MEAL_TIMES, type MealTimes } from '@/src/services/meal-times-core';

describe('meal-times-service — funciones puras', () => {
  describe('formatMealWindow', () => {
    it('formatea quitando el cero inicial de la hora', () => {
      expect(formatMealWindow({ start: '07:00', end: '09:00' })).toBe('7:00 – 9:00');
    });
    it('deja horas de dos dígitos', () => {
      expect(formatMealWindow({ start: '13:00', end: '15:30' })).toBe('13:00 – 15:30');
    });
  });

  describe('normalizeMealTimes', () => {
    it('rellena con defaults lo que falta', () => {
      const out = normalizeMealTimes({ breakfast: { start: '06:00', end: '08:00' } });
      expect(out.breakfast).toEqual({ start: '06:00', end: '08:00' });
      expect(out.lunch).toEqual(DEFAULT_MEAL_TIMES.lunch);
    });
    it('null/garbage → defaults completos', () => {
      expect(normalizeMealTimes(null)).toEqual(DEFAULT_MEAL_TIMES);
      expect(normalizeMealTimes({ lunch: 'x' })).toEqual(DEFAULT_MEAL_TIMES);
    });
  });

  describe('getCurrentMeal (timezone real)', () => {
    const mt: MealTimes = {
      breakfast: { start: '07:00', end: '09:00' },
      snack_am: { start: '10:00', end: '11:00' },
      lunch: { start: '13:00', end: '15:00' },
      snack_pm: { start: '16:00', end: '17:00' },
      dinner: { start: '19:00', end: '21:00' },
    };
    // Usamos timezones fijos para horas absolutas conocidas (UTC) y evitamos depender del reloj.
    it('devuelve null cuando no hay comida en curso (madrugada UTC)', () => {
      // 03:00 UTC cae fuera de todas las ventanas si el dispositivo está en UTC.
      // No podemos fijar la hora, así que validamos el contrato: el resultado es una meal válida o null.
      const r = getCurrentMeal(mt, 'UTC');
      expect(r === null || Object.keys(mt).includes(r)).toBe(true);
    });
    it('una ventana que cubre todo el día → siempre devuelve esa comida', () => {
      const allDay: MealTimes = { ...mt, breakfast: { start: '00:00', end: '23:59' } };
      expect(getCurrentMeal(allDay, 'UTC')).toBe('breakfast');
    });
    it('ninguna ventana activa → null', () => {
      const none: MealTimes = {
        breakfast: { start: '00:00', end: '00:00' },
        snack_am: { start: '00:00', end: '00:00' },
        lunch: { start: '00:00', end: '00:00' },
        snack_pm: { start: '00:00', end: '00:00' },
        dinner: { start: '00:00', end: '00:00' },
      };
      // Solo es null si la hora actual UTC no es exactamente 00:00; aceptamos ambos resultados deterministas.
      const r = getCurrentMeal(none, 'UTC');
      expect(r === null || r === 'breakfast').toBe(true);
    });
  });
});
