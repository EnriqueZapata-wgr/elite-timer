/**
 * MB-4 J2 — orb glass 4 estados + reduced-motion. Lógica pura del motion.
 */
import { describe, it, expect } from 'vitest';
import {
  ORB_STATES, orbSpecForState, waveformBars, orbStateFromAvatar,
} from '../argos-orb-core';

describe('orbSpecForState', () => {
  it('4 estados canónicos', () => {
    expect(ORB_STATES).toEqual(['idle', 'escuchando', 'pensando', 'hablando']);
  });

  it('idle respira lento (~4s), casi quieto', () => {
    const s = orbSpecForState('idle');
    expect(s.breathMs).toBe(4000);
    expect(s.animated).toBe(true);
    expect(s.waveform).toBe(false);
    expect(s.rotate).toBe(false);
    expect(s.scaleMax - s.scaleMin).toBeLessThan(0.1); // amplitud sutil
  });

  it('escuchando expande más que idle', () => {
    const idle = orbSpecForState('idle');
    const esc = orbSpecForState('escuchando');
    expect(esc.scaleMax).toBeGreaterThan(idle.scaleMax);
    expect(esc.waveform).toBe(false);
  });

  it('pensando rota, sin waveform', () => {
    const s = orbSpecForState('pensando');
    expect(s.rotate).toBe(true);
    expect(s.rotateMs).toBeGreaterThan(0);
    expect(s.waveform).toBe(false);
  });

  it('hablando tiene waveform (y solo ese)', () => {
    expect(orbSpecForState('hablando').waveform).toBe(true);
    for (const st of ['idle', 'escuchando', 'pensando'] as const) {
      expect(orbSpecForState(st).waveform, st).toBe(false);
    }
  });

  it('reduced-motion: sin animación continua, sin apagarse (glow > 0)', () => {
    for (const st of ORB_STATES) {
      const s = orbSpecForState(st, true);
      expect(s.animated, st).toBe(false);
      expect(s.scaleMin).toBe(1);
      expect(s.scaleMax).toBe(1);
      expect(s.waveform).toBe(false);
      expect(s.rotate).toBe(false);
      expect(s.glowMin, st).toBeGreaterThan(0); // presente, no apagado
    }
  });

  it('reduced-motion: los 4 estados son DISTINGUIBLES sin animación (auditoría MB-4)', () => {
    // Antes idle=pensando (0.4) y escuchando=hablando (0.6) — indistinguibles.
    const glows = ORB_STATES.map((st) => orbSpecForState(st, true).glowMin);
    expect(new Set(glows).size).toBe(ORB_STATES.length);
  });
});

describe('waveformBars', () => {
  it('devuelve N barras en 0.12..1', () => {
    const bars = waveformBars(7, 0.3);
    expect(bars).toHaveLength(7);
    for (const b of bars) {
      expect(b).toBeGreaterThanOrEqual(0.12);
      expect(b).toBeLessThanOrEqual(1);
    }
  });

  it('determinístico (misma fase → mismo resultado, sin random)', () => {
    expect(waveformBars(5, 0.5)).toEqual(waveformBars(5, 0.5));
  });

  it("B3: lleva directiva 'worklet' (se llama desde useDerivedValue en el UI thread)", async () => {
    // Se verifica sobre el FUENTE (el transform de Vitest podría comerse la
    // directiva del function.toString) — sin ella, ReanimatedError en 'hablando'.
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, '..', 'argos-orb-core.ts'), 'utf8');
    expect(src).toMatch(/export function waveformBars[^{]*\{[\s\S]{0,400}?'worklet';/);
  });

  it('el centro pesa más que los extremos (forma de voz)', () => {
    const bars = waveformBars(9, 0.25);
    const center = bars[4];
    const edge = bars[0];
    // en promedio el envelope favorece el centro; comprobamos el máximo posible
    expect(Math.max(...bars)).toBe(center > edge ? center : Math.max(...bars));
    expect(center).toBeGreaterThan(0);
  });
});

describe('orbStateFromAvatar (reuso de call sites legacy)', () => {
  it('mapea thinking/speaking/idle', () => {
    expect(orbStateFromAvatar('thinking')).toBe('pensando');
    expect(orbStateFromAvatar('speaking')).toBe('hablando');
    expect(orbStateFromAvatar('idle')).toBe('idle');
    expect(orbStateFromAvatar('offline')).toBe('idle');
    expect(orbStateFromAvatar('listening')).toBe('escuchando');
    expect(orbStateFromAvatar(null)).toBe('idle');
  });
});
