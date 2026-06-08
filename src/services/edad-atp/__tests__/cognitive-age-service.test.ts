import { describe, it, expect } from 'vitest';
import { computeReactionTimeAge, computeCognitiveModifier } from '../cognitive-age-service';

describe('Edad Cognitiva — tiempo de reacción', () => {
  it('paciente 50 años con RT mediocre → edad cognitiva ~58-62', () => {
    const result = computeReactionTimeAge({ rt_simple_ms: 305, rt_choice_ms: 465, sex: 'male' });
    expect(result).toBeGreaterThanOrEqual(58);
    expect(result).toBeLessThanOrEqual(62);
  });

  it('RT excelente → edad cognitiva joven', () => {
    const result = computeReactionTimeAge({ rt_simple_ms: 250, rt_choice_ms: 380, sex: 'male' });
    expect(result).toBeLessThanOrEqual(25);
  });
});

describe('Modificador Cognitivo', () => {
  it('capeado a +3 si delta es +50', () => {
    const result = computeCognitiveModifier({ edad_cognitiva: 100, chronological_age: 50 });
    expect(result.modificador).toBe(3);
    expect(result.capped).toBe(true);
  });

  it('capeado a -3 si delta es -50', () => {
    const result = computeCognitiveModifier({ edad_cognitiva: 0, chronological_age: 50 });
    expect(result.modificador).toBe(-3);
    expect(result.capped).toBe(true);
  });

  it('modificador 0 si Edad Cognitiva = cronológica', () => {
    const result = computeCognitiveModifier({ edad_cognitiva: 50, chronological_age: 50 });
    expect(result.modificador).toBe(0);
    expect(result.capped).toBe(false);
  });

  it('delta +8 → modificador 0.8 (sin capear)', () => {
    const result = computeCognitiveModifier({ edad_cognitiva: 58, chronological_age: 50 });
    expect(result.modificador).toBeCloseTo(0.8, 5);
    expect(result.capped).toBe(false);
  });
});
