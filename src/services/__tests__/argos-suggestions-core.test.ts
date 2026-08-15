/**
 * MB-21 P4.4 — el estado vacío propone algo DE HOY, no seis chips fijos.
 */
import { describe, it, expect } from 'vitest';
import {
  CHAT_SUGGESTIONS_COUNT,
  EVENING_HOUR,
  MEALS_MATTER_FROM_HOUR,
  DEFAULT_SUGGESTIONS,
  NAV_SUGGESTIONS,
  buildTodaySuggestions,
  type TodaySignals,
} from '@/src/services/argos-suggestions-core';
import { detectarIntencionNavegacion } from '@/src/services/argos-nav-intent-core';

const neutral: TodaySignals = {
  hasInsight: false,
  fastingActive: false,
  mealsToday: null,
  electronsEarned: null,
  hour: 9,
};

describe('buildTodaySuggestions', () => {
  // CIERRE-1: este caso decía "sin señales → los seis de siempre" y afirmaba
  // igualdad exacta con DEFAULT_SUGGESTIONS. Esa política cambió a propósito:
  // dos de los seis lugares ahora son de navegación, porque nadie descubría
  // que la orbe es también el buscador de la app. El candado no se debilita,
  // se reapunta: se sigue exigiendo que sin señales el relleno salga de los
  // defaults y en su orden, pero después de la cuota de navegación.
  it('sin señales → los dos de navegación y luego los defaults en orden', () => {
    const out = buildTodaySuggestions(neutral);
    expect(out.slice(0, NAV_SUGGESTIONS.length)).toEqual(NAV_SUGGESTIONS);
    expect(out.slice(NAV_SUGGESTIONS.length)).toEqual(
      DEFAULT_SUGGESTIONS.slice(0, CHAT_SUGGESTIONS_COUNT - NAV_SUGGESTIONS.length),
    );
  });

  // El punto entero del cambio: si un día con muchas señales vivas los
  // empujara fuera del corte de seis, volverían a ser invisibles justo los
  // días en que el usuario más abre el chat.
  it('los chips de navegación sobreviven aunque el día venga lleno de señales', () => {
    const full: TodaySignals = {
      hasInsight: true, fastingActive: true, mealsToday: 3, electronsEarned: 12, hour: 20,
    };
    for (const signals of [neutral, full]) {
      const labels = buildTodaySuggestions(signals).map(s => s.label);
      for (const nav of NAV_SUGGESTIONS) expect(labels).toContain(nav.label);
    }
  });

  // Contrato con el navegador: estos chips valen porque resuelven ANTES del
  // modelo (0 protones, 0 cuota). Eso solo pasa si el texto arranca con un
  // disparador y no contiene ningún veto. Si alguien reescribe el copy y
  // rompe eso, el chip empieza a COBRAR y nadie se entera.
  it('cada chip de navegación es detectado como navegación, no como consulta', () => {
    for (const nav of NAV_SUGGESTIONS) {
      expect(detectarIntencionNavegacion(nav.label).es).toBe(true);
    }
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
