/**
 * Tests del perfil emocional (MB-4 · Bloque 5).
 * Contrato central: foto del periodo, no etiqueta fija.
 */
import { describe, it, expect } from 'vitest';
import {
  computeEmotionProfile, buildShareText, momentOfDay,
  MIN_CHECKINS_FOR_PROFILE, ARCHETYPES, DOMINANCE_PCT,
} from '../emotion-profile-core';
import type { HistoryCheckin } from '../emotion-history-core';

const ci = (
  date: string, quadrant: string, emotions: string[] = ['happy'], pleasantness = 7,
): HistoryCheckin => ({ emotions, quadrant, pleasantness, created_at: date });

describe('umbral mínimo', () => {
  it('con pocos registros NO arma perfil y dice qué falta', () => {
    const p = computeEmotionProfile([ci('2026-07-01T10:00:00', 'high_pleasant')]);
    expect(p.status).toBe('insufficient');
    expect(p.have).toBe(1);
    expect(p.needed).toBe(MIN_CHECKINS_FOR_PROFILE);
    expect(p.archetype).toBeNull();
  });
});

describe('arquetipo por mezcla dominante', () => {
  it('cuadrante dominante (45%+) define el arquetipo', () => {
    const checkins: HistoryCheckin[] = [];
    for (let i = 1; i <= 8; i++) checkins.push(ci(`2026-07-0${Math.min(i, 9)}T10:00:00`, 'high_pleasant', ['motivated'], 8));
    for (let i = 1; i <= 4; i++) checkins.push(ci(`2026-07-1${i}T10:00:00`, 'low_unpleasant', ['tired'], 3));
    const p = computeEmotionProfile(checkins);
    expect(p.status).toBe('ready');
    expect(p.archetype?.key).toBe('high_pleasant');
    expect(p.quadrantMix[0].quadrant).toBe('high_pleasant');
    expect(p.quadrantMix[0].pct).toBeGreaterThanOrEqual(DOMINANCE_PCT);
  });

  it('sin dominante claro → Espectro completo (mixto no es defecto)', () => {
    const checkins: HistoryCheckin[] = [];
    const quads = ['high_pleasant', 'high_unpleasant', 'low_pleasant', 'low_unpleasant'];
    for (let i = 0; i < 12; i++) {
      checkins.push(ci(`2026-07-${String(i + 1).padStart(2, '0')}T10:00:00`, quads[i % 4]));
    }
    const p = computeEmotionProfile(checkins);
    expect(p.archetype?.key).toBe('mixed');
  });

  it('ningún arquetipo dice "eres" — describen el periodo', () => {
    for (const a of Object.values(ARCHETYPES)) {
      expect(a.tagline.toLowerCase()).not.toContain('eres');
      expect(a.tagline.toLowerCase()).not.toContain('tu personalidad');
    }
  });
});

describe('variabilidad y mejor momento', () => {
  it('ánimo parejo → estable; con vaivenes fuertes → oscilante', () => {
    const flat: HistoryCheckin[] = [];
    for (let i = 1; i <= 12; i++) {
      flat.push(ci(`2026-07-${String(i).padStart(2, '0')}T10:00:00`, 'low_pleasant', ['calm'], 7));
    }
    expect(computeEmotionProfile(flat).variability).toBe('estable');

    const swings: HistoryCheckin[] = [];
    for (let i = 1; i <= 12; i++) {
      swings.push(ci(
        `2026-07-${String(i).padStart(2, '0')}T10:00:00`,
        i % 2 ? 'high_pleasant' : 'low_unpleasant',
        ['happy'],
        i % 2 ? 9 : 2,
      ));
    }
    expect(computeEmotionProfile(swings).variability).toBe('oscilante');
  });

  it('mejor momento solo con señal suficiente en 2+ franjas', () => {
    const checkins: HistoryCheckin[] = [];
    for (let i = 1; i <= 6; i++) {
      checkins.push(ci(`2026-07-${String(i).padStart(2, '0')}T08:00:00`, 'high_pleasant', ['happy'], 8));
      checkins.push(ci(`2026-07-${String(i).padStart(2, '0')}T21:00:00`, 'low_unpleasant', ['tired'], 3));
    }
    const p = computeEmotionProfile(checkins);
    expect(p.bestMoment).toBe('mañana');

    // Todo en una sola franja → no se afirma "mejor momento".
    const single: HistoryCheckin[] = [];
    for (let i = 1; i <= 12; i++) {
      single.push(ci(`2026-07-${String(i).padStart(2, '0')}T08:00:00`, 'high_pleasant'));
    }
    expect(computeEmotionProfile(single).bestMoment).toBeNull();
  });

  it('momentOfDay corta en 12 y 19', () => {
    expect(momentOfDay('2026-07-01T08:00:00')).toBe('mañana');
    expect(momentOfDay('2026-07-01T15:00:00')).toBe('tarde');
    expect(momentOfDay('2026-07-01T21:00:00')).toBe('noche');
  });
});

describe('texto compartible', () => {
  it('dice explícito que es una foto del periodo, no identidad', () => {
    const checkins: HistoryCheckin[] = [];
    for (let i = 1; i <= 12; i++) {
      checkins.push(ci(`2026-07-${String(i).padStart(2, '0')}T10:00:00`, 'high_pleasant', ['motivated'], 8));
    }
    const text = buildShareText(computeEmotionProfile(checkins));
    expect(text).toContain('Reactor solar');
    expect(text).toContain('cómo estuve');
    expect(text.toLowerCase()).not.toMatch(/\bsoy (un|una|el|la)\b/);
  });

  it('perfil insuficiente → texto vacío (no se comparte lo que no existe)', () => {
    expect(buildShareText(computeEmotionProfile([]))).toBe('');
  });
});
