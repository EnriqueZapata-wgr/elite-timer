import { describe, it, expect } from 'vitest';
import { nowDividerIndex, minutesOfDay, formatNowLabel } from '@/src/utils/agenda-now';

describe('agenda-now — nowDividerIndex (F04.8)', () => {
  it('sin items → 0 (AHORA arriba solo)', () => {
    expect(nowDividerIndex([], 600)).toBe(0);
  });
  it('todos futuros → 0 (AHORA arriba de todos)', () => {
    expect(nowDividerIndex([600, 720, 900], 540)).toBe(0); // now 9:00, items 10/12/15
  });
  it('todos pasados → length (AHORA abajo de todos)', () => {
    expect(nowDividerIndex([420, 480], 600)).toBe(2); // now 10:00, items 7/8
  });
  it('mezcla → entre el último pasado y el primer futuro', () => {
    expect(nowDividerIndex([420, 720], 540)).toBe(1); // now 9:00; 7am pasado, 12pm futuro
  });
  it('item exactamente en now cuenta como futuro (no pasado)', () => {
    expect(nowDividerIndex([420, 540, 720], 540)).toBe(1); // 9:00 no es < 9:00
  });
  it('varios pasados seguidos', () => {
    expect(nowDividerIndex([360, 420, 480, 900], 600)).toBe(3);
  });
});

describe('agenda-now — minutesOfDay / formatNowLabel', () => {
  it('minutesOfDay', () => {
    const d = new Date(2026, 5, 15, 10, 42, 0);
    expect(minutesOfDay(d)).toBe(10 * 60 + 42);
  });
  it('formatNowLabel am', () => {
    expect(formatNowLabel(new Date(2026, 5, 15, 10, 42))).toBe('AHORA · 10:42 am');
  });
  it('formatNowLabel pm + padding', () => {
    expect(formatNowLabel(new Date(2026, 5, 15, 15, 5))).toBe('AHORA · 3:05 pm');
  });
  it('formatNowLabel medianoche → 12 am', () => {
    expect(formatNowLabel(new Date(2026, 5, 15, 0, 0))).toBe('AHORA · 12:00 am');
  });
  it('formatNowLabel mediodía → 12 pm', () => {
    expect(formatNowLabel(new Date(2026, 5, 15, 12, 0))).toBe('AHORA · 12:00 pm');
  });
});
