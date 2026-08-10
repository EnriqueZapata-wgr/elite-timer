/**
 * MB-31A · Pieza 5 — los cuatro modos, puros.
 *
 *   6 · Sin preferencia guardada, el tema es OSCURO.
 *   7 · Adaptativo usa el horario del USUARIO, no el del sistema: cambiar
 *       el horario mueve el switch; cambiar el ajuste del sistema no lo
 *       afecta. Y "como el teléfono" hace exactamente lo contrario.
 */
import { describe, it, expect } from 'vitest';
import {
  parseStoredMode,
  resolveThemeKind,
  adaptiveKindAt,
  hhmmToMinutes,
  THEME_MODE_DEFAULT,
  type ThemeResolveCtx,
} from '@/src/services/theme/theme-mode-core';

const ctx = (over: Partial<ThemeResolveCtx> = {}): ThemeResolveCtx => ({
  nowMinutes: 12 * 60,
  despertarMinutes: 7 * 60,
  corteMinutes: 21 * 60 + 45,
  systemScheme: 'light',
  ...over,
});

describe('6 · el default es oscuro', () => {
  it('sin nada guardado (null/undefined/basura) → oscuro', () => {
    expect(parseStoredMode(null)).toBe('oscuro');
    expect(parseStoredMode(undefined)).toBe('oscuro');
    expect(parseStoredMode('amanecer')).toBe('oscuro');
    expect(parseStoredMode(42)).toBe('oscuro');
    expect(THEME_MODE_DEFAULT).toBe('oscuro');
  });

  it('lo guardado válido se respeta', () => {
    for (const m of ['claro', 'oscuro', 'adaptativo', 'sistema'] as const) {
      expect(parseStoredMode(m)).toBe(m);
    }
  });

  it('claro y oscuro son absolutos: ni hora ni sistema los mueven', () => {
    expect(resolveThemeKind('oscuro', ctx({ systemScheme: 'light', nowMinutes: 12 * 60 }))).toBe('dark');
    expect(resolveThemeKind('claro', ctx({ systemScheme: 'dark', nowMinutes: 3 * 60 }))).toBe('light');
  });
});

describe('7 · adaptativo es del usuario, no del sistema', () => {
  it('mediodía con horario estándar → claro; madrugada → oscuro', () => {
    expect(resolveThemeKind('adaptativo', ctx({ nowMinutes: 12 * 60 }))).toBe('light');
    expect(resolveThemeKind('adaptativo', ctx({ nowMinutes: 3 * 60 }))).toBe('dark');
  });

  it('cambiar el ajuste del SISTEMA no lo afecta', () => {
    const base = ctx({ nowMinutes: 23 * 60 }); // 23:00, después del corte
    expect(resolveThemeKind('adaptativo', { ...base, systemScheme: 'light' }))
      .toBe(resolveThemeKind('adaptativo', { ...base, systemScheme: 'dark' }));
  });

  it('cambiar el HORARIO mueve el momento del switch', () => {
    // 22:30. Con corte 21:45 ya es oscuro; el mismo reloj con corte 23:30 sigue claro.
    const noche = 22 * 60 + 30;
    expect(resolveThemeKind('adaptativo', ctx({ nowMinutes: noche }))).toBe('dark');
    expect(resolveThemeKind('adaptativo', ctx({ nowMinutes: noche, corteMinutes: 23 * 60 + 30 }))).toBe('light');
  });

  it('el lobo (despierta 11:00, corta 01:30) sigue en claro a las 23:00', () => {
    // El ajuste del teléfono lo mandaría a oscuro horas antes; adaptativo no.
    expect(adaptiveKindAt(23 * 60, 11 * 60, 1 * 60 + 30)).toBe('light');
    expect(adaptiveKindAt(0, 11 * 60, 1 * 60 + 30)).toBe('light');   // 00:00, aún claro
    expect(adaptiveKindAt(2 * 60, 11 * 60, 1 * 60 + 30)).toBe('dark'); // 02:00, ya cortó
    expect(adaptiveKindAt(9 * 60, 11 * 60, 1 * 60 + 30)).toBe('dark'); // aún no despierta
  });

  it('ventana degenerada (despertar == corte) → oscuro', () => {
    expect(adaptiveKindAt(12 * 60, 8 * 60, 8 * 60)).toBe('dark');
  });

  it('"como el teléfono" hace lo contrario: SOLO mira el sistema', () => {
    expect(resolveThemeKind('sistema', ctx({ systemScheme: 'light', nowMinutes: 3 * 60 }))).toBe('light');
    expect(resolveThemeKind('sistema', ctx({ systemScheme: 'dark', nowMinutes: 12 * 60 }))).toBe('dark');
    // Sin dato del sistema → el canónico.
    expect(resolveThemeKind('sistema', ctx({ systemScheme: null }))).toBe('dark');
  });
});

describe('hhmmToMinutes (el puente desde habit-times)', () => {
  it('parsea HH:MM y HH:MM:SS; rechaza basura', () => {
    expect(hhmmToMinutes('07:00')).toBe(420);
    expect(hhmmToMinutes('21:45:00')).toBe(1305);
    expect(hhmmToMinutes('25:00')).toBeNull();
    expect(hhmmToMinutes('media noche')).toBeNull();
    expect(hhmmToMinutes(null)).toBeNull();
  });
});
