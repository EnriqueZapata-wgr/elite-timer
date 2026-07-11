/**
 * DX F4 — tests del swap HOY/AGENDA (núcleo puro).
 *  · doble-lectura del flag (selectAgendaDrivers: flag OFF = status quo),
 *  · anclas por cronotipo (3 tipos; dolphin legacy → oso),
 *  · timing: effectiveTime (custom > computed) > ancla por timeOfDay,
 *  · conversión intervención → AgendaItem (dedup por concepto),
 *  · reconciliación agenda_events (insert/update/reactivar/desactivar/override).
 */
import { describe, it, expect } from 'vitest';
import {
  selectAgendaDrivers,
  normalizeChronotype,
  anchorTimes,
  shiftMinutes,
  resolveInterventionTime,
  normalizeConceptName,
  interventionAgendaItems,
  desiredInterventionEvents,
  planInterventionEventSync,
  agendaEventKey,
  INTERVENTION_ITEM_PREFIX,
  type AgendaEventRowLike,
  type DesiredInterventionEvent,
} from '../intervention-agenda-core';
import type { ResolvedUserIntervention, UserInterventionRow } from '../intervention-service-core';
import type { ResolvedInterventionDef } from '../intervention-engine-core';
import { INTERVENTIONS_CATALOG } from '@/src/constants/interventions-catalog';

// ── helpers ──────────────────────────────────────────────────────────────────

function row(partial: Partial<UserInterventionRow> & { intervention_key: string }): UserInterventionRow {
  return {
    id: `uid-${partial.intervention_key}`,
    user_id: 'user-1',
    status: 'active',
    priority: 1,
    source_dx_id: null,
    is_custom: false,
    is_universal: false,
    custom_definition: null,
    custom_time: null,
    computed_time: null,
    custom_notes: null,
    custom_dose: null,
    activated_at: '2026-07-10T00:00:00Z',
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    ...partial,
  };
}

function resolved(
  key: string,
  name: string,
  opts: Partial<UserInterventionRow> = {},
  defOverrides: Partial<ResolvedInterventionDef> = {},
): ResolvedUserIntervention {
  return {
    row: row({ intervention_key: key, ...opts }),
    def: {
      key, name,
      how: '', benefit: '',
      categories: (defOverrides.categories ?? ['sueno']) as any,
      roots: [], isCustom: false,
      ...defOverrides,
    },
    score: 0,
  };
}

function evRow(partial: Partial<AgendaEventRowLike> & { id: string }): AgendaEventRowLike {
  return {
    name: 'Evento',
    time: '07:00',
    source: 'intervention',
    is_active: true,
    intervention_key: null,
    ...partial,
  };
}

// ── doble-lectura del flag ───────────────────────────────────────────────────

describe('selectAgendaDrivers (doble-lectura)', () => {
  it('flag ON → intervenciones drivean, protocolos NO (el swap)', () => {
    expect(selectAgendaDrivers(true)).toEqual({ interventions: true, protocols: false });
  });

  it('flag OFF → status quo exacto: protocolos drivean, intervenciones NO', () => {
    expect(selectAgendaDrivers(false)).toEqual({ interventions: false, protocols: true });
  });
});

// ── cronotipos (SON 3) + anclas ──────────────────────────────────────────────

describe('normalizeChronotype', () => {
  it('mapea los 3 doctrinales (en inglés y español)', () => {
    expect(normalizeChronotype('lion')).toBe('lion');
    expect(normalizeChronotype('León')).toBe('lion');
    expect(normalizeChronotype('wolf')).toBe('wolf');
    expect(normalizeChronotype('Lobo')).toBe('wolf');
    expect(normalizeChronotype('bear')).toBe('bear');
    expect(normalizeChronotype('oso')).toBe('bear');
  });

  it('dolphin (legacy 4to tipo del quiz v1) → bear (equivalente más cercano)', () => {
    expect(normalizeChronotype('dolphin')).toBe('bear');
  });

  it('null/desconocido → bear (default seguro)', () => {
    expect(normalizeChronotype(null)).toBe('bear');
    expect(normalizeChronotype(undefined)).toBe('bear');
    expect(normalizeChronotype('unicornio')).toBe('bear');
  });
});

