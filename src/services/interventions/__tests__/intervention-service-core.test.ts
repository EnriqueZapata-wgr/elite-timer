import { describe, it, expect } from 'vitest';
import {
  planSuggestedInserts,
  planComputedTimeUpdates,
  resolveRows,
  sortProtocol,
  sortSuggested,
  effectiveTime,
  isValidHHMM,
  type UserInterventionRow,
} from '../intervention-service-core';
import { matchInterventions } from '../intervention-engine-core';
import type { DxRoot } from '../intervention-engine-core';

const USER = 'user-1';

function row(partial: Partial<UserInterventionRow> & { intervention_key: string }): UserInterventionRow {
  return {
    id: `id-${partial.intervention_key}`,
    user_id: USER,
    status: 'suggested',
    priority: 2,
    source_dx_id: null,
    is_custom: false,
    is_universal: false,
    custom_definition: null,
    custom_time: null,
    computed_time: null,
    custom_notes: null,
    custom_dose: null,
    activated_at: null,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    ...partial,
  };
}

describe('planSuggestedInserts', () => {
  const dx: DxRoot[] = [{ root_key: 'resistencia_insulina', severity: 4 }];
  const match = matchInterventions(dx);
  const schedule = { wake_time: '07:00', sleep_time: '23:00' };

  it('inserta los 7 universales + sugeridas del match cuando el user no tiene nada', () => {
    const inserts = planSuggestedInserts(USER, match, [], 'dx-1', schedule);
    const universals = inserts.filter(i => i.is_universal);
    expect(universals).toHaveLength(7);
    // todas entran como suggested (el user activa — doctrina)
    for (const i of inserts) expect(i.status).toBe('suggested');
    // las curadas llevan el DX que las originó; las universales no
    for (const i of inserts) {
      expect(i.source_dx_id).toBe(i.is_universal ? null : 'dx-1');
    }
    // hay al menos una curada del match (ayunos matchean resistencia_insulina)
    expect(inserts.some(i => !i.is_universal)).toBe(true);
  });

  it('universales circadianos llevan computed_time del cronotipo (sleep = 60 min antes)', () => {
    const inserts = planSuggestedInserts(USER, match, [], null, schedule);
    const dormir = inserts.find(i => i.intervention_key === 'recordatorio_dormir');
    const comer = inserts.find(i => i.intervention_key === 'recordatorio_comer');
    expect(dormir?.computed_time).toBe('22:00');
    expect(comer?.computed_time).toBe('07:00');
  });

  it('sin cronotipo → computed_time null (no revienta)', () => {
    const inserts = planSuggestedInserts(USER, match, [], null, {});
    const dormir = inserts.find(i => i.intervention_key === 'recordatorio_dormir');
    expect(dormir?.computed_time).toBeNull();
  });

  it('idempotente: NO re-inserta keys existentes (dismissed no renace)', () => {
    const existing = ['hidratacion_matutina', 'ayuno_16_8'];
    const inserts = planSuggestedInserts(USER, match, existing, 'dx-1', schedule);
    for (const k of existing) {
      expect(inserts.some(i => i.intervention_key === k)).toBe(false);
    }
  });

  it('con todo existente → cero inserts', () => {
    const all = planSuggestedInserts(USER, match, [], 'dx-1', schedule).map(i => i.intervention_key);
    expect(planSuggestedInserts(USER, match, all, 'dx-1', schedule)).toHaveLength(0);
  });
});

