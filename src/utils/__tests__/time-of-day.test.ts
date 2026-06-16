import { describe, it, expect } from 'vitest';
import { hoyBgBucket } from '@/src/utils/time-of-day';

describe('time-of-day — hoyBgBucket (F01.4 fondo dinámico)', () => {
  it('6am → morning', () => { expect(hoyBgBucket(6)).toBe('morning'); });
  it('11am → morning', () => { expect(hoyBgBucket(11)).toBe('morning'); });
  it('2pm → midday', () => { expect(hoyBgBucket(14)).toBe('midday'); });
  it('6pm → midday', () => { expect(hoyBgBucket(18)).toBe('midday'); });
  it('9pm → night', () => { expect(hoyBgBucket(21)).toBe('night'); });
  it('11pm → sleep', () => { expect(hoyBgBucket(23)).toBe('sleep'); });
  it('3am → sleep', () => { expect(hoyBgBucket(3)).toBe('sleep'); });
  it('límites: 5 → morning, 12 → midday, 19 → night, 22 → sleep', () => {
    expect(hoyBgBucket(5)).toBe('morning');
    expect(hoyBgBucket(12)).toBe('midday');
    expect(hoyBgBucket(19)).toBe('night');
    expect(hoyBgBucket(22)).toBe('sleep');
  });
});
