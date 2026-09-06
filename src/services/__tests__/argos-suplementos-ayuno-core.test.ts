/**
 * ATP 3.0, ruta 2.0: reglas de suplementos y ayuno en el prompt de ARGOS.
 * Candado: la leyenda fija, la lista negra y las exclusiones de ayuno no se
 * pueden perder en silencio. Si un test truena, se arregla el bloque.
 */
import { describe, it, expect } from 'vitest';
import {
  buildSuplementosAyunoInjection,
  LEYENDA_SUPLEMENTOS,
  LISTA_NEGRA_SUPLEMENTOS,
  EXCLUSIONES_AYUNO,
  AVISO_AYUNO,
} from '@/src/services/argos-suplementos-ayuno-core';

describe('buildSuplementosAyunoInjection', () => {
  const bloque = buildSuplementosAyunoInjection();

  it('lleva la leyenda fija textual del informe legal (seccion 8)', () => {
    expect(bloque).toContain(LEYENDA_SUPLEMENTOS);
    expect(LEYENDA_SUPLEMENTOS).toContain('Los suplementos no son medicamentos');
    expect(LEYENDA_SUPLEMENTOS).toContain('condición diagnosticada');
  });

  it('habla en "puedes considerar", nunca en orden', () => {
    expect(bloque).toContain('puedes considerar');
    expect(bloque).toContain('rangos comúnmente usados');
    expect(bloque).toContain('nunca "toma X mg"');
  });

  it('lista negra completa', () => {
    for (const s of ['efedrina', 'yohimbina', 'DMAA', 'SARMs']) {
      expect(LISTA_NEGRA_SUPLEMENTOS).toContain(s);
      expect(bloque).toContain(s);
    }
    expect(bloque).toContain('megadosis');
  });

  it('ayuno: ventanas 12:12 a 16:8 y nada prolongado', () => {
    expect(bloque).toContain('12:12');
    expect(bloque).toContain('16:8');
    expect(bloque).toContain('ayunos prolongados');
  });

  it('ayuno: las cuatro exclusiones del informe legal', () => {
    expect(EXCLUSIONES_AYUNO).toHaveLength(4);
    for (const e of ['menores', 'embarazo', 'lactancia', 'diabetes tipo 1', 'insulina', 'trastornos alimentarios']) {
      expect(bloque).toContain(e);
    }
    expect(bloque).toContain(AVISO_AYUNO);
  });

  it('no vincula suplementos con enfermedad y no usa palabras rojas afirmativas', () => {
    expect(bloque).toContain('nunca con una enfermedad');
    // "diagnosticada" solo puede aparecer dentro de la leyenda fija.
    const sinLeyenda = bloque.replace(LEYENDA_SUPLEMENTOS, '');
    for (const roja of ['diagnostic', 'diagnóstic', 'tratamiento', 'terapéutic', 'previene', 'cura ']) {
      expect(sinLeyenda.toLowerCase()).not.toContain(roja);
    }
  });

  it('corto y sin em dashes', () => {
    expect(bloque.length).toBeLessThan(1500);
    expect(bloque).not.toContain('—');
  });
});
