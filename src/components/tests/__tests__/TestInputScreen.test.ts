import { describe, it, expect } from 'vitest';
import {
  effectiveDecimals,
  parseInputValue,
  isValueValid,
  formatClock,
} from '@/src/components/tests/test-input-helpers';

describe('TestInputScreen — effectiveDecimals', () => {
  it('reps siempre entero (0 decimales)', () => {
    expect(effectiveDecimals('reps', 2)).toBe(0);
  });
  it('otros tipos respetan decimals (default 0)', () => {
    expect(effectiveDecimals('number')).toBe(0);
    expect(effectiveDecimals('distance', 1)).toBe(1);
    expect(effectiveDecimals('time', 0)).toBe(0);
  });
});

describe('TestInputScreen — parseInputValue', () => {
  it('reps redondea a entero', () => {
    expect(parseInputValue('12.7', 'reps')).toBe(13);
  });
  it('distance respeta decimales', () => {
    expect(parseInputValue('1234.56', 'distance', 1)).toBe(1234.6);
  });
  it('acepta coma decimal', () => {
    expect(parseInputValue('2,5', 'number', 1)).toBe(2.5);
  });
  it('vacío → null', () => {
    expect(parseInputValue('', 'number')).toBeNull();
    expect(parseInputValue('   ', 'number')).toBeNull();
  });
  it('no numérico → null', () => {
    expect(parseInputValue('abc', 'number')).toBeNull();
  });
});

describe('TestInputScreen — isValueValid', () => {
  it('null inválido', () => {
    expect(isValueValid(null, 0, 100)).toBe(false);
  });
  it('respeta min/max inclusivo', () => {
    expect(isValueValid(0, 0, 120)).toBe(true);
    expect(isValueValid(120, 0, 120)).toBe(true);
    expect(isValueValid(-1, 0, 120)).toBe(false);
    expect(isValueValid(121, 0, 120)).toBe(false);
  });
  it('sin bounds → cualquier número finito vale', () => {
    expect(isValueValid(9999)).toBe(true);
  });
});

describe('TestInputScreen — formatClock', () => {
  it('M:SS bajo 1h', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(600)).toBe('10:00');
  });
  it('H:MM:SS a partir de 1h', () => {
    expect(formatClock(3661)).toBe('1:01:01');
  });
  it('redondea y nunca negativo', () => {
    expect(formatClock(89.6)).toBe('1:30');
    expect(formatClock(-5)).toBe('0:00');
  });
});
