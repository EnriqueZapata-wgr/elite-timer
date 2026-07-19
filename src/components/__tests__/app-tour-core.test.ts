/**
 * MB-10 — el welcome tour tiene 7 pantallas (una por pilar) y NUNCA muestra la
 * pantalla de Ciclo a un hombre (misma doctrina biological_sex de MB-7).
 *
 * buildTourSteps es puro salvo los require() de imagen. En vitest los require de
 * .png/.jpg resuelven a un stub, así que la función corre; solo miramos kickers.
 */
import { describe, it, expect } from 'vitest';
import { buildTourSteps } from '../tour/app-tour-core';

describe('buildTourSteps', () => {
  it('siempre 7 pantallas (una por pilar)', () => {
    expect(buildTourSteps('female')).toHaveLength(7);
    expect(buildTourSteps('male')).toHaveLength(7);
    expect(buildTourSteps(null)).toHaveLength(7);
  });

  it('female ve CICLO; nadie más', () => {
    expect(buildTourSteps('female').map((s) => s.kicker)).toContain('CICLO');
    expect(buildTourSteps('male').map((s) => s.kicker)).not.toContain('CICLO');
    expect(buildTourSteps(null).map((s) => s.kicker)).not.toContain('CICLO');
  });

  it('no-female ve COMUNIDAD en el lugar de Ciclo', () => {
    expect(buildTourSteps('male').map((s) => s.kicker)).toContain('COMUNIDAD');
  });

  it('arranca en HOY y cierra en EMPIEZA', () => {
    const steps = buildTourSteps('female');
    expect(steps[0].kicker).toBe('HOY');
    expect(steps[steps.length - 1].kicker).toBe('EMPIEZA');
  });
});