describe('anchorTimes', () => {
  it('usa el horario real del user cuando existe (oso: wake 07:00 / sleep 23:00)', () => {
    const a = anchorTimes({ wake_time: '07:00', sleep_time: '23:00' }, 'bear');
    expect(a.morning).toBe('07:30');   // wake + 30min
    expect(a.noon).toBe('12:00');      // wake + 5h
    expect(a.afternoon).toBe('16:00'); // wake + 9h
    expect(a.evening).toBe('20:00');   // sleep − 3h
    expect(a.night).toBe('22:00');     // sleep − 60min (SLEEP_PREP_MINUTES)
  });

  it('león sin horario → defaults del cronotipo (05:30/21:30)', () => {
    const a = anchorTimes({ wake_time: null, sleep_time: null }, 'lion');
    expect(a.morning).toBe('06:00');
    expect(a.night).toBe('20:30');
  });

  it('lobo con sleep a medianoche → wrap 24h correcto', () => {
    const a = anchorTimes({ wake_time: null, sleep_time: null }, 'wolf');
    expect(a.evening).toBe('21:00'); // 00:00 − 3h
    expect(a.night).toBe('23:00');   // 00:00 − 60min
  });

  it('dolphin legacy → anclas de oso', () => {
    const dolphin = anchorTimes({ wake_time: null, sleep_time: null }, 'dolphin');
    const bear = anchorTimes({ wake_time: null, sleep_time: null }, 'bear');
    expect(dolphin).toEqual(bear);
  });
});

describe('shiftMinutes', () => {
  it('suma, resta y wrapea', () => {
    expect(shiftMinutes('07:00', 30)).toBe('07:30');
    expect(shiftMinutes('00:30', -60)).toBe('23:30');
    expect(shiftMinutes('23:30', 60)).toBe('00:30');
  });
  it('inválido → null', () => {
    expect(shiftMinutes('no-time', 30)).toBeNull();
    expect(shiftMinutes('25:00', 30)).toBeNull();
  });
});

// ── timing por intervención ──────────────────────────────────────────────────

