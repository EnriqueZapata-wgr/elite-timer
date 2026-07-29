import { describe, it, expect, vi } from 'vitest';
import { computeLongestStreak, type PlanRow } from '../adherence-service';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';

// vi.mock se hoistea por encima de los imports — el servicio nunca toca red.
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn() }));

/** Fecha relativa a hoy (offset en días, negativo = pasado). */
function d(offset: number): string {
  const cur = parseLocalDate(getLocalToday());
  cur.setDate(cur.getDate() + offset);
  return toLocalDateString(cur);
}

function plan(offset: number, pct: number | null): PlanRow {
  return { date: d(offset), compliance_pct: pct };
}

describe('computeLongestStreak (MB-11 C · stats de identidad)', () => {
  it('sin planes → 0', () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it('racha corrida simple', () => {
    expect(computeLongestStreak([plan(-2, 90), plan(-1, 80), plan(0, 100)])).toBe(3);
  });

  it('1 fallo aislado dentro de una racha viva se perdona (no suma, no corta)', () => {
    // 5 OK, 1 fallo, 3 OK → la gracia une: 8.
    const plans = [
      plan(-8, 90), plan(-7, 90), plan(-6, 90), plan(-5, 90), plan(-4, 90),
      plan(-3, 40), // fallo aislado
      plan(-2, 90), plan(-1, 90), plan(0, 90),
    ];
    expect(computeLongestStreak(plans)).toBe(8);
  });

  it('2 fallos consecutivos rompen — la racha más larga queda atrás', () => {
    const plans = [
      plan(-9, 90), plan(-8, 90), plan(-7, 90), plan(-6, 90), plan(-5, 90),
      plan(-4, 10), plan(-3, 10), // rompe
      plan(-2, 90), plan(-1, 90), plan(0, 90),
    ];
    expect(computeLongestStreak(plans)).toBe(5);
  });

  it('días de calendario sin plan cuentan como fallo (mismo criterio que computeStreak)', () => {
    // OK hace 5 y 4; hueco de 2 días sin plan (el 1º se perdona, el 2º rompe);
    // OK ayer y hoy → dos rachas de 2, no una de 4.
    const plans = [plan(-5, 90), plan(-4, 90), plan(-1, 90), plan(0, 90)];
    expect(computeLongestStreak(plans)).toBe(2);
  });

  it('un solo hueco de calendario se puentea con la gracia', () => {
    const plans = [plan(-5, 90), plan(-4, 90), plan(-2, 90), plan(-1, 90), plan(0, 90)];
    expect(computeLongestStreak(plans)).toBe(5);
  });

  it('hoy en progreso no rompe la racha vigente', () => {
    const plans = [plan(-2, 90), plan(-1, 90), plan(0, 0)];
    expect(computeLongestStreak(plans)).toBe(2);
  });

  it('D-3 (MB-12): dos fallos AISLADOS (nunca consecutivos) no rompen — la gracia se recupera al retomar', () => {
    // 3 OK, 1 fallo, 3 OK, 1 fallo, 2 OK → una sola racha puenteada: 8.
    const plans = [
      plan(-9, 90), plan(-8, 90), plan(-7, 90),
      plan(-6, 20), // fallo aislado 1
      plan(-5, 90), plan(-4, 90), plan(-3, 90),
      plan(-2, 20), // fallo aislado 2 — antes rompía aquí
      plan(-1, 90), plan(0, 90),
    ];
    expect(computeLongestStreak(plans)).toBe(8);
  });

  it('racha vieja mayor que la actual gana', () => {
    const plans = [
      plan(-10, 90), plan(-9, 90), plan(-8, 90), plan(-7, 90),
      plan(-6, 10), plan(-5, 10),
      plan(-4, 90), plan(-3, 90),
      plan(-2, 10), plan(-1, 10),
      plan(0, 90),
    ];
    expect(computeLongestStreak(plans)).toBe(4);
  });
});
