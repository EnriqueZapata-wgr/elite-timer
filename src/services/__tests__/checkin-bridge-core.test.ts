/**
 * Tests — checkin-bridge-core (trigger puro del puente a la Tribu, Comunidad C5).
 */
import { describe, it, expect } from 'vitest';
import {
  shouldShowTribeBridge,
  isLowMoodCheckin,
  BRIDGE_WINDOW_DAYS,
  BRIDGE_MIN_DAYS_WITH_DATA,
  TRIBE_BRIDGE_COPY,
  type BridgeCheckin,
} from '../checkin-bridge-core';

const NOW = new Date('2026-07-10T18:00:00');

/** Genera un check-in a N días antes de NOW (mediodía local). */
function checkin(daysAgo: number, quadrant: string, pleasantness?: number | null): BridgeCheckin {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0);
  return { created_at: d.toISOString(), quadrant, pleasantness };
}

describe('isLowMoodCheckin', () => {
  it('low_unpleasant cuenta como bajo sin pleasantness', () => {
    expect(isLowMoodCheckin({ created_at: '', quadrant: 'low_unpleasant' })).toBe(true);
  });

  it('cuadrantes agradables no son bajos', () => {
    expect(isLowMoodCheckin({ created_at: '', quadrant: 'high_pleasant' })).toBe(false);
    expect(isLowMoodCheckin({ created_at: '', quadrant: 'low_pleasant' })).toBe(false);
  });

  it('high_unpleasant NO cuenta como bajo (mismo criterio que day-compiler)', () => {
    expect(isLowMoodCheckin({ created_at: '', quadrant: 'high_unpleasant' })).toBe(false);
  });

  it('pleasantness <= 4 domina sobre el cuadrante', () => {
    expect(isLowMoodCheckin({ created_at: '', quadrant: 'high_pleasant', pleasantness: 3 })).toBe(true);
    expect(isLowMoodCheckin({ created_at: '', quadrant: 'low_unpleasant', pleasantness: 8 })).toBe(false);
  });

  it('pleasantness null/0 cae al criterio de cuadrante', () => {
    expect(isLowMoodCheckin({ created_at: '', quadrant: 'low_unpleasant', pleasantness: null })).toBe(true);
    expect(isLowMoodCheckin({ created_at: '', quadrant: 'low_unpleasant', pleasantness: 0 })).toBe(true);
  });
});

describe('shouldShowTribeBridge', () => {
  it('sin data → false', () => {
    expect(shouldShowTribeBridge([], NOW)).toBe(false);
  });

  it('pocos días con data (aunque todos bajos) → false', () => {
    const few = Array.from({ length: BRIDGE_MIN_DAYS_WITH_DATA - 1 }, (_, i) =>
      checkin(i, 'low_unpleasant'));
    expect(shouldShowTribeBridge(few, NOW)).toBe(false);
  });

  it('mood bajo sostenido 3 semanas → true', () => {
    // 15 días con check-in bajo dentro de la ventana de 21.
    const sustained = Array.from({ length: 15 }, (_, i) => checkin(i, 'low_unpleasant'));
    expect(shouldShowTribeBridge(sustained, NOW)).toBe(true);
  });

  it('data suficiente pero mood mayormente bueno → false', () => {
    const mixed = [
      ...Array.from({ length: 10 }, (_, i) => checkin(i, 'high_pleasant')),
      ...Array.from({ length: 4 }, (_, i) => checkin(i + 10, 'low_unpleasant')),
    ];
    expect(shouldShowTribeBridge(mixed, NOW)).toBe(false);
  });

  it('exactamente en el umbral de ratio (60% de días bajos) → true', () => {
    // 10 días con data: 6 bajos, 4 buenos → 0.6 >= 0.6.
    const atThreshold = [
      ...Array.from({ length: 6 }, (_, i) => checkin(i, 'low_unpleasant')),
      ...Array.from({ length: 4 }, (_, i) => checkin(i + 6, 'high_pleasant')),
    ];
    expect(shouldShowTribeBridge(atThreshold, NOW)).toBe(true);
  });

  it('justo debajo del umbral (5 de 10 días bajos) → false', () => {
    const below = [
      ...Array.from({ length: 5 }, (_, i) => checkin(i, 'low_unpleasant')),
      ...Array.from({ length: 5 }, (_, i) => checkin(i + 5, 'high_pleasant')),
    ];
    expect(shouldShowTribeBridge(below, NOW)).toBe(false);
  });

  it('check-ins fuera de la ventana de 21 días se ignoran', () => {
    const old = Array.from({ length: 15 }, (_, i) =>
      checkin(BRIDGE_WINDOW_DAYS + 1 + i, 'low_unpleasant'));
    expect(shouldShowTribeBridge(old, NOW)).toBe(false);
  });

  it('varios check-ins el mismo día cuentan como UN día (mayoría decide)', () => {
    // 8 días; cada día tiene 2 bajos + 1 bueno → día bajo (mayoría).
    const multi: BridgeCheckin[] = [];
    for (let i = 0; i < 8; i++) {
      multi.push(checkin(i, 'low_unpleasant'));
      multi.push(checkin(i, 'low_unpleasant'));
      multi.push(checkin(i, 'high_pleasant'));
    }
    expect(shouldShowTribeBridge(multi, NOW)).toBe(true);
  });

  it('día con mayoría de check-ins buenos no cuenta como bajo', () => {
    // 8 días; cada día 1 bajo + 2 buenos → 0 días bajos.
    const multi: BridgeCheckin[] = [];
    for (let i = 0; i < 8; i++) {
      multi.push(checkin(i, 'low_unpleasant'));
      multi.push(checkin(i, 'high_pleasant'));
      multi.push(checkin(i, 'low_pleasant'));
    }
    expect(shouldShowTribeBridge(multi, NOW)).toBe(false);
  });

  it('timestamps inválidos no rompen ni cuentan', () => {
    const junk: BridgeCheckin[] = [
      { created_at: 'no-es-fecha', quadrant: 'low_unpleasant' },
      ...Array.from({ length: 4 }, (_, i) => checkin(i, 'low_unpleasant')),
    ];
    expect(shouldShowTribeBridge(junk, NOW)).toBe(false);
  });

  it('el copy aprobado no cambia silenciosamente', () => {
    expect(TRIBE_BRIDGE_COPY).toBe('Escucharte importa. La Tribu está aquí.');
  });
});
