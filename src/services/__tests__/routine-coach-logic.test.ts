import { describe, expect, it } from 'vitest';

import {
  buildDemandingCoachInjection,
  DEMANDING_COACH_USER_HINT,
} from '../routine-coach-logic';

describe('buildDemandingCoachInjection (#97)', () => {
  it('prohíbe explícitamente las rutinas triviales', () => {
    const block = buildDemandingCoachInjection();
    expect(block).toContain('3 lagartijas');
    expect(block).toContain('EXIGENTE');
  });

  it('calibra por nivel cuando se conoce', () => {
    const block = buildDemandingCoachInjection('avanzado');
    expect(block).toContain('"avanzado"');
    expect(block).not.toContain('asume que puede más');
  });

  it('sin nivel asume capacidad y arranca fuerte', () => {
    const block = buildDemandingCoachInjection(null);
    expect(block).toContain('asume que puede más');
  });

  it('cubre ambos extremos: principiante progresivo y avanzado con cargas', () => {
    const block = buildDemandingCoachInjection();
    expect(block).toContain('Principiante');
    expect(block).toContain('Avanzado');
    expect(block).toContain('1RM');
    expect(block.toLowerCase()).toContain('fallo técnico');
  });

  it('pide el reto personal en la description (para el tag EXIGENTE en UI)', () => {
    expect(buildDemandingCoachInjection()).toContain('description');
  });

  it('user hint existe y es directo', () => {
    expect(DEMANDING_COACH_USER_HINT).toContain('MODO EXIGENTE');
  });
});
