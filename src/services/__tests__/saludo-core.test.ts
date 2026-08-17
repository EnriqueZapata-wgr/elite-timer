import { describe, it, expect } from 'vitest';
import { saludoPorHora } from '@/src/services/saludo-core';

describe('saludoPorHora (BLOQ-5)', () => {
  it('el caso exacto que reportó la auditoría: 8:43 am NO es de noche', () => {
    // La captura mostraba "Buenas noches" a las 8:43. La aritmética nunca
    // estuvo mal; lo que fallaba era que el saludo venía congelado de anoche.
    expect(saludoPorHora(8)).toBe('Buenos días,');
  });

  it('las tres franjas, con sus fronteras', () => {
    expect(saludoPorHora(0)).toBe('Buenos días,');
    expect(saludoPorHora(11)).toBe('Buenos días,');
    expect(saludoPorHora(12)).toBe('Buenas tardes,');
    expect(saludoPorHora(17)).toBe('Buenas tardes,');
    expect(saludoPorHora(18)).toBe('Buenas noches,');
    expect(saludoPorHora(23)).toBe('Buenas noches,');
  });

  it('los cortes siguen siendo 12 y 18: este arreglo fue de frescura, no de criterio', () => {
    // Candado deliberado. Mover la frontera de la tarde es decisión de
    // producto; si alguien la mueve, que sea a propósito y no de pasada.
    for (let h = 0; h < 24; h++) {
      const esperado = h < 12 ? 'Buenos días,' : h < 18 ? 'Buenas tardes,' : 'Buenas noches,';
      expect(saludoPorHora(h), `hora ${h}`).toBe(esperado);
    }
  });

  it('una hora inválida no cae en "Buenas noches" por accidente', () => {
    expect(saludoPorHora(NaN)).toBe('Hola,');
    expect(saludoPorHora(Infinity)).toBe('Hola,');
  });

  it('tolera horas fraccionarias', () => {
    expect(saludoPorHora(8.72)).toBe('Buenos días,');
    expect(saludoPorHora(17.99)).toBe('Buenas tardes,');
  });
});
