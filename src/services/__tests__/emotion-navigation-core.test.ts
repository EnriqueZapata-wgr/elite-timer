/**
 * Tests de la navegación emocional (MB-4 · Bloque 2).
 */
import { describe, it, expect } from 'vitest';
import {
  buildDescentChain, buildFlipChain, buildNavigationPlan, pickFramingPhrase,
  strategyForEmotion, toolsForBajar, toolsForCruzar, isCrisisOrigin,
  reframeTwin, buildReframeChain, SINGLE_EXIT_INTENSITY,
} from '../emotion-navigation-core';
import { FRAMING_PHRASES, TOOL_CRISIS, TOOL_EVIDENCIA } from '../../data/emotion-navigation';
import { EMOTIONS, NO_DESCENT_TARGET_IDS } from '../../data/emotions-library';

const byId = new Map(EMOTIONS.map((e) => [e.id, e]));

describe('cadena de descenso (↓ bajar energía)', () => {
  it('furia desciende por versiones más manejables, sin cambiar de lado', () => {
    const chain = buildDescentChain('enraged');
    expect(chain[0].id).toBe('enraged');
    expect(chain.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].energy).toBeLessThan(chain[i - 1].energy);
      expect(chain[i].intensity).toBeLessThanOrEqual(chain[i - 1].intensity - 1);
      expect(['high_unpleasant', 'low_unpleasant']).toContain(chain[i].quadrant);
    }
  });

  it('es determinista', () => {
    expect(buildDescentChain('anxious')).toEqual(buildDescentChain('anxious'));
  });

  it('con id inexistente devuelve vacío', () => {
    expect(buildDescentChain('nope')).toEqual([]);
  });
});

describe('cadena de volteo (→ mover valencia)', () => {
  it('cruza al lado agradable con energía similar', () => {
    const chain = buildFlipChain('frustrated');
    expect(chain[0].id).toBe('frustrated');
    expect(chain.length).toBeGreaterThanOrEqual(2);
    const bridge = chain[1];
    expect(['high_pleasant', 'low_pleasant']).toContain(bridge.quadrant);
    expect(Math.abs(bridge.energy - byId.get('frustrated')!.energy)).toBeLessThanOrEqual(2);
  });

  it('desde emoción agradable no inventa un volteo', () => {
    const chain = buildFlipChain('happy');
    expect(chain).toHaveLength(1);
  });

  it('triste voltea hacia algo alcanzable en energía (no lo empuja a euforia)', () => {
    const chain = buildFlipChain('sad');
    const bridge = chain[1];
    expect(bridge.energy).toBeLessThanOrEqual(5.5); // sad tiene energy 3
  });
});

