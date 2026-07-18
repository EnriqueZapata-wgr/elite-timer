/**
 * edad-delta-core — regresión ANTI-REINVERSIÓN del número estrella (P1.6).
 * El bug real que motiva esto: diagnóstico mostró "7.2 años SOBRE tu edad
 * real" a un usuario de 35 con edad biológica 27.8 (más joven).
 */
import { describe, expect, it } from 'vitest';
import {
  edadDeltaYears,
  classifyEdadDelta,
  formatEdadDelta,
  formatEdadDeltaValue,
} from '../edad-delta-core';

describe('edadDeltaYears (convención: cron − integral, + = más joven)', () => {
  it('el caso del bug real: 35 cronológicos, 27.8 biológicos → +7.2 (más joven)', () => {
    expect(edadDeltaYears(35, 27.8)).toBe(7.2);
  });
  it('biológica mayor que cronológica → negativo (mayor)', () => {
    expect(edadDeltaYears(30, 33.5)).toBe(-3.5);
  });
});

describe('formatEdadDelta — el copy NUNCA puede volver a invertirse', () => {
  it('más joven → celebra ("más joven"), jamás "sobre"', () => {
    const s = formatEdadDelta(35, 27.8);
    expect(s).toBe('7.2 años más joven que tu edad real');
    expect(s).not.toMatch(/sobre/);
  });
  it('mayor → "sobre tu edad real" con magnitud absoluta', () => {
    expect(formatEdadDelta(30, 33.5)).toBe('3.5 años sobre tu edad real');
  });
  it('prácticamente igual → "En línea"', () => {
    expect(formatEdadDelta(30, 30.02)).toBe('En línea con tu edad real');
    expect(classifyEdadDelta(0)).toBe('even');
  });
  it('formatEdadDeltaValue acepta el delta_anos del motor tal cual', () => {
    expect(formatEdadDeltaValue(7.2)).toMatch(/más joven/);
    expect(formatEdadDeltaValue(-7.2)).toMatch(/sobre/);
  });
});
