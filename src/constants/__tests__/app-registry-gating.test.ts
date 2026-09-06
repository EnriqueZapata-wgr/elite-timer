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
import {
  ABIERTAS_CON_EVALUACION_ELITE, APP_REGISTRY, APPS_PROXIMAMENTE, nivelAlcanza, visibleApps,
} from '../app-registry';

/** Las 14 abiertas para Free (matriz 3.2). Cambiarlas es cambiar el pivote. */
const ABIERTAS_FREE = [
  'comida', 'hidratacion', 'ayuno',
  'medidas', 'cardio',
  'respirar', 'journal',
  'labs', 'edad-atp', 'cuestionario', 'evaluaciones', 'ciclo', 'sol',
  'ajustes',
].sort();

describe('minTier en el registro', () => {
  // 6-sep-2026 (ruta 3.4): eran 35; Genética subió de APPS_PROXIMAMENTE al
  // registro con minTier 'elite'. Es la única con ese nivel.
  it('son 36 entradas y todas declaran un minTier válido o ninguno', () => {
    expect(APP_REGISTRY).toHaveLength(36);
    for (const a of APP_REGISTRY) {
      expect([undefined, 'premium', 'elite'], a.key).toContain(a.minTier);
    }
  });

  it('las 14 abiertas para Free son exactamente las de la matriz 3.2', () => {
    const abiertas = APP_REGISTRY.filter((a) => !a.minTier).map((a) => a.key).sort();
    expect(abiertas).toEqual(ABIERTAS_FREE);
  });

  it('todo lo demás exige premium, salvo Genética, que exige elite', () => {
    // 6-sep-2026 (ruta 3.4): antes "Elite no cierra ninguna app". Ahora cierra
    // exactamente una, Genética, y la abre la EXISTENCIA de la evaluación
    // (pivote 2.3.3), no solo el nivel. Cualquier otra app con 'elite' es un
    // cambio del pivote y tiene que escribirse aquí.
    const cerradas = APP_REGISTRY.filter((a) => a.minTier);
    expect(cerradas).toHaveLength(22);
    const elite = cerradas.filter((a) => a.minTier === 'elite').map((a) => a.key);
    expect(elite).toEqual(['genetica']);
    for (const a of cerradas) if (a.key !== 'genetica') expect(a.minTier, a.key).toBe('premium');
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
  it('con free, las 14 abiertas no están bloqueadas y las otras 22 sí', () => {
    const apps = visibleApps(true, 'free');
    expect(apps).toHaveLength(36);
    const libres = apps.filter((a) => !a.bloqueada).map((a) => a.key).sort();
    expect(libres).toEqual(ABIERTAS_FREE);
    expect(apps.filter((a) => a.bloqueada)).toHaveLength(22);
  });

  it('regla 15: con free nada desaparece, solo se marca', () => {
    expect(visibleApps(true, 'free').map((a) => a.key)).toEqual(APP_REGISTRY.map((a) => a.key));
  });

  it('con premium solo Genética queda bloqueada (a quien pagó no se le corta nada de lo premium)', () => {
    // 6-sep-2026: Genética es contenido Elite, no premium; premium sin
    // evaluación la ve con candado que abre la página Elite.
    const bloqueadas = visibleApps(true, 'premium').filter((a) => a.bloqueada).map((a) => a.key);
    expect(bloqueadas).toEqual(['genetica']);
  });

  it('con elite ninguna bloqueada', () => {
    expect(visibleApps(true, 'elite').some((a) => a.bloqueada)).toBe(false);
  });

  it('sin nivel se asume free (compatibilidad con los llamadores viejos)', () => {
    expect(visibleApps(true).filter((a) => a.bloqueada)).toHaveLength(22);
  });

  it('femaleOnly sigue funcionando en cualquier nivel', () => {
    for (const tier of ['free', 'premium', 'elite'] as const) {
      expect(visibleApps(false, tier).some((a) => a.key === 'ciclo'), tier).toBe(false);
      expect(visibleApps(true, tier).some((a) => a.key === 'ciclo'), tier).toBe(true);
      expect(visibleApps(true, tier).length - visibleApps(false, tier).length, tier).toBe(1);
    }
  });

  it('la evaluación Elite abre lo que exige elite (Genética) y Suplementos, no el resto de lo premium', () => {
    // 6-sep-2026 (ruta 3.4): Genética ya exige elite. Un free con evaluación
    // cargada (Pro vencido) la ve abierta; y Suplementos también, porque su
    // plan asignado se conserva en solo lectura (regla 1, pivote 2.1). Lo
    // demás premium sigue cerrado: 21 premium menos Suplementos = 20.
    const conEvaluacion = visibleApps(true, 'free', true);
    expect(conEvaluacion.filter((a) => a.bloqueada)).toHaveLength(20);
    expect(conEvaluacion.filter((a) => a.minTier === 'elite' && a.bloqueada)).toHaveLength(0);
    expect(conEvaluacion.find((a) => a.key === 'genetica')?.bloqueada).toBe(false);
    expect(conEvaluacion.find((a) => a.key === 'suplementos')?.bloqueada).toBe(false);
    // Sin evaluación, elite (el nivel) también la abre.
    expect(visibleApps(true, 'elite').find((a) => a.key === 'genetica')?.bloqueada).toBe(false);
  });

  it('ABIERTAS_CON_EVALUACION_ELITE: solo Suplementos, existe en el registro y sin evaluación sigue cerrada para free', () => {
    expect([...ABIERTAS_CON_EVALUACION_ELITE]).toEqual(['suplementos']);
    for (const key of ABIERTAS_CON_EVALUACION_ELITE) {
      expect(APP_REGISTRY.some((a) => a.key === key), key).toBe(true);
    }
    // La excepción es por EXISTENCIA de la evaluación: sin ella, Suplementos
    // sigue siendo Pro para un free (nada se regala por accidente).
    expect(visibleApps(true, 'free', false).find((a) => a.key === 'suplementos')?.bloqueada).toBe(true);
    expect(visibleApps(true, 'premium', false).find((a) => a.key === 'suplementos')?.bloqueada).toBe(false);
  });

  it('no muta el registro', () => {
    visibleApps(true, 'free');
    for (const a of APP_REGISTRY) expect(Object.keys(a), a.key).not.toContain('bloqueada');
  });
});

describe('Genética en el registro (ATP 3.0, ruta 3.4)', () => {
  // 6-sep-2026: antes vivía en APPS_PROXIMAMENTE con la nota "Disponible en
  // ATP Elite". Ahora es una app real de Salud con minTier 'elite' y ruta
  // propia; el candado que ven Free y Pro abre la página Elite (RUTA_ELITE),
  // y la nota de Apple 3.1.3 (sin precio ni compra) se cuida en la ficha.
  it('ya no está en PRÓXIMAMENTE y sí en el registro, en Salud, con ruta y nivel elite', () => {
    expect(APPS_PROXIMAMENTE.find((a) => a.key === 'genetica')).toBeUndefined();
    const gen = APP_REGISTRY.find((a) => a.key === 'genetica');
    expect(gen?.section).toBe('salud');
    expect(gen?.minTier).toBe('elite');
    expect(String(gen?.route)).toBe('/salud/genetica');
    expect(gen?.icon).toBe('genetica');
    expect(gen?.installable).toBe(false);
  });

  it('su ficha no habla de precio ni de compra (Apple 3.1.3)', () => {
    const gen = APP_REGISTRY.find((a) => a.key === 'genetica');
    expect(gen?.description ?? '').not.toMatch(/\$|MXN|compra|precio|web|stripe/i);
  });
});
