import { describe, it, expect } from 'vitest';
// Lógica pura compartida con la Edge Function award-electrons.
import {
  HABIT_RULES, applyDecay, amountForOccurrence, validateHabit, resolveDayWindow,
} from '../../../../supabase/functions/_shared/award-rules';

describe('award-rules — applyDecay (hidratación)', () => {
  it('10 taps de hidratación (base 2, cap 10) suman 13, no 20', () => {
    const rule = HABIT_RULES.hydration_tap;
    let total = 0;
    for (let i = 0; i < rule.dailyCap; i++) total += amountForOccurrence(rule, i);
    expect(total).toBe(13); // 2+2+2+1+1+1+1+1+1+1
  });
  it('1er = base, decae, nunca bajo 1', () => {
    expect(applyDecay(2, 0, 10)).toBe(2);
    expect(applyDecay(2, 9, 10)).toBe(1);
    expect(applyDecay(2, 100, 10)).toBe(1);
  });
});

describe('award-rules — amountForOccurrence (sin decay)', () => {
  it('hábitos sin decay dan monto fijo', () => {
    expect(amountForOccurrence(HABIT_RULES.sleep_wearable, 0)).toBe(30);
    expect(amountForOccurrence(HABIT_RULES.cardio_hr_wearable, 2)).toBe(25);
  });
});

describe('award-rules — validateHabit', () => {
  it('hábito válido con evidencia correcta', () => {
    const v = validateHabit('sleep_wearable', 'wearable');
    expect(v.ok).toBe(true);
  });
  it('tier mismatch → 422', () => {
    const v = validateHabit('sleep_wearable', 'self');
    expect(v.ok).toBe(false);
    if (!v.ok) { expect(v.status).toBe(422); expect(v.type).toBe('invalid_habit'); }
  });
  it('habit_type desconocido → 422', () => {
    const v = validateHabit('teleporting', 'wearable');
    expect(v.ok).toBe(false);
  });
});

describe('award-rules — resolveDayWindow (anti-abuso de caps)', () => {
  const now = '2026-06-22T15:00:00.000Z';
  it('usa local_date si está dentro de ±1 día', () => {
    expect(resolveDayWindow('2026-06-22', now).date).toBe('2026-06-22');
    expect(resolveDayWindow('2026-06-21', now).date).toBe('2026-06-21');
  });
  it('ignora fechas lejanas (gaming) → hoy UTC', () => {
    expect(resolveDayWindow('2099-01-01', now).date).toBe('2026-06-22');
    expect(resolveDayWindow('not-a-date', now).date).toBe('2026-06-22');
    expect(resolveDayWindow(undefined, now).date).toBe('2026-06-22');
  });
  it('ventana es [00:00Z, +24h)', () => {
    const w = resolveDayWindow('2026-06-22', now);
    expect(w.start).toBe('2026-06-22T00:00:00.000Z');
    expect(w.end).toBe('2026-06-23T00:00:00.000Z');
  });
});
