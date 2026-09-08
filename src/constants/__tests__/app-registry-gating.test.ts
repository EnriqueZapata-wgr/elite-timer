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
import { palabrasRojasEn } from '@/src/services/elite/elite-v3-core';

/**
 * 7-sep-2026 (VENTA_AL_PUBLICO): el gating del registro se RE-APUNTA, no se
 * afloja. Cada llamada a `nivelAlcanza` y a `visibleApps` pasa `VENDIENDO`
 * explícito y sigue exigiendo la matriz 3.2 completa, app por app, para que el
 * contrato siga protegido el día que vuelva la venta al público. El bloque
 * nuevo del final prueba el comportamiento de HOY, con la venta apagada.
 */
const VENDIENDO = true;
const NO_VENDIENDO = false;

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
  // 7-sep-2026 (pivote limpio, decisión del dueño): 36 → 35. Salió Protocolos:
  // "Mi Protocolo" deja de ser pantalla, la persona ya no elige práctica por
  // práctica sino su objetivo. El conteo se RE-APUNTA con su motivo escrito,
  // no se afloja: sigue siendo un número exacto.
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

  it('todo lo demás exige premium, salvo Genética, que exige elite', () => {
    // 6-sep-2026 (ruta 3.4): antes "Elite no cierra ninguna app". Ahora cierra
    // exactamente una, Genética, y la abre la EXISTENCIA de la evaluación
    // (pivote 2.3.3), no solo el nivel. Cualquier otra app con 'elite' es un
    // cambio del pivote y tiene que escribirse aquí.
    // 7-sep-2026 (pivote limpio): 22 → 21. La que salió es Protocolos, que
    // era premium. Ninguna app cambió de nivel: se retiró la entrada.
    const cerradas = APP_REGISTRY.filter((a) => a.minTier);
    expect(cerradas).toHaveLength(21);
    const elite = cerradas.filter((a) => a.minTier === 'elite').map((a) => a.key);
    expect(elite).toEqual(['genetica']);
    for (const a of cerradas) if (a.key !== 'genetica') expect(a.minTier, a.key).toBe('premium');
  });

  // 7-sep-2026: el candado nació apuntando a Protocolos (pivote 1.7) y esa
  // entrada ya no existe. En lugar de borrarlo se re-apunta a lo que de verdad
  // protegía: ninguna app se busca con una palabra roja. Y la lista NO se
  // copia a mano: la primera versión de este re-apunte listaba siete palabras
  // y se le fueron "previene", "medico de IA" y "clinicamente validado". La
  // lista canónica vive en elite-v3-core (informe legal, sección 4) y se
  // consulta con su misma función, así que crecer aquella lista aprieta este
  // candado solo. Se revisa el copy que ve el usuario: etiqueta, alias y
  // descripción.
  it('ninguna app se busca ni se describe con una palabra roja', () => {
    for (const a of APP_REGISTRY) {
      for (const alias of a.alias ?? []) {
        expect(palabrasRojasEn(alias), `${a.key} / alias "${alias}"`).toEqual([]);
      }
      expect(palabrasRojasEn(a.label), `${a.key} / etiqueta`).toEqual([]);
      expect(palabrasRojasEn(a.description ?? ''), `${a.key} / descripción`).toEqual([]);
    }
  });

  // 7-sep-2026 (pivote limpio): Protocolos salió del registro. El candado que
  // lo cuidaba se convierte en el candado de que NO vuelva por accidente: la
  // puerta se retiró a propósito y su ruta es hoy un redirect a HOY.
  it('Protocolos ya no es una app del registro', () => {
    expect(APP_REGISTRY.some((a) => a.key === 'protocolos')).toBe(false);
    expect(APP_REGISTRY.some((a) => String(a.route).startsWith('/salud/intervenciones'))).toBe(false);
  });
});

describe('nivelAlcanza', () => {
  it('sin mínimo, abre para todos', () => {
    expect(nivelAlcanza('free', undefined, VENDIENDO)).toBe(true);
    expect(nivelAlcanza('premium', undefined, VENDIENDO)).toBe(true);
    expect(nivelAlcanza('elite', undefined, VENDIENDO)).toBe(true);
  });

  it('premium abre premium; elite abre premium y elite; free no abre nada cerrado', () => {
    expect(nivelAlcanza('free', 'premium', VENDIENDO)).toBe(false);
    expect(nivelAlcanza('free', 'elite', VENDIENDO)).toBe(false);
    expect(nivelAlcanza('premium', 'premium', VENDIENDO)).toBe(true);
    expect(nivelAlcanza('premium', 'elite', VENDIENDO)).toBe(false);
    expect(nivelAlcanza('elite', 'premium', VENDIENDO)).toBe(true);
    expect(nivelAlcanza('elite', 'elite', VENDIENDO)).toBe(true);
  });
});

