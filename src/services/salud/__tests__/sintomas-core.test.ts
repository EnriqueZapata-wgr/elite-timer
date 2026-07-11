/**
 * Tests de sintomas-core (SALUD F5) — validación del quick-tap y agrupación
 * por día local del timeline. Node-only, sin react-native/supabase.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeTag,
  normalizeNote,
  isValidSeverity,
  validateSintomaInput,
  localDayOf,
  groupSintomasByDay,
  dayLabel,
  type SintomaAisladoRow,
} from '../sintomas-core';
import { SINTOMA_TAG_MAX_LEN } from '@/src/constants/sintomas-catalog';

function row(partial: Partial<SintomaAisladoRow> & { logged_at: string }): SintomaAisladoRow {
  return {
    id: partial.id ?? `id-${partial.logged_at}`,
    user_id: 'u1',
    tag: partial.tag ?? 'Fatiga',
    severity: partial.severity ?? null,
    note: partial.note ?? null,
    logged_at: partial.logged_at,
  };
}

/** ISO local (sin Z) — evita que el resultado dependa del huso de la máquina de CI. */
function atLocal(day: string, time: string): string {
  return `${day}T${time}`;
}

describe('normalizeTag', () => {
  it('trimea y colapsa espacios internos', () => {
    expect(normalizeTag('  niebla   mental  ')).toBe('niebla mental');
  });

  it('devuelve vacío para solo-espacios', () => {
    expect(normalizeTag('    ')).toBe('');
  });

  it('recorta al máximo de longitud', () => {
    expect(normalizeTag('x'.repeat(200)).length).toBe(SINTOMA_TAG_MAX_LEN);
  });
});

describe('normalizeNote', () => {
  it('null/vacío → null', () => {
    expect(normalizeNote(null)).toBeNull();
    expect(normalizeNote('   ')).toBeNull();
  });

  it('trimea contenido real', () => {
    expect(normalizeNote('  después de comer  ')).toBe('después de comer');
  });
});

describe('isValidSeverity (CHECK 1-5, opcional)', () => {
  it('null/undefined pasan (severidad opcional en 174)', () => {
    expect(isValidSeverity(null)).toBe(true);
    expect(isValidSeverity(undefined)).toBe(true);
  });

  it('acepta 1..5 enteros', () => {
    for (const s of [1, 2, 3, 4, 5]) expect(isValidSeverity(s)).toBe(true);
  });

  it('rechaza fuera de rango y no-enteros', () => {
    expect(isValidSeverity(0)).toBe(false);
    expect(isValidSeverity(6)).toBe(false);
    expect(isValidSeverity(2.5)).toBe(false);
  });
});

describe('validateSintomaInput', () => {
  it('rechaza tag vacío con copy legible', () => {
    const r = validateSintomaInput('   ', null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('síntoma');
  });

  it('rechaza severidad inválida', () => {
    expect(validateSintomaInput('Fatiga', 9).ok).toBe(false);
  });

  it('normaliza y arma el input listo para insertar', () => {
    const r = validateSintomaInput('  dolor   de cabeza ', 3, '  tras el café ');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ tag: 'dolor de cabeza', severity: 3, note: 'tras el café' });
    }
  });

  it('severidad omitida → null (quick-tap sin fricción)', () => {
    const r = validateSintomaInput('Fatiga', undefined);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.severity).toBeNull();
  });
});

describe('groupSintomasByDay (timeline)', () => {
  it('agrupa por día local, días recientes primero e items desc dentro del día', () => {
    const rows = [
      row({ id: 'a', logged_at: atLocal('2026-07-09', '08:00:00') }),
      row({ id: 'b', logged_at: atLocal('2026-07-10', '07:30:00') }),
      row({ id: 'c', logged_at: atLocal('2026-07-10', '21:15:00') }),
      row({ id: 'd', logged_at: atLocal('2026-07-08', '12:00:00') }),
    ];
    const groups = groupSintomasByDay(rows);
    expect(groups.map((g) => g.day)).toEqual(['2026-07-10', '2026-07-09', '2026-07-08']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['c', 'b']); // 21:15 arriba de 07:30
  });

  it('tolera input desordenado y vacío', () => {
    expect(groupSintomasByDay([])).toEqual([]);
    const rows = [
      row({ id: 'x', logged_at: atLocal('2026-07-01', '10:00:00') }),
      row({ id: 'y', logged_at: atLocal('2026-07-03', '10:00:00') }),
      row({ id: 'z', logged_at: atLocal('2026-07-02', '10:00:00') }),
    ];
    expect(groupSintomasByDay(rows).map((g) => g.day)).toEqual([
      '2026-07-03', '2026-07-02', '2026-07-01',
    ]);
  });

  it('localDayOf usa la zona local (timestamp sin Z)', () => {
    expect(localDayOf('2026-07-10T23:59:00')).toBe('2026-07-10');
  });
});

describe('dayLabel', () => {
  it('distingue hoy / ayer / fecha', () => {
    expect(dayLabel('2026-07-10', '2026-07-10', '2026-07-09')).toBe('hoy');
    expect(dayLabel('2026-07-09', '2026-07-10', '2026-07-09')).toBe('ayer');
    expect(dayLabel('2026-07-01', '2026-07-10', '2026-07-09')).toBe('fecha');
  });
});
