import { describe, it, expect } from 'vitest';
import {
  AVATAR_STATES,
  avatarSpecForState,
  normalizeAvatarState,
  barCountForVariant,
  barDelay,
  clampAvatarSize,
  ringRadii,
  waveHeights,
  starPath,
  crossLines,
  rayLines,
  STATE_TRANSITION_MS,
} from '@/src/components/argos/argos-avatar-core';

describe('avatarSpecForState — 5 estados dramáticos (T1 MAGIA 2.0)', () => {
  it('cada estado tiene una FORMA distinta (distinguible a golpe de vista)', () => {
    const shapes = AVATAR_STATES.map((st) => avatarSpecForState(st).shape);
    expect(new Set(shapes).size).toBe(AVATAR_STATES.length);
  });

  it('cada estado animado tiene un COLOR distinto del offline (gris)', () => {
    const offline = avatarSpecForState('offline');
    (['idle', 'thinking', 'speaking', 'unavailable'] as const).forEach((st) => {
      expect(avatarSpecForState(st).color).not.toBe(offline.color);
    });
  });

  it('offline: bullseye gris ESTÁTICO (sin animación, halo fijo)', () => {
    const s = avatarSpecForState('offline');
    expect(s.shape).toBe('bullseye');
    expect(s.animated).toBe(false);
    expect(s.glowMin).toBe(s.glowMax);
  });

  it('idle: anillos lima respirando', () => {
    const s = avatarSpecForState('idle');
    expect(s.shape).toBe('rings');
    expect(s.animated).toBe(true);
    expect(s.color.toLowerCase()).toBe('#a8e02a');
  });

  it('thinking: olas azules, más rápidas que idle', () => {
    const s = avatarSpecForState('thinking');
    expect(s.shape).toBe('waves');
    expect(s.color).toBe('#5B9BD5');
    expect(s.cycleMs).toBeLessThan(avatarSpecForState('idle').cycleMs);
  });

  it('speaking: estrella lima brillante con el glow más intenso de todos', () => {
    const s = avatarSpecForState('speaking');
    expect(s.shape).toBe('star');
    AVATAR_STATES.filter((st) => st !== 'speaking').forEach((st) => {
      expect(s.glowMax).toBeGreaterThan(avatarSpecForState(st).glowMax);
    });
  });

  it('unavailable: tache X rojo', () => {
    const s = avatarSpecForState('unavailable');
    expect(s.shape).toBe('cross');
    expect(s.color).toBe('#fb7185');
  });

  it('todos los specs son válidos (glowMin <= glowMax, cycleMs >= 0)', () => {
    AVATAR_STATES.forEach((st) => {
      const s = avatarSpecForState(st);
      expect(s.glowMin).toBeLessThanOrEqual(s.glowMax);
      expect(s.cycleMs).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('normalizeAvatarState — coerción defensiva', () => {
  it('estados válidos pasan intactos', () => {
    AVATAR_STATES.forEach((st) => expect(normalizeAvatarState(st)).toBe(st));
  });
  it('valores desconocidos caen a idle', () => {
    expect(normalizeAvatarState('bogus')).toBe('idle');
    expect(normalizeAvatarState(undefined)).toBe('idle');
    expect(normalizeAvatarState(null)).toBe('idle');
    expect(normalizeAvatarState(42)).toBe('idle');
  });
});

describe('transición entre estados', () => {
  it('crossfade dentro del rango spec (200-400ms)', () => {
    expect(STATE_TRANSITION_MS).toBeGreaterThanOrEqual(200);
    expect(STATE_TRANSITION_MS).toBeLessThanOrEqual(400);
  });
});

describe('ringRadii — proporción áurea', () => {
  it('devuelve `count` radios decrecientes', () => {
    const radii = ringRadii(100, 3);
    expect(radii).toHaveLength(3);
    expect(radii[0]).toBe(100);
    expect(radii[1]).toBeLessThan(radii[0]);
    expect(radii[2]).toBeLessThan(radii[1]);
  });
  it('cada radio es el anterior / φ (~1.618)', () => {
    const [a, b, c] = ringRadii(100, 3);
    expect(a / b).toBeCloseTo(1.618, 2);
    expect(b / c).toBeCloseTo(1.618, 2);
  });
});

describe('waveHeights — ola senoidal determinista', () => {
  it('todas las alturas dentro de [min, max]', () => {
    const hs = waveHeights(1.3, 7, 0.3, 1);
    expect(hs).toHaveLength(7);
    hs.forEach((h) => {
      expect(h).toBeGreaterThanOrEqual(0.3);
      expect(h).toBeLessThanOrEqual(1);
    });
  });
  it('la fase mueve la ola (no es estática)', () => {
    const a = waveHeights(0, 5);
    const b = waveHeights(Math.PI / 2, 5);
    expect(a).not.toEqual(b);
  });
  it('es determinista para la misma fase', () => {
    expect(waveHeights(2.1, 5)).toEqual(waveHeights(2.1, 5));
  });
});

describe('starPath — estrella SVG', () => {
  it('5 puntas → 10 vértices + cierre Z', () => {
    const p = starPath(50, 50, 30, 14, 5);
    expect(p.startsWith('M')).toBe(true);
    expect(p.endsWith('Z')).toBe(true);
    expect(p.match(/L/g)).toHaveLength(9); // 10 vértices: 1 M + 9 L
  });
  it('la punta superior está en (cx, cy - outerR)', () => {
    const p = starPath(50, 50, 30, 14, 5);
    expect(p.startsWith('M50,20')).toBe(true);
  });
});

describe('crossLines — tache X', () => {
  it('dos diagonales simétricas dentro del radio', () => {
    const [l1, l2] = crossLines(50, 50, 20);
    // Diagonal 1: ↘  Diagonal 2: ↗
    expect(l1.x1).toBeLessThan(l1.x2);
    expect(l1.y1).toBeLessThan(l1.y2);
    expect(l2.y1).toBeGreaterThan(l2.y2);
    // Ambas del mismo largo (simetría)
    const len = (l: typeof l1) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
    expect(len(l1)).toBeCloseTo(len(l2), 5);
  });
});

describe('rayLines — rayos radiales de speaking', () => {
  it('genera `count` rayos que van de innerR a outerR', () => {
    const rays = rayLines(50, 50, 20, 30, 8);
    expect(rays).toHaveLength(8);
    rays.forEach((r) => {
      const dInner = Math.hypot(r.x1 - 50, r.y1 - 50);
      const dOuter = Math.hypot(r.x2 - 50, r.y2 - 50);
      expect(dInner).toBeCloseTo(20, 1);
      expect(dOuter).toBeCloseTo(30, 1);
    });
  });
  it('el primer rayo apunta hacia arriba', () => {
    const [first] = rayLines(50, 50, 20, 30, 8);
    expect(first.x1).toBeCloseTo(50, 1);
    expect(first.y1).toBeCloseTo(30, 1);
  });
});

describe('barCountForVariant / barDelay', () => {
  it('compact → 5 barras, full → 7 (impar = ola simétrica)', () => {
    expect(barCountForVariant('compact')).toBe(5);
    expect(barCountForVariant('full')).toBe(7);
  });
  it('delays escalonados deterministas', () => {
    expect(barDelay(0)).toBe(0);
    expect(barDelay(3, 100)).toBe(300);
    expect(barDelay(2)).toBeGreaterThan(barDelay(1));
  });
});

describe('clampAvatarSize', () => {
  it('mantiene tamaños válidos y recorta extremos', () => {
    expect(clampAvatarSize(40)).toBe(40);
    expect(clampAvatarSize(140)).toBe(140);
    expect(clampAvatarSize(5)).toBe(20);
    expect(clampAvatarSize(9999)).toBe(200);
  });
  it('no finitos caen al default 40', () => {
    expect(clampAvatarSize(NaN)).toBe(40);
    expect(clampAvatarSize(Infinity)).toBe(40);
  });
});