describe('visibleApps con nivel', () => {
  it('con free, las 14 abiertas no están bloqueadas y las otras 21 sí', () => {
    const apps = visibleApps(true, 'free', false, VENDIENDO);
    expect(apps).toHaveLength(35);
    const libres = apps.filter((a) => !a.bloqueada).map((a) => a.key).sort();
    expect(libres).toEqual(ABIERTAS_FREE);
    expect(apps.filter((a) => a.bloqueada)).toHaveLength(21);
  });

  it('regla 15: con free nada desaparece, solo se marca', () => {
    expect(visibleApps(true, 'free', false, VENDIENDO).map((a) => a.key)).toEqual(APP_REGISTRY.map((a) => a.key));
  });

  it('con premium solo Genética queda bloqueada (a quien pagó no se le corta nada de lo premium)', () => {
    // 6-sep-2026: Genética es contenido Elite, no premium; premium sin
    // evaluación la ve con candado que abre la página Elite.
    const bloqueadas = visibleApps(true, 'premium', false, VENDIENDO).filter((a) => a.bloqueada).map((a) => a.key);
    expect(bloqueadas).toEqual(['genetica']);
  });

  it('con elite ninguna bloqueada', () => {
    expect(visibleApps(true, 'elite', false, VENDIENDO).some((a) => a.bloqueada)).toBe(false);
  });

  it('sin nivel se asume free (compatibilidad con los llamadores viejos)', () => {
    expect(visibleApps(true, undefined, undefined, VENDIENDO).filter((a) => a.bloqueada)).toHaveLength(21);
  });

  it('femaleOnly sigue funcionando en cualquier nivel', () => {
    for (const tier of ['free', 'premium', 'elite'] as const) {
      expect(visibleApps(false, tier, false, VENDIENDO).some((a) => a.key === 'ciclo'), tier).toBe(false);
      expect(visibleApps(true, tier, false, VENDIENDO).some((a) => a.key === 'ciclo'), tier).toBe(true);
      expect(visibleApps(true, tier, false, VENDIENDO).length - visibleApps(false, tier, false, VENDIENDO).length, tier).toBe(1);
    }
  });

  it('la evaluación Elite abre lo que exige elite (Genética) y Suplementos, no el resto de lo premium', () => {
    // 6-sep-2026 (ruta 3.4): Genética ya exige elite. Un free con evaluación
    // cargada (Pro vencido) la ve abierta; y Suplementos también, porque su
    // plan asignado se conserva en solo lectura (regla 1, pivote 2.1). Lo
    // demás premium sigue cerrado. 7-sep-2026: salió Protocolos (premium),
    // así que son 20 premium menos Suplementos = 19.
    const conEvaluacion = visibleApps(true, 'free', true, VENDIENDO);
    expect(conEvaluacion.filter((a) => a.bloqueada)).toHaveLength(19);
    expect(conEvaluacion.filter((a) => a.minTier === 'elite' && a.bloqueada)).toHaveLength(0);
    expect(conEvaluacion.find((a) => a.key === 'genetica')?.bloqueada).toBe(false);
    expect(conEvaluacion.find((a) => a.key === 'suplementos')?.bloqueada).toBe(false);
    // Sin evaluación, elite (el nivel) también la abre.
    expect(visibleApps(true, 'elite', false, VENDIENDO).find((a) => a.key === 'genetica')?.bloqueada).toBe(false);
  });

  it('ABIERTAS_CON_EVALUACION_ELITE: solo Suplementos, existe en el registro y sin evaluación sigue cerrada para free', () => {
    expect([...ABIERTAS_CON_EVALUACION_ELITE]).toEqual(['suplementos']);
    for (const key of ABIERTAS_CON_EVALUACION_ELITE) {
      expect(APP_REGISTRY.some((a) => a.key === key), key).toBe(true);
    }
    // La excepción es por EXISTENCIA de la evaluación: sin ella, Suplementos
    // sigue siendo Pro para un free (nada se regala por accidente).
    expect(visibleApps(true, 'free', false, VENDIENDO).find((a) => a.key === 'suplementos')?.bloqueada).toBe(true);
    expect(visibleApps(true, 'premium', false, VENDIENDO).find((a) => a.key === 'suplementos')?.bloqueada).toBe(false);
  });

  it('no muta el registro', () => {
    visibleApps(true, 'free', false, VENDIENDO);
    for (const a of APP_REGISTRY) expect(Object.keys(a), a.key).not.toContain('bloqueada');
  });
});

/**
 * 7-sep-2026: con la venta al público apagada, `premium` deja de cerrar y
 * `elite` sigue cerrando. Cada caso de aquí es un candado que se ABRE; ninguno
 * cierra algo que antes estaba abierto.
 */
describe('con la venta al público apagada', () => {
  it('premium deja de cerrar; elite sigue cerrando', () => {
    expect(nivelAlcanza('free', 'premium', NO_VENDIENDO)).toBe(true);
    expect(nivelAlcanza('free', 'elite', NO_VENDIENDO)).toBe(false);
    expect(nivelAlcanza('premium', 'elite', NO_VENDIENDO)).toBe(false);
    expect(nivelAlcanza('elite', 'elite', NO_VENDIENDO)).toBe(true);
  });

  it('a un free solo le queda bloqueada Genética, que es contenido Elite y no venta', () => {
    const bloqueadas = visibleApps(true, 'free', false, NO_VENDIENDO).filter((a) => a.bloqueada).map((a) => a.key);
    expect(bloqueadas).toEqual(['genetica']);
  });

  it('la evaluación Elite sigue abriendo Genética por existencia', () => {
    const conEvaluacion = visibleApps(true, 'free', true, NO_VENDIENDO);
    expect(conEvaluacion.filter((a) => a.bloqueada)).toHaveLength(0);
  });

  it('nadie pierde nada: quien ya tenía todo abierto lo sigue teniendo', () => {
    expect(visibleApps(true, 'elite', false, NO_VENDIENDO).some((a) => a.bloqueada)).toBe(false);
    const premium = visibleApps(true, 'premium', false, NO_VENDIENDO).filter((a) => a.bloqueada).map((a) => a.key);
    expect(premium).toEqual(['genetica']);
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
