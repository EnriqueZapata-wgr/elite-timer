/**
 * MB-8 #113 — cetonas de 3 fuentes (sangre/aliento/orina), cada una con su
 * unidad y validación. No se pueden mezclar mmol/L, ppm y cualitativo.
 */
import { describe, it, expect } from 'vitest';
import {
  KETONE_SOURCES, URINE_LEVELS,
  isValidKetoneReading, ketoStatusFor, formatKetoneReading,
  bloodKetoStatus, breathKetoStatus,
} from '../ketones-source-core';

describe('modelo de fuentes', () => {
  it('las 3 fuentes existen con su unidad', () => {
    expect(KETONE_SOURCES.map((s) => s.id)).toEqual(['blood', 'breath', 'urine']);
    expect(KETONE_SOURCES.find((s) => s.id === 'blood')?.unit).toBe('mmol/L');
    expect(KETONE_SOURCES.find((s) => s.id === 'breath')?.unit).toBe('ppm');
  });
});

describe('isValidKetoneReading', () => {
  it('sangre: numérico 0-10 mmol/L', () => {
    expect(isValidKetoneReading({ source: 'blood', numeric: 1.5 })).toBe(true);
    expect(isValidKetoneReading({ source: 'blood', numeric: 12 })).toBe(false);
    expect(isValidKetoneReading({ source: 'blood', numeric: -1 })).toBe(false);
    expect(isValidKetoneReading({ source: 'blood', numeric: null })).toBe(false);
  });
  it('aliento: ppm hasta 200', () => {
    expect(isValidKetoneReading({ source: 'breath', numeric: 12 })).toBe(true);
    expect(isValidKetoneReading({ source: 'breath', numeric: 300 })).toBe(false);
  });
  it('orina: nivel cualitativo válido', () => {
    expect(isValidKetoneReading({ source: 'urine', urineLevel: 'moderate' })).toBe(true);
    expect(isValidKetoneReading({ source: 'urine', urineLevel: 'inventado' })).toBe(false);
    expect(isValidKetoneReading({ source: 'urine', urineLevel: null })).toBe(false);
  });
});

describe('ketoStatusFor / rangos por fuente', () => {
  it('sangre usa el estándar de cetosis', () => {
    expect(bloodKetoStatus(2.0).label).toBe('Cetosis óptima');
    expect(bloodKetoStatus(0.2).label).toBe('Sin cetosis');
  });
  it('aliento usa ppm (correlación propia, no la de sangre)', () => {
    expect(breathKetoStatus(20).label).toBe('Cetosis óptima');
    expect(breathKetoStatus(1).label).toBe('Sin cetosis');
  });
  it('orina devuelve el nivel cualitativo', () => {
    expect(ketoStatusFor({ source: 'urine', urineLevel: 'large' }).label).toBe('Grande');
  });
});

describe('formatKetoneReading', () => {
  it('formatea según fuente', () => {
    expect(formatKetoneReading({ source: 'blood', numeric: 1.5 })).toBe('1.5 mmol/L');
    expect(formatKetoneReading({ source: 'breath', numeric: 12 })).toBe('12 ppm');
    expect(formatKetoneReading({ source: 'urine', urineLevel: 'small' })).toBe('Pequeña');
  });
  it('URINE_LEVELS ordenados de menor a mayor', () => {
    expect(URINE_LEVELS[0].id).toBe('negative');
    expect(URINE_LEVELS[URINE_LEVELS.length - 1].id).toBe('large');
  });
});
