import { describe, it, expect } from 'vitest';
import {
  avatarSpecForState,
  barCountForVariant,
  barDelay,
  clampAvatarSize,
} from '@/src/components/argos/argos-avatar-core';

describe('avatarSpecForState — parámetros por estado', () => {
  it('idle: respiro lento y sutil, sin barras', () => {
    const s = avatarSpecForState('idle');
    expect(s.bars).toBe(false);
    expect(s.scaleTo).toBeCloseTo(1.03, 2);
    expect(s.scaleDuration).toBeGreaterThan(1000); // lento
  });

  it('thinking: más rápido que idle y halo más marcado', () => {
    const idle = avatarSpecForState('idle');
    const thinking = avatarSpecForState('thinking');
    expect(thinking.scaleDuration).toBeLessThan(idle.scaleDuration);
    expect(thinking.glowMax).toBeGreaterThan(idle.glowMax);
    expect(thinking.bars).toBe(false);
  });

  it('speaking: activa las barras audio-like', () => {
    expect(avatarSpecForState('speaking').bars).toBe(true);
  });

  it('todos los estados producen un spec válido (glowMin < glowMax)', () => {
    (['idle', 'thinking', 'speaking'] as const).forEach((state) => {
      const s = avatarSpecForState(state);
      expect(s.glowMin).toBeLessThan(s.glowMax);
      expect(s.scaleTo).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('barCountForVariant', () => {
  it('compact → 3 barras, full → 5', () => {
    expect(barCountForVariant('compact')).toBe(3);
    expect(barCountForVariant('full')).toBe(5);
  });
});

describe('barDelay — escalonado determinista', () => {
  it('barra 0 no tiene retraso; retrasos crecen linealmente', () => {
    expect(barDelay(0)).toBe(0);
    expect(barDelay(1)).toBeGreaterThan(barDelay(0));
    expect(barDelay(2, 100)).toBe(200);
  });
});

describe('clampAvatarSize — respeta límites de layout', () => {
  it('mantiene tamaños válidos', () => {
    expect(clampAvatarSize(32)).toBe(32);
    expect(clampAvatarSize(120)).toBe(120);
  });
  it('recorta extremos', () => {
    expect(clampAvatarSize(5)).toBe(20);
    expect(clampAvatarSize(9999)).toBe(160);
  });
  it('valores no finitos caen a default 32', () => {
    expect(clampAvatarSize(NaN)).toBe(32);
    expect(clampAvatarSize(Infinity)).toBe(32);
  });
});
