import { describe, it, expect } from 'vitest';
import { formatCompact, formatFull } from '@/src/services/economy/format';

describe('economy/format — formatCompact', () => {
  it('K range con 1 decimal', () => {
    expect(formatCompact(23500)).toBe('23.5K');
    expect(formatCompact(1000)).toBe('1K');
    expect(formatCompact(100000)).toBe('100K');
  });
  it('M range', () => {
    expect(formatCompact(1247500)).toBe('1.2M');
    expect(formatCompact(2000000)).toBe('2M');
  });
  it('bajo 1000 sin sufijo', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(947)).toBe('947');
  });
  it('negativos', () => {
    expect(formatCompact(-2800)).toBe('-2.8K');
  });
});

describe('economy/format — formatFull', () => {
  it('separador de miles', () => {
    expect(formatFull(1247500)).toBe('1,247,500');
    expect(formatFull(500)).toBe('500');
  });
});
