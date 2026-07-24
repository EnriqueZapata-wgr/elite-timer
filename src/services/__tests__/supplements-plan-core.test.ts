import { describe, it, expect } from 'vitest';
import {
  normalizeSupplementName,
  findSupplementByName,
} from '@/src/services/supplements-plan-core';

describe('normalizeSupplementName — dedupe de las 2 puertas de scan (MB-2)', () => {
  it('case/espacios/acentos no distinguen', () => {
    expect(normalizeSupplementName('  Magnesio  Glicinato ')).toBe('magnesio glicinato');
    expect(normalizeSupplementName('CÚRCUMA')).toBe('curcuma');
    expect(normalizeSupplementName('Omega-3')).toBe('omega-3');
  });
  it('entradas rotas → cadena vacía', () => {
    expect(normalizeSupplementName(null)).toBe('');
    expect(normalizeSupplementName(undefined)).toBe('');
    expect(normalizeSupplementName('   ')).toBe('');
  });
});

describe('findSupplementByName', () => {
  const plan = [
    { id: '1', name: 'Magnesio Glicinato' },
    { id: '2', name: 'Vitamina D3' },
  ];
  it('encuentra por nombre normalizado', () => {
    expect(findSupplementByName('magnesio  glicinato', plan)?.id).toBe('1');
    expect(findSupplementByName('VITAMINA D3', plan)?.id).toBe('2');
  });
  it('sin coincidencia o nombre vacío → null (no matchea contra vacío)', () => {
    expect(findSupplementByName('Zinc', plan)).toBeNull();
    expect(findSupplementByName('', plan)).toBeNull();
    expect(findSupplementByName('  ', [{ id: 'x', name: '' }])).toBeNull();
  });
});
