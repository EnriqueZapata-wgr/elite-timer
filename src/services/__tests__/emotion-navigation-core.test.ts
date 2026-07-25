/**
 * Tests de la navegación emocional (MB-4 · Bloque 2).
 */
import { describe, it, expect } from 'vitest';
import {
  buildDescentChain, buildFlipChain, buildNavigationPlan, pickFramingPhrase,
  strategyForEmotion, toolsForBajar, toolsForVoltear, isCrisisOrigin,
} from '../emotion-navigation-core';
import { FRAMING_PHRASES, TOOL_CRISIS, TOOL_EVIDENCIA } from '../../data/emotion-navigation';
import { EMOTIONS } from '../../data/emotions-library';

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

describe('plan por cuadrante (flujo §4 decidido por Enrique)', () => {
  it('alta·desagradable → DOS movimientos: bajar y luego voltear', () => {
    const plan = buildNavigationPlan('angry')!;
    expect(plan.crisis).toBe(false);
    expect(plan.moves.map((m) => m.move)).toEqual(['bajar', 'voltear']);
    // El volteo parte de donde terminó el descenso.
    const descentEnd = plan.moves[0].chainIds[plan.moves[0].chainIds.length - 1];
    expect(plan.moves[1].chainIds[0]).toBe(descentEnd);
  });

  it('baja·desagradable → SOLO voltear (subirla a la fuerza sería empujar)', () => {
    const plan = buildNavigationPlan('sad')!;
    expect(plan.moves.map((m) => m.move)).toEqual(['voltear']);
  });

  it('alta·agradable → canalizar, sin cadena de arreglo', () => {
    const plan = buildNavigationPlan('motivated')!;
    expect(plan.moves.map((m) => m.move)).toEqual(['canalizar']);
    expect(plan.moves[0].chainIds).toEqual(['motivated']);
  });

  it('baja·agradable → saborear: destino legítimo', () => {
    const plan = buildNavigationPlan('calm')!;
    expect(plan.moves.map((m) => m.move)).toEqual(['saborear']);
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
  it('bajar siempre arranca con el suspiro fisiológico (la vía más rápida)', () => {
    const tools = toolsForBajar('angry');
    expect(tools[0].id).toBe('suspiro');
    expect(tools.length).toBeLessThanOrEqual(4);
  });

  it('ansiedad recibe su pieza específica; enojo la suya', () => {
    expect(toolsForBajar('anxious').some((t) => t.id === 'ansiedad')).toBe(true);
    expect(toolsForBajar('angry').some((t) => t.id === 'descarga')).toBe(true);
  });

  it('voltear rutea por estrategia: culpa → autocompasión, frustración → proceso, desánimo → agencia', () => {
    expect(strategyForEmotion('guilty')).toBe('autocompasion');
    expect(strategyForEmotion('frustrated')).toBe('proceso');
    expect(strategyForEmotion('hopeless')).toBe('agencia');
    expect(strategyForEmotion('worried')).toBe('presencia');
    expect(strategyForEmotion('resentful')).toBe('aceptacion');
    expect(strategyForEmotion('nostalgic_pos')).toBe('distanciamiento'); // fallback
  });

  it('ARGOS (tu evidencia) cierra la lista de voltear', () => {
    const tools = toolsForVoltear('sad');
    expect(tools[tools.length - 1]).toEqual(TOOL_EVIDENCIA);
  });

  it('fundido de verdad → recuperación antes que reframing', () => {
    const tools = toolsForVoltear('burned_out');
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
