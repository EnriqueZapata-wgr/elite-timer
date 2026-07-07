import { describe, it, expect } from 'vitest';
import {
  groupSymptomsBySystem,
  buildExecutiveSummary,
  type ClinicalSymptom,
} from '../clinical-history-core';
import { FUNCTIONAL_SYSTEMS } from '@/src/constants/functional-systems';

function sym(partial: Partial<ClinicalSymptom>): ClinicalSymptom {
  return {
    id: 'x',
    user_id: 'u',
    system_key: 'energia',
    name: 'Fatiga',
    severity: 3,
    notes: null,
    status: 'active',
    first_seen: '2026-07-01',
    resolved_at: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...partial,
  };
}

describe('groupSymptomsBySystem', () => {
  it('devuelve los 7 sistemas siempre, aun vacíos', () => {
    const grouped = groupSymptomsBySystem([]);
    expect(Object.keys(grouped)).toHaveLength(7);
    for (const s of FUNCTIONAL_SYSTEMS) {
      expect(grouped[s.key]).toEqual([]);
    }
  });

  it('agrupa por system_key', () => {
    const grouped = groupSymptomsBySystem([
      sym({ id: 'a', system_key: 'energia' }),
      sym({ id: 'b', system_key: 'comunicacion', name: 'Insomnio' }),
      sym({ id: 'c', system_key: 'energia', name: 'Niebla mental' }),
    ]);
    expect(grouped.energia.map(s => s.id)).toEqual(['a', 'c']);
    expect(grouped.comunicacion).toHaveLength(1);
    expect(grouped.transporte).toEqual([]);
  });
});

describe('buildExecutiveSummary', () => {
  it('expediente vacío', () => {
    const s = buildExecutiveSummary([]);
    expect(s.totalActive).toBe(0);
    expect(s.focusSystem).toBeNull();
    expect(s.headline).toContain('Expediente limpio');
  });

  it('solo resueltos', () => {
    const s = buildExecutiveSummary([sym({ status: 'resolved' })]);
    expect(s.totalActive).toBe(0);
    expect(s.totalResolved).toBe(1);
    expect(s.headline).toContain('Sin síntomas activos');
    expect(s.headline).toContain('1 resuelto');
  });

  it('sistema con mayor carga = suma de severidades, no conteo', () => {
    const s = buildExecutiveSummary([
      sym({ system_key: 'energia', severity: 2 }),
      sym({ system_key: 'energia', severity: 2 }),
      sym({ system_key: 'comunicacion', severity: 5 }),
    ]);
    // comunicacion: 5 > energia: 4
    expect(s.focusSystem).toBe('comunicacion');
    expect(s.totalActive).toBe(3);
    expect(s.headline).toContain('Comunicación');
  });

  it('resueltos no cuentan para la carga', () => {
    const s = buildExecutiveSummary([
      sym({ system_key: 'transporte', severity: 5, status: 'resolved' }),
      sym({ system_key: 'defensa', severity: 1 }),
    ]);
    expect(s.focusSystem).toBe('defensa');
    expect(s.totalResolved).toBe(1);
  });

  it('singular/plural correcto', () => {
    expect(buildExecutiveSummary([sym({})]).headline).toContain('1 síntoma activo');
    expect(buildExecutiveSummary([sym({ id: 'a' }), sym({ id: 'b' })]).headline)
      .toContain('2 síntomas activos');
  });
});
