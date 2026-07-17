/**
 * user-symptoms-core — guard del modelo unificado (B3). Cubre duración,
 * validación, partición y la reconstrucción de los 2 conjuntos del DX.
 */
import { describe, it, expect } from 'vitest';
import {
  durationDays, durationLabel, validateSymptomInput, partitionByStatus,
  groupBySystem, dxSystemSymptoms, dxAisladoSymptoms, type UserSymptom,
} from '../user-symptoms-core';

const NOW = new Date('2026-07-16T12:00:00Z');

function sym(p: Partial<UserSymptom> & { id: string }): UserSymptom {
  return {
    id: p.id, user_id: 'u1', name: p.name ?? 'Fatiga', severity: p.severity ?? 3,
    system_key: p.system_key ?? null, started_at: p.started_at ?? '2026-07-16T00:00:00Z',
    resolved_at: p.resolved_at ?? null, is_active: p.is_active ?? true,
    note: p.note ?? null, source_kind: p.source_kind ?? 'aislado',
    created_at: p.started_at ?? '2026-07-16T00:00:00Z', updated_at: p.started_at ?? '2026-07-16T00:00:00Z',
  };
}

describe('durationDays / durationLabel', () => {
  it('activo: desde started_at hasta ahora', () => {
    const s = sym({ id: '1', started_at: '2026-07-13T12:00:00Z' });
    expect(durationDays(s, NOW)).toBe(3);
    expect(durationLabel(s, NOW)).toBe('3 días');
  });
  it('resuelto: usa resolved_at (Gripa · 3 días)', () => {
    const s = sym({ id: '2', started_at: '2026-07-10T12:00:00Z', resolved_at: '2026-07-13T12:00:00Z', is_active: false });
    expect(durationDays(s, NOW)).toBe(3);
    expect(durationLabel(s, NOW)).toBe('3 días');
  });
  it('hoy / semanas / meses', () => {
    expect(durationLabel(sym({ id: '3', started_at: '2026-07-16T06:00:00Z' }), NOW)).toBe('hoy');
    expect(durationLabel(sym({ id: '4', started_at: '2026-06-26T12:00:00Z' }), NOW)).toBe('2 semanas');
    expect(durationLabel(sym({ id: '5', started_at: '2026-05-01T12:00:00Z' }), NOW)).toBe('2 meses');
  });
});

describe('validateSymptomInput', () => {
  it('nombre vacío / severidad fuera de rango → error', () => {
    expect(validateSymptomInput({ name: '', severity: 3 }).ok).toBe(false);
    expect(validateSymptomInput({ name: 'Fatiga', severity: 6 }).ok).toBe(false);
    expect(validateSymptomInput({ name: 'Fatiga', severity: 3 }).ok).toBe(true);
  });
});

describe('partitionByStatus', () => {
  it('activos por severidad desc, resueltos por fecha desc', () => {
    const list = [
      sym({ id: 'a', is_active: true, severity: 2 }),
      sym({ id: 'b', is_active: true, severity: 5 }),
      sym({ id: 'c', is_active: false, resolved_at: '2026-07-15T00:00:00Z' }),
    ];
    const { active, resolved } = partitionByStatus(list);
    expect(active.map(s => s.id)).toEqual(['b', 'a']);
    expect(resolved.map(s => s.id)).toEqual(['c']);
  });
});

describe('groupBySystem (los sueltos NO cuentan)', () => {
  it('solo agrupa los que tienen system_key', () => {
    const g = groupBySystem([
      sym({ id: '1', system_key: 'energia' }),
      sym({ id: '2', system_key: 'energia' }),
      sym({ id: '3', system_key: null }),
    ]);
    expect(g.energia).toHaveLength(2);
    expect(Object.keys(g)).toEqual(['energia']);
  });
});

describe('reconstrucción DX (crítico · no romper el diagnóstico)', () => {
  const list = [
    sym({ id: 's1', system_key: 'energia', is_active: true, source_kind: 'sistema', name: 'Fatiga' }),
    sym({ id: 's2', system_key: 'defensa', is_active: false, source_kind: 'sistema', name: 'Resuelto' }), // no activo
    sym({ id: 'a1', system_key: null, source_kind: 'aislado', name: 'Niebla mental', started_at: '2026-07-16T10:00:00Z' }),
    sym({ id: 'a2', system_key: null, source_kind: 'aislado', name: 'Mareo', started_at: '2026-07-15T10:00:00Z' }),
  ];
  it('dxSystemSymptoms: solo activos CON sistema (peso medio)', () => {
    const r = dxSystemSymptoms(list);
    expect(r).toEqual([{ name: 'Fatiga', system_key: 'energia', severity: 3 }]);
  });
  it('dxAisladoSymptoms: los sueltos recientes primero (peso bajo)', () => {
    const r = dxAisladoSymptoms(list);
    expect(r.map(x => x.tag)).toEqual(['Niebla mental', 'Mareo']);
  });
  it('el conteo total del DX = activos-por-sistema + aislados (semántica preservada)', () => {
    expect(dxSystemSymptoms(list).length + dxAisladoSymptoms(list).length).toBe(3);
  });
});
