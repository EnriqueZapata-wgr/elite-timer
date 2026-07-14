/**
 * nback-core — regla de progresión Brain Workshop + generador de estímulos (C.1).
 */
import { describe, expect, it } from 'vitest';
import {
  channelAccuracy,
  evaluateBlock,
  generateStimuli,
  nextStreak,
  stimuliCountFor,
  NBACK_CONFIG,
  NBACK_GRID_SIZE,
  NBACK_LETTERS,
  type NBackBlock,
} from '../nback-core';

/** mulberry32 — rng determinista para tests. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function block(overrides: Partial<NBackBlock>): NBackBlock {
  return {
    nLevel: 3,
    stimuliCount: 23,
    visualMatchesTotal: 6,
    audioMatchesTotal: 6,
    visualHits: 6,
    audioHits: 6,
    visualFalsePositives: 0,
    audioFalsePositives: 0,
    ...overrides,
  };
}

describe('channelAccuracy', () => {
  it('hit / (total + falsos)', () => {
    expect(channelAccuracy(6, 6, 0)).toBe(1);
    expect(channelAccuracy(6, 3, 0)).toBe(0.5);
    expect(channelAccuracy(6, 6, 2)).toBe(0.75);
  });

  it('sin matches ni falsos → 1 (no había nada que fallar)', () => {
    expect(channelAccuracy(0, 0, 0)).toBe(1);
  });

  it('sin matches pero con falsos → 0', () => {
    expect(channelAccuracy(0, 0, 3)).toBe(0);
  });

  it('clampea hits imposibles (> total)', () => {
    expect(channelAccuracy(6, 10, 0)).toBe(1);
  });
});

describe('evaluateBlock — regla Brain Workshop', () => {
  it('≥80% en AMBOS canales → promoted, nextN = N+1', () => {
    const r = evaluateBlock(block({ visualHits: 5, audioHits: 5 })); // 5/6 ≈ 0.83
    expect(r.promoted).toBe(true);
    expect(r.demoted).toBe(false);
    expect(r.nextN).toBe(4);
  });

  it('80% exacto en ambos promueve (umbral inclusivo)', () => {
    const r = evaluateBlock(block({
      visualMatchesTotal: 5, visualHits: 4,   // 0.8
      audioMatchesTotal: 5, audioHits: 4,     // 0.8
    }));
    expect(r.promoted).toBe(true);
    expect(r.nextN).toBe(4);
  });

  it('≥80% en un canal pero no en el otro → mantiene N', () => {
    const r = evaluateBlock(block({ visualHits: 6, audioHits: 4 })); // 1.0 y ~0.67
    expect(r.promoted).toBe(false);
    expect(r.demoted).toBe(false);
    expect(r.nextN).toBe(3);
  });

  it('<50% en cualquier canal → demoted, nextN = N−1', () => {
    const r = evaluateBlock(block({ visualHits: 2, audioHits: 6 })); // ~0.33 visual
    expect(r.demoted).toBe(true);
    expect(r.promoted).toBe(false);
    expect(r.nextN).toBe(2);
  });

  it('50% exacto NO baja (mantiene)', () => {
    const r = evaluateBlock(block({ visualHits: 3, audioHits: 3 })); // 0.5 y 0.5
    expect(r.demoted).toBe(false);
    expect(r.promoted).toBe(false);
    expect(r.nextN).toBe(3);
  });

  it('la demotion respeta el piso N_MIN=2 (decisión 1)', () => {
    const r = evaluateBlock(block({ nLevel: 2, visualHits: 0, audioHits: 0 }));
    expect(r.demoted).toBe(true);
    expect(r.nextN).toBe(NBACK_CONFIG.N_MIN);
  });

  it('los falsos positivos degradan la accuracy y pueden frenar la promoción', () => {
    const r = evaluateBlock(block({ visualHits: 6, visualFalsePositives: 2, audioHits: 6 }));
    expect(r.accuracyVisual).toBe(0.75);
    expect(r.promoted).toBe(false);
  });

  it('reporta misses derivados', () => {
    const r = evaluateBlock(block({ visualHits: 4, audioHits: 6 }));
    expect(r.visualMisses).toBe(2);
    expect(r.audioMisses).toBe(0);
  });
});

describe('generateStimuli', () => {
  const N = 2;
  const COUNT = stimuliCountFor(N); // 22

  it('largo correcto y estímulos válidos (grilla 3×3, letras del set)', () => {
    const s = generateStimuli(N, COUNT, { rng: seededRng(42) });
    expect(s.visual).toHaveLength(COUNT);
    expect(s.audio).toHaveLength(COUNT);
    for (const [row, col] of s.visual) {
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(NBACK_GRID_SIZE);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(NBACK_GRID_SIZE);
    }
    for (const letter of s.audio) {
      expect(NBACK_LETTERS).toContain(letter as any);
    }
  });

  it('exactamente TARGET_MATCHES_PER_CHANNEL matches por canal, todos en i ≥ N', () => {
    const s = generateStimuli(N, COUNT, { rng: seededRng(7) });
    expect(s.matchesVisual).toHaveLength(NBACK_CONFIG.TARGET_MATCHES_PER_CHANNEL);
    expect(s.matchesAudio).toHaveLength(NBACK_CONFIG.TARGET_MATCHES_PER_CHANNEL);
    for (const i of [...s.matchesVisual, ...s.matchesAudio]) {
      expect(i).toBeGreaterThanOrEqual(N);
      expect(i).toBeLessThan(COUNT);
    }
  });

  it('los índices de match declarados son verificables escaneando la secuencia — y NO hay accidentales', () => {
    for (const seed of [1, 99, 2026]) {
      const s = generateStimuli(N, COUNT, { rng: seededRng(seed) });
      const scanVisual: number[] = [];
      const scanAudio: number[] = [];
      for (let i = N; i < COUNT; i++) {
        if (s.visual[i][0] === s.visual[i - N][0] && s.visual[i][1] === s.visual[i - N][1]) scanVisual.push(i);
        if (s.audio[i] === s.audio[i - N]) scanAudio.push(i);
      }
      expect(scanVisual).toEqual(s.matchesVisual);
      expect(scanAudio).toEqual(s.matchesAudio);
    }
  });

  it('con rng seedeado es determinista', () => {
    const a = generateStimuli(3, stimuliCountFor(3), { rng: seededRng(5) });
    const b = generateStimuli(3, stimuliCountFor(3), { rng: seededRng(5) });
    expect(a).toEqual(b);
  });

  it('target de matches se recorta si no hay posiciones elegibles suficientes', () => {
    const s = generateStimuli(2, 4, { rng: seededRng(3) }); // solo 2 elegibles
    expect(s.matchesVisual.length).toBeLessThanOrEqual(2);
    expect(s.matchesAudio.length).toBeLessThanOrEqual(2);
  });
});

describe('nextStreak', () => {
  it('primera sesión → 1', () => {
    expect(nextStreak(null, '2026-07-13', 0)).toBe(1);
  });
  it('mismo día → sin cambio', () => {
    expect(nextStreak('2026-07-13', '2026-07-13', 4)).toBe(4);
  });
  it('día consecutivo → +1', () => {
    expect(nextStreak('2026-07-12', '2026-07-13', 4)).toBe(5);
  });
  it('hueco → reinicia en 1', () => {
    expect(nextStreak('2026-07-10', '2026-07-13', 9)).toBe(1);
  });
  it('cruza fin de mes correctamente', () => {
    expect(nextStreak('2026-06-30', '2026-07-01', 2)).toBe(3);
  });
});

describe('NBACK_CONFIG — defaults sancionados (megabuzón C.1)', () => {
  it('decisiones 1-5 del buzón', () => {
    expect(NBACK_CONFIG.N_MIN).toBe(2);                      // 1: N mínimo 2
    expect(NBACK_CONFIG.RESPONSE_TIMEOUT_MS).toBe(3000);     // 2: timeout 3s
    expect(NBACK_CONFIG.HEADPHONES_REQUIRED).toBe(true);     // 3: auriculares sí
    expect(NBACK_CONFIG.COLORBLIND_MODE_AVAILABLE).toBe(true); // 4: daltónico sí
    expect(NBACK_CONFIG.FREE_TIER_N_MAX).toBeNull();         // 5: free ilimitado
  });
  it('bloque estándar = 20 + N estímulos', () => {
    expect(stimuliCountFor(2)).toBe(22);
    expect(stimuliCountFor(5)).toBe(25);
  });
});
