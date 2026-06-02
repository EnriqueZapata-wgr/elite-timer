import { describe, it, expect, vi } from 'vitest';

// brake-detector importa @/src/lib/supabase (para logBrake).
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));

import { detectBrakes, selectDominantBrake, type DetectedBrake } from '../brake-detector';

describe('brake-detector — detectBrakes (heurística)', () => {
  it('"no sé cómo empezar" detecta no_saber', () => {
    const brakes = detectBrakes('no sé cómo empezar', undefined);
    expect(brakes.some((b) => b.type === 'no_saber')).toBe(true);
  });

  it('"me da miedo equivocarme" detecta miedo con confidence > 0.5 (recentAvoidance)', () => {
    const brakes = detectBrakes('me da miedo equivocarme', { recentAvoidance: true });
    const miedo = brakes.find((b) => b.type === 'miedo');
    expect(miedo).toBeDefined();
    expect(miedo!.confidence).toBeGreaterThan(0.5);
  });

  it('"estoy agotado y sin energía" + energyLow → energia_biologica dominante', () => {
    const brakes = detectBrakes('estoy agotado y sin energía', { energyLow: true });
    expect(selectDominantBrake(brakes)?.type).toBe('energia_biologica');
  });

  it('"mañana lo hago" detecta apatia (falso positivo conocido — TODO Mariana)', () => {
    // NOTA: "mañana" como keyword de apatia produce falsos positivos.
    // Refinamiento pendiente de review clínico con Mariana.
    const brakes = detectBrakes('mañana lo hago', undefined);
    expect(brakes.some((b) => b.type === 'apatia')).toBe(true);
  });
});

describe('brake-detector — selectDominantBrake (pure)', () => {
  it('lista vacía → null', () => {
    expect(selectDominantBrake([])).toBeNull();
  });

  it('elige el de mayor confidence', () => {
    const brakes: DetectedBrake[] = [
      { type: 'miedo', confidence: 0.7, keywordMatched: 'miedo' },
      { type: 'apatia', confidence: 0.5, keywordMatched: 'mañana' },
    ];
    expect(selectDominantBrake(brakes)?.type).toBe('miedo');
  });
});
