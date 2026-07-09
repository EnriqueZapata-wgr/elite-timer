import { describe, it, expect } from 'vitest';
import {
  screenFromPath,
  buildScreenContext,
  screenContextFromPath,
  coerceScreen,
  buildScreenContextInjection,
  type ArgosScreen,
} from '@/src/hooks/argos-screen-context-core';

describe('screenFromPath — mapea ruta → pantalla canónica', () => {
  const cases: Array<[string, ArgosScreen]> = [
    ['/', 'hoy'],
    ['/(tabs)', 'hoy'],
    ['/index', 'hoy'],
    ['/nutrition', 'nutrition'],
    ['/food-scan', 'nutrition'],
    ['/fasting', 'nutrition'],
    ['/fitness-hub', 'fitness'],
    ['/routine-execution', 'fitness'],
    ['/timer', 'fitness'],
    ['/journal', 'mind'],
    ['/breathing', 'mind'],
    ['/meditation', 'mind'],
    ['/my-health', 'health'],
    ['/glucose-log', 'health'],
    ['/clinical-system', 'health'],
    ['/cycle', 'cycle'],
    ['/cycle-charts', 'cycle'],
    ['/argos-chat', 'argos'],
    ['/argos/conversations', 'argos'],
    ['/settings', 'other'],
    ['/paywall', 'other'],
  ];
  it.each(cases)('%s → %s', (path, expected) => {
    expect(screenFromPath(path)).toBe(expected);
  });

  it('null/undefined/empty → other', () => {
    expect(screenFromPath(null)).toBe('other');
    expect(screenFromPath(undefined)).toBe('other');
    expect(screenFromPath('')).toBe('other');
  });

  it('es case-insensitive', () => {
    expect(screenFromPath('/NUTRITION')).toBe('nutrition');
  });
});

describe('buildScreenContext / screenContextFromPath', () => {
  it('adjunta la etiqueta humana correcta', () => {
    expect(buildScreenContext('nutrition').label).toBe('Nutrición');
    expect(buildScreenContext('hoy').label).toBe('HOY');
  });
  it('screenContextFromPath compone ambos pasos', () => {
    const ctx = screenContextFromPath('/glucose-log');
    expect(ctx.screen).toBe('health');
    expect(ctx.label).toBe('Salud');
  });
});

describe('coerceScreen — valida route params', () => {
  it('acepta pantallas válidas', () => {
    expect(coerceScreen('nutrition')).toBe('nutrition');
    expect(coerceScreen('hoy')).toBe('hoy');
  });
  it('rechaza basura → undefined', () => {
    expect(coerceScreen('banana')).toBeUndefined();
    expect(coerceScreen('')).toBeUndefined();
    expect(coerceScreen(null)).toBeUndefined();
    expect(coerceScreen(undefined)).toBeUndefined();
  });
});

describe('buildScreenContextInjection — capa de prompt', () => {
  it('inyecta contexto para pantallas con pilar', () => {
    const s = buildScreenContextInjection('nutrition');
    expect(s).toContain('CONTEXTO DE PANTALLA');
    expect(s).toContain('Nutrición');
  });
  it('vacío para argos (redundante) y other (no aporta) y undefined', () => {
    expect(buildScreenContextInjection('argos')).toBe('');
    expect(buildScreenContextInjection('other')).toBe('');
    expect(buildScreenContextInjection(undefined)).toBe('');
  });
});
