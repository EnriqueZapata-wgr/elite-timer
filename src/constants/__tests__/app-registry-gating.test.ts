/**
 * ATP 3.0 (5-sep-2026, ruta 1.9): el gating del registro de apps.
 *
 * Lo que se protege aquí es la matriz 3.2 del pivote: qué abre Free, qué
 * exige Pro, y que lo bloqueado SE VE (regla 15: candado, nunca desaparece).
 * Si alguien agrega una app sin decidir su nivel, la lista de abiertas de
 * abajo lo delata: una app nueva sin `minTier` queda abierta para Free, y eso
 * tiene que ser una decisión escrita aquí, no un olvido.
 */
import { describe, it, expect } from 'vitest';
import { APP_REGISTRY, APPS_PROXIMAMENTE, nivelAlcanza, visibleApps } from '../app-registry';

/** Las 14 abiertas para Free (matriz 3.2). Cambiarlas es cambiar el pivote. */
const ABIERTAS_FREE = [
  'comida', 'hidratacion', 'ayuno',
  'medidas', 'cardio',
  'respirar', 'journal',
  'labs', 'edad-atp', 'cuestionario', 'evaluaciones', 'ciclo', 'sol',
  'ajustes',
].sort();

describe('minTier en el registro', () => {
  it('son 35 entradas y todas declaran un minTier válido o ninguno', () => {
    expect(APP_REGISTRY).toHaveLength(35);
    for (const a of APP_REGISTRY) {
      expect([undefined, 'premium', 'elite'], a.key).toContain(a.minTier);
    }
  });

  it('las 14 abiertas para Free son exactamente las de la matriz 3.2', () => {
    const abiertas = APP_REGISTRY.filter((a) => !a.minTier).map((a) => a.key).sort();
    expect(abiertas).toEqual(ABIERTAS_FREE);
  });

  it('todo lo demás exige premium (Elite no cierra ninguna app del registro hoy)', () => {
    const cerradas = APP_REGISTRY.filter((a) => a.minTier);
    expect(cerradas).toHaveLength(21);
    for (const a of cerradas) expect(a.minTier, a.key).toBe('premium');
  });

  it('pivote 1.7: Protocolos ya no se busca por "tratamiento" (palabra roja)', () => {
    const protocolos = APP_REGISTRY.find((a) => a.key === 'protocolos');
    expect(protocolos?.alias ?? []).not.toContain('tratamiento');
    for (const a of APP_REGISTRY) {
      expect(a.alias ?? [], a.key).not.toContain('tratamiento');
    }
  });
});

describe('nivelAlcanza', () => {
  it('sin mínimo, abre para todos', () => {
    expect(nivelAlcanza('free', undefined)).toBe(true);
    expect(nivelAlcanza('premium', undefined)).toBe(true);
    expect(nivelAlcanza('elite', undefined)).toBe(true);
  });

  it('premium abre premium; elite abre premium y elite; free no abre nada cerrado', () => {
    expect(nivelAlcanza('free', 'premium')).toBe(false);
    expect(nivelAlcanza('free', 'elite')).toBe(false);
    expect(nivelAlcanza('premium', 'premium')).toBe(true);
    expect(nivelAlcanza('premium', 'elite')).toBe(false);
    expect(nivelAlcanza('elite', 'premium')).toBe(true);
    expect(nivelAlcanza('elite', 'elite')).toBe(true);
  });
});

describe('visibleApps con nivel', () => {
  it('con free, las 14 abiertas no están bloqueadas y las otras 21 sí', () => {
    const apps = visibleApps(true, 'free');
    expect(apps).toHaveLength(35);
    const libres = apps.filter((a) => !a.bloqueada).map((a) => a.key).sort();
    expect(libres).toEqual(ABIERTAS_FREE);
    expect(apps.filter((a) => a.bloqueada)).toHaveLength(21);
  });

  it('regla 15: con free nada desaparece, solo se marca', () => {
    expect(visibleApps(true, 'free').map((a) => a.key)).toEqual(APP_REGISTRY.map((a) => a.key));
  });

  it('con premium ninguna bloqueada (a quien pagó no se le corta nada)', () => {
    expect(visibleApps(true, 'premium').some((a) => a.bloqueada)).toBe(false);
  });

  it('con elite ninguna bloqueada', () => {
    expect(visibleApps(true, 'elite').some((a) => a.bloqueada)).toBe(false);
  });

  it('sin nivel se asume free (compatibilidad con los llamadores viejos)', () => {
    expect(visibleApps(true).filter((a) => a.bloqueada)).toHaveLength(21);
  });

  it('femaleOnly sigue funcionando en cualquier nivel', () => {
    for (const tier of ['free', 'premium', 'elite'] as const) {
      expect(visibleApps(false, tier).some((a) => a.key === 'ciclo'), tier).toBe(false);
      expect(visibleApps(true, tier).some((a) => a.key === 'ciclo'), tier).toBe(true);
      expect(visibleApps(true, tier).length - visibleApps(false, tier).length, tier).toBe(1);
    }
  });

  it('la evaluación Elite abre solo lo que exige elite, no lo premium', () => {
    // Hoy ninguna app del registro exige elite (Genética entra en la ola 3),
    // así que la excepción no cambia nada para un free con evaluación: lo
    // premium sigue cerrado. Cuando Genética entre con minTier 'elite', este
    // test es el que tiene que cambiar para cubrirla.
    const conEvaluacion = visibleApps(true, 'free', true);
    expect(conEvaluacion.filter((a) => a.bloqueada)).toHaveLength(21);
    expect(conEvaluacion.filter((a) => a.minTier === 'elite' && a.bloqueada)).toHaveLength(0);
  });

  it('no muta el registro', () => {
    visibleApps(true, 'free');
    for (const a of APP_REGISTRY) expect(Object.keys(a), a.key).not.toContain('bloqueada');
  });
});

describe('Genética en PRÓXIMAMENTE (ATP 3.0)', () => {
  it('dice que vive en ATP Elite, sin precio ni compra (Apple 3.1.3)', () => {
    const gen = APPS_PROXIMAMENTE.find((a) => a.key === 'genetica');
    expect(gen?.nota).toContain('Disponible en ATP Elite');
    expect(gen?.nota ?? '').not.toMatch(/\$|MXN|compra|precio/i);
  });
});
