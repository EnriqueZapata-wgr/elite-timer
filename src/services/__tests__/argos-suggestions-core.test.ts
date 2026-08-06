/**
 * MB-21 P4.4 — el estado vacío propone algo DE HOY, no seis chips fijos.
 */
import { describe, it, expect } from 'vitest';
import {
  CHAT_SUGGESTIONS_COUNT,
  EVENING_HOUR,
  MEALS_MATTER_FROM_HOUR,
  DEFAULT_SUGGESTIONS,
  buildTodaySuggestions,
  type TodaySignals,
} from '@/src/services/argos-suggestions-core';

const neutral: TodaySignals = {
  hasInsight: false,
  fastingActive: false,
  mealsToday: null,
  electronsEarned: null,
  hour: 9,
};

describe('buildTodaySuggestions', () => {
  it('sin señales → los seis de siempre', () => {
    expect(buildTodaySuggestions(neutral)).toEqual(DEFAULT_SUGGESTIONS);
  });

  it('siempre devuelve exactamente el número de chips del estado vacío', () => {
    const full: TodaySignals = {
      hasInsight: true, fastingActive: true, mealsToday: 3, electronsEarned: 12, hour: 20,
    };
    expect(buildTodaySuggestions(neutral)).toHaveLength(CHAT_SUGGESTIONS_COUNT);
    expect(buildTodaySuggestions(full)).toHaveLength(CHAT_SUGGESTIONS_COUNT);
  });

  it('con insight del día → chip de "lo que ARGOS notó" primero', () => {
    const out = buildTodaySuggestions({ ...neutral, hasInsight: true });
    expect(out[0].label).toContain('notaste hoy');
  });

  it('ayuno activo → chip del ayuno, sin el chip de "no has comido"', () => {
    const out = buildTodaySuggestions({ ...neutral, fastingActive: true, mealsToday: 0, hour: 14 });
    expect(out.some(s => s.label.includes('ayuno'))).toBe(true);
    expect(out.some(s => s.label.includes('No he registrado'))).toBe(false);
  });

  it('cero comidas pasado el mediodía (sin ayuno) → lo que falta', () => {
    const out = buildTodaySuggestions({ ...neutral, mealsToday: 0, hour: MEALS_MATTER_FROM_HOUR });
    expect(out.some(s => s.label.includes('No he registrado comidas'))).toBe(true);
  });

  it('cero comidas de madrugada NO regaña', () => {
    const out = buildTodaySuggestions({ ...neutral, mealsToday: 0, hour: 7 });
    expect(out.some(s => s.label.includes('No he registrado'))).toBe(false);
  });

  it('comidas registradas → lo que registraste', () => {
    const out = buildTodaySuggestions({ ...neutral, mealsToday: 2, hour: 14 });
    expect(out.some(s => s.label.includes('nutrición hoy'))).toBe(true);
  });

  it('tarde-noche con electrones → cerrar el día', () => {
    const out = buildTodaySuggestions({ ...neutral, electronsEarned: 8, hour: EVENING_HOUR });
    expect(out.some(s => s.label.includes('cerrar el día'))).toBe(true);
  });

  it('nunca repite icono (dos chips de restaurante confunden)', () => {
    const out = buildTodaySuggestions({
      hasInsight: true, fastingActive: false, mealsToday: 0, electronsEarned: 5, hour: 18,
    });
    const icons = out.map(s => s.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