describe('plan con disponibilidad condicional (MB-9 · Track B · análisis v2)', () => {
  it('ira DENTRO de la ventana → bajar y luego CRUZAR (cruzar solo tras el descenso)', () => {
    // impatient: intensidad 4 (< umbral), con descenso real dentro de ira.
    const plan = buildNavigationPlan('impatient')!;
    expect(plan.crisis).toBe(false);
    expect(plan.moves.map((m) => m.move)).toEqual(['bajar', 'cruzar']);
    // Cruzar parte de donde terminó el descenso — ya dentro de la ventana.
    const descentEnd = plan.moves[0].chainIds[plan.moves[0].chainIds.length - 1];
    expect(plan.moves[1].chainIds[0]).toBe(descentEnd);
  });

  it('energía re-leíble dentro de la ventana (nervios) → REENCUADRAR disponible', () => {
    // nervous: intensidad 5 (< umbral), familia miedo → gemelo en energía.
    const plan = buildNavigationPlan('nervous')!;
    expect(plan.moves.map((m) => m.move)).toContain('reencuadrar');
    const reframe = plan.moves.find((m) => m.move === 'reencuadrar')!;
    expect(reframe.chainIds[0]).toBe('nervous');
    expect(reframe.chainIds).toHaveLength(2);
  });

  it('TRACK C (MB-10) · fuera de la ventana: intensidad ≥ umbral → UNA salida, y es bajar', () => {
    // Barrido completo: toda alta·desagradable intensa ofrece SOLO la salida
    // del cuerpo. Nada de reencuadrar ni cruzar: sería prepararla para fallar.
    const outOfWindow = EMOTIONS.filter(
      (e) => e.quadrant === 'high_unpleasant' && e.intensity >= SINGLE_EXIT_INTENSITY && !isCrisisOrigin(e.id),
    );
    expect(outOfWindow.length).toBeGreaterThan(10);
    for (const e of outOfWindow) {
      const plan = buildNavigationPlan(e.id)!;
      expect(plan.moves.map((m) => m.move), e.id).toEqual(['bajar']);
      expect(plan.moves[0].tools.length, e.id).toBeGreaterThan(0);
    }
  });

  it('el umbral es una constante editable (calibración clínica pendiente de Mariana)', () => {
    expect(SINGLE_EXIT_INTENSITY).toBe(6);
  });

  it('baja·desagradable → SOLO cruzar (subirla a la fuerza sería empujar)', () => {
    const plan = buildNavigationPlan('sad')!;
    expect(plan.moves.map((m) => m.move)).toEqual(['cruzar']);
  });

  it('alta·agradable → canalizar, sin cadena de arreglo', () => {
    const plan = buildNavigationPlan('motivated')!;
    expect(plan.moves.map((m) => m.move)).toEqual(['canalizar']);
    expect(plan.moves[0].chainIds).toEqual(['motivated']);
  });

  it('baja·agradable → SUBIR (la mitad olvidada) y saborear (destino legítimo)', () => {
    const plan = buildNavigationPlan('calm')!;
    expect(plan.moves.map((m) => m.move)).toEqual(['subir', 'saborear']);
  });

  it('prohibición dura: subir NUNCA se ofrece desde el lado desagradable', () => {
    const unpleasant = EMOTIONS.filter((e) => e.quadrant === 'high_unpleasant' || e.quadrant === 'low_unpleasant');
    for (const e of unpleasant) {
      const plan = buildNavigationPlan(e.id)!;
      for (const m of plan.moves) {
        expect(m.move, `${e.id} → ${m.move}`).not.toBe('subir');
      }
    }
  });

  it('reencuadre: la ansiedad tiene gemelo agradable de casi la misma activación', () => {
    const twin = reframeTwin('anxious')!;
    expect(twin).toBeTruthy();
    expect(twin.quadrant).toBe('high_pleasant');
    expect(twin.family).toBe('energia');
    expect(Math.abs(twin.energy - byId.get('anxious')!.energy)).toBeLessThanOrEqual(3);
    // La ira NO se relee como entusiasmo: la furia no tiene gemelo.
    expect(reframeTwin('enraged')).toBeNull();
    expect(buildReframeChain('enraged')).toHaveLength(1); // solo el origen
  });

  it('crisis ROMPE el flujo: acompañamiento, no reframing', () => {
    expect(isCrisisOrigin('panicked')).toBe(true);
    const plan = buildNavigationPlan('panicked')!;
    expect(plan.crisis).toBe(true);
    expect(plan.moves).toHaveLength(0);
    expect(plan.crisisTool).toEqual(TOOL_CRISIS);
  });

  it('id inexistente → null', () => {
    expect(buildNavigationPlan('nope')).toBeNull();
  });
});

describe('herramientas por movimiento (spec §2)', () => {
  it('Track F · la respiración de arranque depende de la intensidad', () => {
    // Intensidad extrema (enojo i8) → suspiro fisiológico: la vía más rápida.
    const extreme = toolsForBajar('angry');
    expect(extreme[0].id).toBe('suspiro');
    expect(extreme.length).toBeLessThanOrEqual(4);
    // Intensidad moderada (estrés i6) → 4-7-8: la lenta, sostenida.
    const moderate = toolsForBajar('stressed');
    expect(moderate[0].id).toBe('resp478');
    // Ambas rutas llevan a una sesión REAL de respiración del pilar Mente.
    for (const t of [...extreme, ...moderate].filter((x) => x.id === 'suspiro' || x.id === 'resp478')) {
      expect(t.route.pathname).toBe('/breathing');
      expect(t.route.params?.breathingId).toBeTruthy();
    }
  });

  it('ansiedad recibe su pieza específica; enojo la suya', () => {
    expect(toolsForBajar('anxious').some((t) => t.id === 'ansiedad')).toBe(true);
    expect(toolsForBajar('angry').some((t) => t.id === 'descarga')).toBe(true);
  });

  it('cruzar rutea por estrategia: culpa → autocompasión, frustración → proceso, desánimo → agencia', () => {
    expect(strategyForEmotion('guilty')).toBe('autocompasion');
    expect(strategyForEmotion('frustrated')).toBe('proceso');
    expect(strategyForEmotion('hopeless')).toBe('agencia');
    expect(strategyForEmotion('worried')).toBe('presencia');
    expect(strategyForEmotion('resentful')).toBe('aceptacion');
    expect(strategyForEmotion('nostalgic_pos')).toBe('distanciamiento'); // fallback
  });

  it('ARGOS (tu evidencia) cierra la lista de cruzar', () => {
    const tools = toolsForCruzar('sad');
    expect(tools[tools.length - 1]).toEqual(TOOL_EVIDENCIA);
  });

  it('fundido de verdad → recuperación antes que reframing', () => {
    const tools = toolsForCruzar('burned_out');
    expect(tools.some((t) => t.id === 'nsdr')).toBe(true);
  });

  it('la pieza de pánico NUNCA aparece fuera de crisis', () => {
    for (const e of EMOTIONS) {
      if (isCrisisOrigin(e.id)) continue;
      const plan = buildNavigationPlan(e.id)!;
      for (const m of plan.moves) {
        expect(m.tools.some((t) => t.id === TOOL_CRISIS.id), e.id).toBe(false);
      }
    }
  });
});

