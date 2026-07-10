/**
 * Celebración de fin de onboarding — core puro (Sprint ONBOARDING épico T5).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  celebrationTitle,
  celebrationTotalMs,
  celebrationParticles,
  queueOnboardingCelebration,
  consumeOnboardingCelebration,
  peekOnboardingCelebration,
  CELEBRATION_PARTICLE_COUNT,
  CELEBRATION_SUBTITLE,
} from '../onboarding-completion-core';

beforeEach(() => {
  consumeOnboardingCelebration(); // limpia la cola entre tests
});

describe('celebración · cola one-shot', () => {
  it('queue → consume devuelve el nombre y limpia', () => {
    queueOnboardingCelebration('Enrique');
    expect(peekOnboardingCelebration()).toBe('Enrique');
    expect(consumeOnboardingCelebration()).toBe('Enrique');
    expect(consumeOnboardingCelebration()).toBeNull();
  });

  it('sin queue, consume devuelve null (fail-quiet)', () => {
    expect(consumeOnboardingCelebration()).toBeNull();
  });

  it('nombre vacío también se encola (el overlay degrada el título)', () => {
    queueOnboardingCelebration('');
    expect(consumeOnboardingCelebration()).toBe('');
  });
});

describe('celebración · copy', () => {
  it('interpola el nombre del brief: "Bienvenido, {nombre}. Aquí empieza."', () => {
    expect(celebrationTitle('Enrique')).toBe('Bienvenido, Enrique.');
    expect(CELEBRATION_SUBTITLE).toBe('Aquí empieza.');
  });

  it('degrada sin nombre (sin coma huérfana)', () => {
    expect(celebrationTitle('')).toBe('Bienvenido.');
    expect(celebrationTitle('   ')).toBe('Bienvenido.');
  });
});

describe('celebración · timing y partículas', () => {
  it('el momento dura ~2s (fade out incluido), nunca más de 3', () => {
    expect(celebrationTotalMs()).toBeGreaterThanOrEqual(1800);
    expect(celebrationTotalMs()).toBeLessThanOrEqual(3000);
  });

  it('las partículas son deterministas (misma escena siempre)', () => {
    expect(celebrationParticles()).toEqual(celebrationParticles());
    expect(celebrationParticles()).toHaveLength(CELEBRATION_PARTICLE_COUNT);
  });

  it('specs dentro de rangos suaves (editorial, no confetti cumpleañero)', () => {
    for (const p of celebrationParticles()) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.size).toBeGreaterThanOrEqual(4);
      expect(p.size).toBeLessThanOrEqual(9);
      expect(p.peakOpacity).toBeGreaterThan(0);
      expect(p.peakOpacity).toBeLessThanOrEqual(0.7); // nunca a tope
      // El ascenso termina dentro de la vida del overlay.
      expect(p.delayMs + p.riseMs).toBeLessThanOrEqual(celebrationTotalMs());
    }
  });
});
