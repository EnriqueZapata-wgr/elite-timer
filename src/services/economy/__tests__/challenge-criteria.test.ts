import { describe, it, expect } from 'vitest';
import { updateProgress, isCompleted } from '../../../../supabase/functions/_shared/challenge-criteria';

describe('challenge-criteria — daily_steps', () => {
  const crit = { type: 'daily_steps' as const, target: 20000, days_required: 3 };
  it('suma un día solo si supera el target y es día nuevo', () => {
    let p = updateProgress(crit, null, { type: 'daily_steps', value: 21000, date: '2026-06-20' });
    expect(p.days_completed).toBe(1);
    // mismo día → no recuenta
    p = updateProgress(crit, p, { type: 'daily_steps', value: 25000, date: '2026-06-20' });
    expect(p.days_completed).toBe(1);
    // día nuevo → suma
    p = updateProgress(crit, p, { type: 'daily_steps', value: 22000, date: '2026-06-21' });
    expect(p.days_completed).toBe(2);
  });
  it('no suma si no alcanza el target', () => {
    const p = updateProgress(crit, null, { type: 'daily_steps', value: 5000, date: '2026-06-20' });
    expect(p.days_completed ?? 0).toBe(0);
  });
  it('isCompleted cuando days_completed >= days_required', () => {
    expect(isCompleted(crit, { days_completed: 3 })).toBe(true);
    expect(isCompleted(crit, { days_completed: 2 })).toBe(false);
  });
});

describe('challenge-criteria — cardio_minutes (acumula)', () => {
  const crit = { type: 'cardio_minutes' as const, target: 150 };
  it('acumula minutos y completa al llegar al target', () => {
    let p = updateProgress(crit, null, { type: 'cardio_minutes', value: 60, date: '2026-06-20' });
    p = updateProgress(crit, p, { type: 'cardio_minutes', value: 100, date: '2026-06-21' });
    expect(p.total_minutes).toBe(160);
    expect(isCompleted(crit, p)).toBe(true);
  });
});

describe('challenge-criteria — days_streak_habit', () => {
  const crit = { type: 'days_streak_habit' as const, days_required: 3 };
  it('cuenta días consecutivos, reinicia si hay hueco', () => {
    let p = updateProgress(crit, null, { type: 'days_streak_habit', value: 1, date: '2026-06-20' });
    p = updateProgress(crit, p, { type: 'days_streak_habit', value: 1, date: '2026-06-21' });
    expect(p.streak).toBe(2);
    // hueco (salta 22) → reinicia
    p = updateProgress(crit, p, { type: 'days_streak_habit', value: 1, date: '2026-06-23' });
    expect(p.streak).toBe(1);
  });
});

describe('challenge-criteria — type mismatch', () => {
  it('evento de otro tipo no cambia el progress', () => {
    const crit = { type: 'daily_steps' as const, target: 20000, days_required: 3 };
    const p = updateProgress(crit, { days_completed: 1 }, { type: 'cardio_minutes' as any, value: 99, date: '2026-06-20' });
    expect(p.days_completed).toBe(1);
  });
});
