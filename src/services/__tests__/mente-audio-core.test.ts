import { describe, it, expect } from 'vitest';
import { shouldClearPosition, sessionTypeFor, electronSourceFor } from '../mente-audio-core';

describe('shouldClearPosition (retomar donde quedó)', () => {
  it('al inicio (<10s) no se guarda', () => {
    expect(shouldClearPosition(0, 600)).toBe(true);
    expect(shouldClearPosition(9.9, 600)).toBe(true);
    expect(shouldClearPosition(10, 600)).toBe(false);
  });

  it('cerca del final (<30s restantes) se limpia', () => {
    expect(shouldClearPosition(571, 600)).toBe(true);
    expect(shouldClearPosition(570, 600)).toBe(false);
    expect(shouldClearPosition(300, 600)).toBe(false);
  });

  it('pieza corta (pausa 1min, 68s): guarda a media pieza, limpia cerca del final', () => {
    expect(shouldClearPosition(20, 68)).toBe(false); // restan 48s → se guarda
    expect(shouldClearPosition(45, 68)).toBe(true);  // restan 23s → se limpia
  });
});

describe('sessionTypeFor / electronSourceFor (CHECK mig 049 + espejo pantallas)', () => {
  it('respiración → breathing → breathwork', () => {
    expect(sessionTypeFor('respiracion')).toBe('breathing');
    expect(electronSourceFor('breathing')).toBe('breathwork');
  });

  it('meditación y descanso → meditation → meditation', () => {
    expect(sessionTypeFor('meditacion')).toBe('meditation');
    expect(sessionTypeFor('descanso')).toBe('meditation');
    expect(electronSourceFor('meditation')).toBe('meditation');
  });
});