describe('frase que encuadra', () => {
  it('rotación determinista por fecha; siempre del set', () => {
    const a = pickFramingPhrase('2026-07-25');
    expect(a).toBe(pickFramingPhrase('2026-07-25'));
    expect(FRAMING_PHRASES).toContain(a);
    // Fechas distintas pueden dar frases distintas (no siempre, pero el set rota).
    const set = new Set(
      ['2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29'].map(pickFramingPhrase),
    );
    expect(set.size).toBeGreaterThan(1);
  });
});

describe('MB-4.1 · Bloque A — las cadenas ya no navegan a la zona depresiva', () => {
  it('el tagging de familia cubre las 144 y la lista de exclusión existe', () => {
    for (const e of EMOTIONS) {
      expect(e.family, e.id).toBeTruthy();
    }
    for (const id of NO_DESCENT_TARGET_IDS) {
      expect(EMOTIONS.some((e) => e.id === id), id).toBe(true);
    }
  });

  it('NINGUNA cadena de descenso (barriendo las 144) toca la lista de exclusión', () => {
    for (const e of EMOTIONS) {
      for (const step of buildDescentChain(e.id).slice(1)) {
        expect(NO_DESCENT_TARGET_IDS.has(step.id), `${e.id} → ${step.id}`).toBe(false);
      }
    }
  });

  it('NINGUNA cadena de descenso cambia de familia', () => {
    for (const e of EMOTIONS) {
      for (const step of buildDescentChain(e.id)) {
        expect(step.family, `${e.id} → ${step.id}`).toBe(e.family);
      }
    }
  });

  it('todo destino de volteo es del lado agradable Y de una única familia compatible', () => {
    const unpleasant = EMOTIONS.filter((e) => e.quadrant === 'high_unpleasant' || e.quadrant === 'low_unpleasant');
    for (const e of unpleasant) {
      const targets = buildFlipChain(e.id).slice(1); // sin el origen
      expect(targets.length, e.id).toBeGreaterThan(0);
      const fams = new Set(targets.map((t) => t.family));
      expect(fams.size, `${e.id}: ${[...fams].join(',')}`).toBe(1);
      for (const t of targets) {
        expect(['high_pleasant', 'low_pleasant'], `${e.id} → ${t.id}`).toContain(t.quadrant);
      }
    }
  });

  it('caso guía: enojo NUNCA cruza a miedo; furia se queda en la familia ira', () => {
    for (const step of buildDescentChain('angry')) {
      expect(step.family).toBe('ira');
      expect(['afraid', 'terrified', 'anxious', 'nervous', 'panicked'], step.id).not.toContain(step.id);
    }
    const enraged = buildDescentChain('enraged');
    expect(enraged.every((s) => s.family === 'ira')).toBe(true);
    expect(enraged.length).toBeGreaterThan(1); // furia sí tiene a dónde bajar
  });

  it('sin descenso posible → cruce directo (no se fuerza un camino que el copy promete)', () => {
    // "Con fastidio" (annoyed) ya es la ira más suave: no hay a dónde bajar, y la
    // ira no es re-leíble → cruzar directo (no reencuadrar).
    expect(buildDescentChain('annoyed')).toHaveLength(1);
    expect(buildNavigationPlan('annoyed')!.moves.map((m) => m.move)).toEqual(['cruzar']);
    // "Con enojo" (intensidad 8, fuera de ventana · Track C) → SOLO bajar.
    expect(buildNavigationPlan('angry')!.moves.map((m) => m.move)).toEqual(['bajar']);
  });
});

describe('cadenas completas para todo el catálogo (ninguna emoción rompe)', () => {
  it('todo plan de las 144 emociones es construible y con herramientas', () => {
    for (const e of EMOTIONS) {
      const plan = buildNavigationPlan(e.id)!;
      expect(plan).not.toBeNull();
      if (!plan.crisis) {
        expect(plan.moves.length).toBeGreaterThan(0);
        for (const m of plan.moves) {
          expect(m.chainIds.length).toBeGreaterThan(0);
          expect(m.tools.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
