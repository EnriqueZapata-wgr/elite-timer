/**
 * Pieza 3 — la aritmética sale del modelo.
 *
 * EL BUG REAL: con "25.3h de 16h objetivo" ARGOS dijo "más del doble". Es 1.6
 * veces. El modelo narra, no calcula: la comparación entra al prompt resuelta.
 */
import { describe, it, expect } from 'vitest';
import { compararConMeta, buildContextPrompt, type UserContext } from '@/src/services/argos-context-core';

describe('compararConMeta', () => {
  it('EL CASO REAL: 25.3 h contra meta de 16 h es 1.6 veces, no el doble', () => {
    const out = compararConMeta(25.3, 16);
    expect(out).toContain('1.6 veces la meta');
    expect(out).toContain('9.3 h por encima');
    expect(out).not.toContain('2 veces');
  });

  it('por debajo de la meta lo dice en porcentaje y en horas faltantes', () => {
    expect(compararConMeta(12, 16)).toBe('75% de la meta, faltan 4 h');
  });

  it('meta exacta', () => {
    expect(compararConMeta(16, 16)).toBe('meta cumplida exacta');
  });

  it('meta inválida (0, negativa, NaN) no inventa comparación', () => {
    expect(compararConMeta(25.3, 0)).toBe('');
    expect(compararConMeta(25.3, -4)).toBe('');
    expect(compararConMeta(NaN, 16)).toBe('');
  });

  it('el doble sí se llama el doble', () => {
    expect(compararConMeta(32, 16)).toContain('2 veces la meta');
  });
});

describe('buildContextPrompt — el ayuno llega comparado', () => {
  it('la línea de ayuno trae la comparación y la prohibición de calcular', () => {
    const ctx: UserContext = {
      name: 'Cliente',
      currentFastingStatus: { isFasting: true, hoursElapsed: 25.3, targetHours: 16 },
    };
    const prompt = buildContextPrompt(ctx);
    expect(prompt).toContain('25.3h de 16h objetivo');
    expect(prompt).toContain('1.6 veces la meta');
    expect(prompt).toContain('no calcules múltiplos');
  });

  it('si el servicio ya mandó la frase, se respeta tal cual', () => {
    const ctx: UserContext = {
      name: 'Cliente',
      currentFastingStatus: {
        isFasting: true, hoursElapsed: 25.3, targetHours: 16,
        comparacionMeta: '1.6 veces la meta, 9.3 h por encima',
      },
    };
    expect(buildContextPrompt(ctx)).toContain('1.6 veces la meta, 9.3 h por encima');
  });
});