describe('planComputedTimeUpdates', () => {
  it('actualiza solo universales circadianos cuyo horario cambió', () => {
    const rows = [
      row({ intervention_key: 'recordatorio_dormir', is_universal: true, computed_time: '21:00' }),
      row({ intervention_key: 'recordatorio_comer', is_universal: true, computed_time: '07:00' }),
      row({ intervention_key: 'hidratacion_matutina', is_universal: true }), // no circadiano
      row({ intervention_key: 'ayuno_16_8' }),                               // curada
    ];
    const updates = planComputedTimeUpdates(rows, { wake_time: '07:00', sleep_time: '23:00' });
    // dormir: 23:00 - 60 = 22:00 ≠ 21:00 → update; comer: 07:00 = 07:00 → sin update
    expect(updates).toEqual([{ id: 'id-recordatorio_dormir', computed_time: '22:00' }]);
  });

  it('customs nunca se tocan', () => {
    const rows = [
      row({ intervention_key: 'recordatorio_dormir', is_universal: true, is_custom: true, computed_time: '20:00' }),
    ];
    expect(planComputedTimeUpdates(rows, { sleep_time: '23:00' })).toHaveLength(0);
  });
});

describe('resolveRows + orden', () => {
  it('descarta filas irresolubles (key desconocido sin custom_definition)', () => {
    const rows = [
      row({ intervention_key: 'hidratacion_matutina' }),
      row({ intervention_key: 'key_fantasma' }),
    ];
    const resolved = resolveRows(rows);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].def.key).toBe('hidratacion_matutina');
  });

  it('resuelve customs desde custom_definition', () => {
    const rows = [
      row({
        intervention_key: 'custom_abc',
        is_custom: true,
        custom_definition: { name: 'Mi ritual', how: 'x', benefit: 'y', categories: ['ritual'], roots: [] },
      }),
    ];
    const resolved = resolveRows(rows);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].def.isCustom).toBe(true);
  });

  it('adjunta el score del motor a las sugeridas curadas', () => {
    const match = matchInterventions([{ root_key: 'resistencia_insulina', severity: 5 }]);
    const rows = [row({ intervention_key: 'ayuno_16_8' })];
    const resolved = resolveRows(rows, match);
    expect(resolved[0].score).toBeGreaterThan(0);
  });

  it('sortProtocol: semáforo asc (🔴 antes que 🟢), luego nombre', () => {
    const list = resolveRows([
      row({ intervention_key: 'ayuno_18_6', priority: 3 }),
      row({ intervention_key: 'hidratacion_matutina', priority: 1, is_universal: true }),
      row({ intervention_key: 'ayuno_16_8', priority: 2 }),
    ]);
    const sorted = sortProtocol(list);
    expect(sorted.map(x => x.row.priority)).toEqual([1, 2, 3]);
  });

  it('sortSuggested: universales (base) primero, curadas por score desc', () => {
    const match = matchInterventions([
      { root_key: 'resistencia_insulina', severity: 5 },
      { root_key: 'deficit_sueno_profundo', severity: 5 },
    ]);
    const list = resolveRows([
      row({ intervention_key: 'ayuno_18_6', priority: 3 }),
      row({ intervention_key: 'ayuno_16_8', priority: 2 }),
      // Catálogo v3 (cc12ceb): key renombrada grounding → grounding_earthing.
      row({ intervention_key: 'grounding_earthing', priority: 1, is_universal: true }),
    ], match);
    const sorted = sortSuggested(list);
    expect(sorted[0].row.intervention_key).toBe('grounding_earthing'); // base universal primero
    // curadas: 16:8 (P2, 2 raíces) sobre 18:6 (P3)
    expect(sorted[1].row.intervention_key).toBe('ayuno_16_8');
    expect(sorted[1].score).toBeGreaterThan(sorted[2].score);
  });
});

describe('helpers', () => {
  it('effectiveTime: custom gana a computed', () => {
    expect(effectiveTime({ custom_time: '21:00', computed_time: '22:00' })).toBe('21:00');
    expect(effectiveTime({ custom_time: null, computed_time: '22:00' })).toBe('22:00');
    expect(effectiveTime({ custom_time: null, computed_time: null })).toBeNull();
  });

  it('isValidHHMM', () => {
    expect(isValidHHMM('21:30')).toBe(true);
    expect(isValidHHMM('7:05')).toBe(true);
    expect(isValidHHMM('24:00')).toBe(false);
    expect(isValidHHMM('21:75')).toBe(false);
    expect(isValidHHMM('nope')).toBe(false);
  });
});
