/**
 * Tests de padecimientos-core (SALUD F5) — validación del formulario ligero
 * (espejo de los CHECK de la migración 173) y vista padecimiento+episodios.
 * Node-only, sin react-native/supabase.
 */
import { describe, it, expect } from 'vitest';
import {
  isValidDateStr,
  validatePadecimientoInput,
  buildPadecimientoViews,
  episodioStatusLabel,
  PADECIMIENTO_CATEGORIES,
  CATEGORY_LABELS,
  type EpisodioRow,
  type PadecimientoRow,
} from '../padecimientos-core';

const TODAY = '2026-07-10';

function ped(partial: Partial<PadecimientoRow> & { id: string; name: string }): PadecimientoRow {
  return {
    user_id: 'u1',
    category: 'otro',
    is_chronic: false,
    notes: null,
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
    ...partial,
  };
}

function ep(partial: Partial<EpisodioRow> & { id: string; padecimiento_id: string; started_on: string }): EpisodioRow {
  return {
    user_id: 'u1',
    resolved_on: null,
    duration_days: null,
    severity: null,
    treatment: null,
    notes: null,
    created_at: '2026-07-01T10:00:00Z',
    ...partial,
  };
}

function baseInput(over: Record<string, unknown> = {}) {
  return {
    name: 'Gripe',
    category: 'infeccioso',
    isChronic: false,
    startedOn: '2026-07-05',
    isResolved: false,
    ...over,
  };
}

describe('isValidDateStr', () => {
  it('acepta YYYY-MM-DD reales', () => {
    expect(isValidDateStr('2026-07-10')).toBe(true);
    expect(isValidDateStr('2024-02-29')).toBe(true); // bisiesto
  });

  it('rechaza formato y fechas de calendario inválidas', () => {
    expect(isValidDateStr('10/07/2026')).toBe(false);
    expect(isValidDateStr('2026-7-1')).toBe(false);
    expect(isValidDateStr('2026-02-31')).toBe(false);
    expect(isValidDateStr('2026-13-01')).toBe(false);
    expect(isValidDateStr('')).toBe(false);
  });
});

describe('validatePadecimientoInput', () => {
  it('rechaza nombre vacío', () => {
    const r = validatePadecimientoInput(baseInput({ name: '  ' }), TODAY);
    expect(r.ok).toBe(false);
  });

  it('rechaza categoría fuera del CHECK de la 173', () => {
    const r = validatePadecimientoInput(baseInput({ category: 'magico' }), TODAY);
    expect(r.ok).toBe(false);
  });

  it('todas las categorías del CHECK tienen label es-MX', () => {
    for (const c of PADECIMIENTO_CATEGORIES) {
      expect(CATEGORY_LABELS[c]).toBeTruthy();
    }
  });

  it('rechaza inicio futuro y mal formado', () => {
    expect(validatePadecimientoInput(baseInput({ startedOn: '2026-07-11' }), TODAY).ok).toBe(false);
    expect(validatePadecimientoInput(baseInput({ startedOn: 'ayer' }), TODAY).ok).toBe(false);
  });

  it('activo → resolvedOn null', () => {
    const r = validatePadecimientoInput(baseInput(), TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.resolvedOn).toBeNull();
  });

  it('resuelto sin fecha → hoy por default', () => {
    const r = validatePadecimientoInput(baseInput({ isResolved: true }), TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.resolvedOn).toBe(TODAY);
  });

  it('espeja episodio_dates_ordered: resolución < inicio se rechaza', () => {
    const r = validatePadecimientoInput(
      baseInput({ isResolved: true, resolvedOn: '2026-07-01' }),
      TODAY,
    );
    expect(r.ok).toBe(false);
  });

  it('mismo día inicio=resolución pasa (CHECK usa >=)', () => {
    const r = validatePadecimientoInput(
      baseInput({ startedOn: '2026-07-05', isResolved: true, resolvedOn: '2026-07-05' }),
      TODAY,
    );
    expect(r.ok).toBe(true);
  });

  it('normaliza nombre y notas', () => {
    const r = validatePadecimientoInput(
      baseInput({ name: '  gastritis   crónica ', notes: '  empeora con café  ' }),
      TODAY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe('gastritis crónica');
      expect(r.value.notes).toBe('empeora con café');
    }
  });
});

describe('buildPadecimientoViews', () => {
  it('une episodios, deriva isActive y ordena activos primero', () => {
    const peds = [
      ped({ id: 'p1', name: 'Gripe' }),
      ped({ id: 'p2', name: 'Gastritis', is_chronic: true }),
      ped({ id: 'p3', name: 'Dermatitis' }),
    ];
    const eps = [
      ep({ id: 'e1', padecimiento_id: 'p1', started_on: '2026-06-01', resolved_on: '2026-06-08', duration_days: 7 }),
      ep({ id: 'e2', padecimiento_id: 'p1', started_on: '2026-07-01', resolved_on: '2026-07-04', duration_days: 3 }),
      ep({ id: 'e3', padecimiento_id: 'p2', started_on: '2026-05-15' }), // en curso
    ];
    const views = buildPadecimientoViews(peds, eps);

    // p2 activo primero; luego resueltos por episodio más reciente; p3 sin episodios al final
    expect(views.map((v) => v.padecimiento.id)).toEqual(['p2', 'p1', 'p3']);

    const p1 = views.find((v) => v.padecimiento.id === 'p1')!;
    expect(p1.isActive).toBe(false);
    expect(p1.episodios.map((e) => e.id)).toEqual(['e2', 'e1']); // desc por started_on
    expect(p1.lastStartedOn).toBe('2026-07-01');

    const p2 = views.find((v) => v.padecimiento.id === 'p2')!;
    expect(p2.isActive).toBe(true);

    const p3 = views.find((v) => v.padecimiento.id === 'p3')!;
    expect(p3.episodios).toEqual([]);
    expect(p3.isActive).toBe(false);
    expect(p3.lastStartedOn).toBeNull();
  });

  it('vacío → vacío', () => {
    expect(buildPadecimientoViews([], [])).toEqual([]);
  });
});

describe('episodioStatusLabel', () => {
  it('en curso / resuelto con duración generada por Postgres', () => {
    expect(episodioStatusLabel({ resolved_on: null, duration_days: null })).toBe('En curso');
    expect(episodioStatusLabel({ resolved_on: '2026-07-04', duration_days: 3 })).toBe('Resuelto · 3 días');
    expect(episodioStatusLabel({ resolved_on: '2026-07-04', duration_days: 1 })).toBe('Resuelto · 1 día');
    expect(episodioStatusLabel({ resolved_on: '2026-07-04', duration_days: 0 })).toBe('Resuelto · mismo día');
    expect(episodioStatusLabel({ resolved_on: '2026-07-04', duration_days: null })).toBe('Resuelto');
  });
});
