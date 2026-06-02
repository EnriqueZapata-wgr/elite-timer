import { describe, it, expect, vi } from 'vitest';

// two-questions importa voice-modulator → @/src/lib/supabase. Mockeamos supabase
// para no cargar react-native/expo. Sólo testeamos evaluateQ2 (pura).
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));

import { evaluateQ2_TrafficLight } from '../two-questions';

describe('two-questions — evaluateQ2 (pure)', () => {
  it('glucosa por debajo de yellow → verde', () => {
    expect(evaluateQ2_TrafficLight({ type: 'glucosa', value: 100, thresholds: { yellow: 140, red: 200 } })).toBe('verde');
  });

  it('glucosa entre yellow y red → amarillo', () => {
    expect(evaluateQ2_TrafficLight({ type: 'glucosa', value: 150, thresholds: { yellow: 140, red: 200 } })).toBe('amarillo');
  });

  it('glucosa por encima de red → rojo', () => {
    expect(evaluateQ2_TrafficLight({ type: 'glucosa', value: 220, thresholds: { yellow: 140, red: 200 } })).toBe('rojo');
  });

  it('HRV ("menos es peor", red < yellow): valor bajo → rojo', () => {
    // El caller pasa thresholds en sentido correcto (red < yellow). La dirección
    // se infiere y un HRV de 30 (por debajo del red de 35) escala a rojo.
    expect(evaluateQ2_TrafficLight({ type: 'hrv', value: 30, thresholds: { yellow: 50, red: 35 } })).toBe('rojo');
  });

  it('HRV: valor entre red y yellow → amarillo', () => {
    expect(evaluateQ2_TrafficLight({ type: 'hrv', value: 45, thresholds: { yellow: 50, red: 35 } })).toBe('amarillo');
  });

  it('HRV: valor alto → verde', () => {
    expect(evaluateQ2_TrafficLight({ type: 'hrv', value: 70, thresholds: { yellow: 50, red: 35 } })).toBe('verde');
  });
});
