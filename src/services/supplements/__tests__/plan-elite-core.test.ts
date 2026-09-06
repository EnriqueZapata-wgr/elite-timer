// ATP 3.0 (6-sep-2026, ruta 3.5): reglas puras del plan Elite en Suplementos.
import { describe, it, expect } from 'vitest';
import { esDelCoach, planEliteSoloLectura } from '@/src/services/supplements/adherencia-core';

describe('esDelCoach', () => {
  it('solo las filas source=coach son del plan Elite', () => {
    expect(esDelCoach({ source: 'coach' })).toBe(true);
    expect(esDelCoach({ source: 'manual' })).toBe(false);
    expect(esDelCoach({ source: null })).toBe(false);
    expect(esDelCoach({})).toBe(false);
    expect(esDelCoach(null)).toBe(false);
    expect(esDelCoach(undefined)).toBe(false);
  });
});

describe('planEliteSoloLectura', () => {
  it('miembro: nunca solo lectura', () => {
    expect(planEliteSoloLectura({ esMiembro: true, nivelNoSePudoLeer: false, cargando: false })).toBe(false);
  });
  it('free confirmado: solo lectura', () => {
    expect(planEliteSoloLectura({ esMiembro: false, nivelNoSePudoLeer: false, cargando: false })).toBe(true);
  });
  it('regla 1: nivel ilegible o cargando se trata como miembro (fail-open)', () => {
    expect(planEliteSoloLectura({ esMiembro: false, nivelNoSePudoLeer: true, cargando: false })).toBe(false);
    expect(planEliteSoloLectura({ esMiembro: false, nivelNoSePudoLeer: false, cargando: true })).toBe(false);
  });
});
