import { describe, expect, it } from 'vitest';

import {
  CRISIS_BANNER_TEXT,
  LINEA_DE_LA_VIDA_PHONE,
  detectCrisisContent,
} from '../crisis-detection-core';

describe('detectCrisisContent (C5-002)', () => {
  it('detecta ideación suicida explícita, con y sin acentos', () => {
    expect(detectCrisisContent('he pensado en el suicidio')).toBe(true);
    expect(detectCrisisContent('Quiero quitarme la vida')).toBe(true);
    expect(detectCrisisContent('ya no quiero vivir')).toBe(true);
    expect(detectCrisisContent('ME QUIERO MORIR')).toBe(true);
  });

  it('detecta autolesión', () => {
    expect(detectCrisisContent('tengo ganas de hacerme daño')).toBe(true);
    expect(detectCrisisContent('pienso en cortarme')).toBe(true);
    expect(detectCrisisContent('la autolesión me da vueltas')).toBe(true);
  });

  it('NO dispara con conversación normal de la app', () => {
    expect(detectCrisisContent('¿qué debería comer hoy?')).toBe(false);
    expect(detectCrisisContent('me duele el hombro al entrenar')).toBe(false);
    expect(detectCrisisContent('estoy cansado y estresado del trabajo')).toBe(false);
    expect(detectCrisisContent('quiero vivir con más energía')).toBe(false);
    expect(detectCrisisContent(null)).toBe(false);
    expect(detectCrisisContent('')).toBe(false);
  });

  it('el copy del banner incluye el número oficial', () => {
    expect(CRISIS_BANNER_TEXT).toContain(LINEA_DE_LA_VIDA_PHONE);
    expect(CRISIS_BANNER_TEXT).toContain('Línea de la Vida');
  });
});