describe('resolveInterventionTime', () => {
  const anchors = anchorTimes({ wake_time: '07:00', sleep_time: '23:00' }, 'bear');

  it('custom_time gana sobre computed_time (effectiveTime F3)', () => {
    const iv = resolved('recordatorio_dormir', 'Hora de dormir', {
      custom_time: '21:45', computed_time: '22:00',
    });
    expect(resolveInterventionTime(iv, anchors)).toBe('21:45');
  });

  it('computed_time gana sobre el ancla', () => {
    const iv = resolved('recordatorio_dormir', 'Hora de dormir', { computed_time: '22:15' });
    expect(resolveInterventionTime(iv, anchors)).toBe('22:15');
  });

  it('sin hora → ancla por timeOfDay del catálogo (grounding sin timeOfDay → morning)', () => {
    // exposicion_solar_matutina tiene timeOfDay 'morning' en el catálogo
    const sol = resolved('exposicion_solar_matutina', 'Exposición solar matutina (7-9am)');
    expect(resolveInterventionTime(sol, anchors)).toBe(anchors.morning);
    // apagar_pantallas_noche → 'night'
    const pantallas = resolved('apagar_pantallas_noche', 'Apagar pantallas 30 min antes de dormir');
    expect(resolveInterventionTime(pantallas, anchors)).toBe(anchors.night);
  });

  it('circadian sleep sin computed_time ni timeOfDay → ancla night', () => {
    const iv = resolved('recordatorio_dormir', 'Hora de dormir');
    expect(resolveInterventionTime(iv, anchors)).toBe(anchors.night);
  });

  it('key custom (no está en catálogo) sin hora → morning default', () => {
    const iv = resolved('custom-123', 'Mi hábito custom', { is_custom: true });
    expect(resolveInterventionTime(iv, anchors)).toBe(anchors.morning);
  });

  it('normaliza horas de un dígito (7:30 → 07:30)', () => {
    const iv = resolved('grounding', 'Grounding 10-15 min', { custom_time: '7:30' });
    expect(resolveInterventionTime(iv, anchors)).toBe('07:30');
  });

  it('catálogo v3 completo: TODA entrada activa resuelve a un HH:MM válido (timeOfDay/circadian nuevos incluidos)', () => {
    for (const cat of INTERVENTIONS_CATALOG) {
      const iv = resolved(cat.key, cat.name);
      const time = resolveInterventionTime(iv, anchors);
      expect(time, `${cat.key} sin hora resoluble`).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});

// ── intervención → AgendaItem ────────────────────────────────────────────────

describe('interventionAgendaItems', () => {
  const anchors = anchorTimes({ wake_time: '07:00', sleep_time: '23:00' }, 'bear');

  it('produce el shape exacto de AgendaItem con id prefijado y completed de hoy', () => {
    const list = [
      resolved('grounding', 'Grounding 10-15 min', {}, { categories: ['inflamacion', 'energia'] as any }),
      resolved('hidratacion_matutina', 'Hidratación matutina'),
    ];
    const done = new Set(['uid-grounding']);
    const items = interventionAgendaItems(list, anchors, done);
    expect(items).toHaveLength(2);
    const g = items.find(i => i.name === 'Grounding 10-15 min')!;
    expect(g.id).toBe(`${INTERVENTION_ITEM_PREFIX}uid-grounding`);
    expect(g.completed).toBe(true);
    expect(g.subtitle).toBe('Mi Protocolo');
    expect(g.category).toBe('inflamacion');
    expect(g.isNext).toBe(false);
    expect(g.isSmart).toBe(false);
    expect(/^\d{2}:\d{2}$/.test(g.time)).toBe(true);
    const h = items.find(i => i.name === 'Hidratación matutina')!;
    expect(h.completed).toBe(false);
  });

  it('dedup por concepto: si el protocolo ya puso el mismo nombre, la intervención NO duplica', () => {
    const list = [resolved('grounding', 'Grounding 10-15 min')];
    const items = interventionAgendaItems(list, anchors, new Set(), ['GROUNDING 10-15 MIN']);
    expect(items).toHaveLength(0);
  });

  it('dedup interno: dos intervenciones con mismo concepto → una sola', () => {
    const list = [
      resolved('grounding', 'Grounding 10-15 min'),
      resolved('grounding_v2', 'Grounding 10-15 min'),
    ];
    expect(interventionAgendaItems(list, anchors, new Set())).toHaveLength(1);
  });

  it('lista vacía → sin items (catálogo/protocolo vacío degrada sin romper)', () => {
    expect(interventionAgendaItems([], anchors, new Set())).toEqual([]);
  });
});

describe('normalizeConceptName', () => {
  it('lowercase + sin acentos + espacios colapsados', () => {
    expect(normalizeConceptName('  Exposición   SOLAR  ')).toBe('exposicion solar');
    expect(normalizeConceptName('Hidratación')).toBe(normalizeConceptName('hidratacion'));
  });
});

// ── reconciliación agenda_events ─────────────────────────────────────────────

describe('planInterventionEventSync', () => {
  const anchors = anchorTimes({ wake_time: '07:00', sleep_time: '23:00' }, 'bear');
  const desired: DesiredInterventionEvent[] = desiredInterventionEvents(
    [
      resolved('grounding', 'Grounding 10-15 min', {}, { categories: ['inflamacion'] as any }),
      resolved('recordatorio_dormir', 'Hora de dormir', { computed_time: '22:00' }),
    ],
    anchors,
  );

  it('sin filas existentes → inserta todo', () => {
    const plan = planInterventionEventSync([], desired, new Set());
    expect(plan.inserts).toHaveLength(2);
    expect(plan.updates).toHaveLength(0);
    expect(plan.deactivateIds).toHaveLength(0);
  });

  it('idempotente: existentes al día → plan vacío', () => {
    const existing = desired.map((d, i) => evRow({
      id: `ev-${i}`, name: d.name, time: d.time, intervention_key: d.intervention_key,
    }));
    const plan = planInterventionEventSync(existing, desired, new Set());
    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toHaveLength(0);
    expect(plan.reactivations).toHaveLength(0);
    expect(plan.deactivateIds).toHaveLength(0);
  });

  it('custom_time nuevo → update quirúrgico del evento existente', () => {
    const existing = [evRow({ id: 'ev-1', name: 'Hora de dormir', time: '22:00', intervention_key: 'recordatorio_dormir' })];
    const nuevos = desiredInterventionEvents(
      [resolved('recordatorio_dormir', 'Hora de dormir', { custom_time: '21:30', computed_time: '22:00' })],
      anchors,
    );
    const plan = planInterventionEventSync(existing, nuevos, new Set());
    expect(plan.updates).toEqual([{ id: 'ev-1', name: 'Hora de dormir', time: '21:30' }]);
    expect(plan.inserts).toHaveLength(0);
  });

  it('intervención pausada → desactiva su evento (soft, reversible)', () => {
    const existing = [
      evRow({ id: 'ev-1', name: 'Grounding 10-15 min', time: anchors.morning, intervention_key: 'grounding' }),
      evRow({ id: 'ev-2', name: 'Hora de dormir', time: '22:00', intervention_key: 'recordatorio_dormir' }),
    ];
    const soloDormir = desired.filter(d => d.intervention_key === 'recordatorio_dormir');
    const plan = planInterventionEventSync(existing, soloDormir, new Set());
    expect(plan.deactivateIds).toEqual(['ev-1']);
  });

  it('reactivar: evento desactivado + intervención activa de nuevo → reactivación', () => {
    const existing = [evRow({
      id: 'ev-1', name: 'Grounding 10-15 min', time: anchors.morning,
      intervention_key: 'grounding', is_active: false,
    })];
    const plan = planInterventionEventSync(
      existing,
      desired.filter(d => d.intervention_key === 'grounding'),
      new Set(),
    );
    expect(plan.reactivations).toHaveLength(1);
    expect(plan.reactivations[0].id).toBe('ev-1');
    expect(plan.inserts).toHaveLength(0);
  });

  it('manual_override (el user editó el evento): NO se toca ni se desactiva', () => {
    const existing = [evRow({
      id: 'ev-1', name: 'Grounding al gusto', time: '19:00',
      source: 'manual_override', intervention_key: 'grounding',
    })];
    const plan = planInterventionEventSync(existing, desired, new Set());
    expect(plan.updates).toHaveLength(0);
    expect(plan.deactivateIds).toHaveLength(0);
    // grounding no se re-inserta (el override es su representación)
    expect(plan.inserts.map(i => i.intervention_key)).not.toContain('grounding');
  });

  it('disabled (el user lo quitó de la agenda) → no se re-inserta ni reactiva', () => {
    const g = desired.find(d => d.intervention_key === 'grounding')!;
    const disabled = new Set([agendaEventKey(g.name, g.time)]);
    const planInsert = planInterventionEventSync([], desired, disabled);
    expect(planInsert.inserts.map(i => i.intervention_key)).not.toContain('grounding');

    const existing = [evRow({ id: 'ev-1', name: g.name, time: g.time, intervention_key: 'grounding', is_active: false })];
    const planReact = planInterventionEventSync(existing, desired, disabled);
    expect(planReact.reactivations).toHaveLength(0);
  });

  it('carrera protocolo/intervención: evento activo pre-existente con el mismo concepto → no duplica', () => {
    const existing = [evRow({
      id: 'ev-prot', name: 'GROUNDING 10-15 min', time: '09:00',
      source: 'protocol', intervention_key: null,
    })];
    const plan = planInterventionEventSync(existing, desired, new Set());
    expect(plan.inserts.map(i => i.intervention_key)).not.toContain('grounding');
    // el de dormir sí entra (concepto distinto)
    expect(plan.inserts.map(i => i.intervention_key)).toContain('recordatorio_dormir');
    // y el evento de protocolo NO se desactiva (no es source intervention)
    expect(plan.deactivateIds).toHaveLength(0);
  });
});
