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
  resolveInterventionTimeEx,
  assignInterventionTimes,
  planAgendaCleanup,
  normalizeConceptName,
  canonicalConcept,
  validatedSchedule,
  computeBreakFastTime,
  fastingHoursFromKey,
  buildDesiredInterventionEvents,
  interventionAgendaItems,
  desiredInterventionEvents,
  planInterventionEventSync,
  agendaEventKey,
  INTERVENTION_ITEM_PREFIX,
  MIN_SOLAR_TIME,
  STAGGER_MINUTES,
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

  it('A.2: filas duplicadas del mismo key → la ACTIVA gana el slot, la inactiva no revive', () => {
    const existing = [
      evRow({ id: 'ev-dup-inactiva', name: 'Grounding 10-15 min', time: '06:00', intervention_key: 'grounding', is_active: false }),
      evRow({ id: 'ev-viva', name: 'Grounding 10-15 min', time: anchors.morning, intervention_key: 'grounding' }),
    ];
    const plan = planInterventionEventSync(existing, desired.filter(d => d.intervention_key === 'grounding'), new Set());
    expect(plan.reactivations).toHaveLength(0);
    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toHaveLength(0);
  });

  it('A.2: guard de concepto en reactivations — desactivada por cleanup (el viejo gana) NO flapea', () => {
    const existing = [
      evRow({ id: 'ev-manual', name: 'Grounding 10-15 min', time: '09:00', source: 'manual', intervention_key: null }),
      evRow({ id: 'ev-iv', name: 'Grounding 10-15 min', time: anchors.morning, intervention_key: 'grounding', is_active: false }),
    ];
    const plan = planInterventionEventSync(existing, desired.filter(d => d.intervention_key === 'grounding'), new Set());
    expect(plan.reactivations).toHaveLength(0);
    expect(plan.inserts).toHaveLength(0);
  });
});

// ── A.2 megahotfix 3ra pasada: calibración de tiempos ────────────────────────

describe('clamp solar (sol nunca antes del amanecer razonable)', () => {
  // León: wake 05:30 → morning 06:00, ANTES del piso solar 06:30.
  const lionAnchors = anchorTimes({ wake_time: null, sleep_time: null }, 'lion');

  it('ancla de máquina antes de 06:30 → se clampa a 06:30', () => {
    const sol = resolved('exposicion_solar_matutina', 'Exposición solar matutina');
    expect(lionAnchors.morning).toBe('06:00');
    expect(resolveInterventionTime(sol, lionAnchors)).toBe(MIN_SOLAR_TIME);
  });

  it('computed_time (máquina) antes de 06:30 → también se clampa', () => {
    const sol = resolved('exposicion_solar_matutina', 'Exposición solar matutina', { computed_time: '05:45' });
    expect(resolveInterventionTime(sol, lionAnchors)).toBe(MIN_SOLAR_TIME);
  });

  it('custom_time del user es SAGRADO: 05:45 explícito no se clampa', () => {
    const sol = resolved('exposicion_solar_matutina', 'Exposición solar matutina', { custom_time: '05:45' });
    const r = resolveInterventionTimeEx(sol, lionAnchors);
    expect(r.time).toBe('05:45');
    expect(r.userLocked).toBe(true);
  });

  it('el clamp no toca intervenciones no-solares madrugadoras', () => {
    const iv = resolved('suplementos_am', 'Suplementos AM', { computed_time: '06:00' });
    expect(resolveInterventionTime(iv, lionAnchors)).toBe('06:00');
  });
});

describe('assignInterventionTimes (stagger de simultáneos)', () => {
  const lionAnchors = anchorTimes({ wake_time: null, sleep_time: null }, 'lion');

  it('agua+sol+sups cayendo juntos → se espacian a STAGGER_MINUTES, nunca simultáneos', () => {
    const list = [
      resolved('exposicion_solar_matutina', 'Exposición solar matutina'),
      resolved('hidratacion_matutina', 'Hidratación matutina'),
      resolved('suplementos_am', 'Suplementos AM'),
    ];
    const times = [...assignInterventionTimes(list, lionAnchors).values()];
    expect(new Set(times).size).toBe(times.length); // sin colisiones
    times.forEach(t => expect(t).toMatch(/^\d{2}:\d{2}$/));
  });

  it('determinístico: mismo set activo → mismas horas en cada corrida (idempotente)', () => {
    const list = [
      resolved('exposicion_solar_matutina', 'Exposición solar matutina'),
      resolved('hidratacion_matutina', 'Hidratación matutina'),
      resolved('suplementos_am', 'Suplementos AM'),
    ];
    const a = assignInterventionTimes(list, lionAnchors);
    const b = assignInterventionTimes([...list].reverse(), lionAnchors);
    expect(Object.fromEntries(a)).toEqual(Object.fromEntries(b));
  });

  it('custom_time del user ocupa slot fijo; las de máquina se corren alrededor', () => {
    const list = [
      resolved('hidratacion_matutina', 'Hidratación matutina', { custom_time: '06:00' }),
      resolved('suplementos_am', 'Suplementos AM', { computed_time: '06:00' }),
    ];
    const times = assignInterventionTimes(list, lionAnchors);
    expect(times.get('uid-hidratacion_matutina')).toBe('06:00');
    expect(times.get('uid-suplementos_am')).toBe(shiftMinutes('06:00', STAGGER_MINUTES));
  });

  it('desiredInterventionEvents hereda el stagger (nunca 2 eventos a la misma hora de máquina)', () => {
    const desired = desiredInterventionEvents(
      [
        resolved('exposicion_solar_matutina', 'Exposición solar matutina'),
        resolved('hidratacion_matutina', 'Hidratación matutina'),
        resolved('suplementos_am', 'Suplementos AM'),
      ],
      lionAnchors,
    );
    const times = desired.map(d => d.time);
    expect(new Set(times).size).toBe(times.length);
  });
});

// ── A.2: limpieza de duplicados históricos ───────────────────────────────────

describe('planAgendaCleanup', () => {
  it('sol 3× con el mismo intervention_key → sobreviven 0 duplicados (queda 1)', () => {
    const rows = [
      evRow({ id: 'sol-1', name: 'Exposición solar matutina', time: '06:00', intervention_key: 'exposicion_solar_matutina' }),
      evRow({ id: 'sol-2', name: 'Exposición solar matutina', time: '06:00', intervention_key: 'exposicion_solar_matutina' }),
      evRow({ id: 'sol-3', name: 'Exposición solar matutina', time: '06:30', intervention_key: 'exposicion_solar_matutina' }),
    ];
    const out = planAgendaCleanup(rows);
    expect(out).toHaveLength(2);
    expect(out).not.toContain('sol-1'); // empate de fuente → primera (más vieja) gana
  });

  it('mismo concepto + misma hora entre fuentes → gana la de mayor prioridad (protocol > intervention)', () => {
    const rows = [
      evRow({ id: 'agua-iv', name: 'Hidratación matutina', time: '06:15', intervention_key: 'hidratacion_matutina' }),
      evRow({ id: 'agua-prot', name: 'HIDRATACIÓN matutina', time: '06:15', source: 'protocol', intervention_key: null }),
    ];
    const out = planAgendaCleanup(rows);
    expect(out).toEqual(['agua-iv']);
  });

  it('multi-dosis legítima: mismo concepto de protocolo a horas DISTINTAS no se toca', () => {
    const rows = [
      evRow({ id: 'agua-1', name: 'Agua', time: '08:00', source: 'protocol', intervention_key: null }),
      evRow({ id: 'agua-2', name: 'Agua', time: '12:00', source: 'protocol', intervention_key: null }),
      evRow({ id: 'agua-3', name: 'Agua', time: '16:00', source: 'protocol', intervention_key: null }),
    ];
    expect(planAgendaCleanup(rows)).toEqual([]);
  });

  it('pase 3: zombie de protocolo con concepto gestionado por Mi Protocolo → se desactiva aunque esté a otra hora', () => {
    const rows = [
      evRow({ id: 'sol-zombie', name: 'Exposición solar matutina', time: '06:00', source: 'protocol', intervention_key: null }),
      evRow({ id: 'sol-iv', name: 'Exposición solar matutina', time: '06:30', intervention_key: 'exposicion_solar_matutina' }),
    ];
    const out = planAgendaCleanup(rows, new Set([canonicalConcept('Exposición solar matutina')]));
    expect(out).toEqual(['sol-zombie']);
  });

  it('1.5-C cross-vocabulario: "Luz solar" (protocolo) y "Exposición solar matutina" (intervención) son la MISMA familia', () => {
    const rows = [
      evRow({ id: 'luz-prot', name: 'Luz solar', time: '06:00', source: 'protocol', intervention_key: null }),
      evRow({ id: 'sol-iv', name: 'Exposición solar matutina (Fitzpatrick)', time: '06:30', intervention_key: 'exposicion_solar_matutina' }),
    ];
    // familia gestionada por Mi Protocolo → la intervención (timing calibrado) gana
    const out = planAgendaCleanup(rows, new Set(['sol']));
    expect(out).toEqual(['luz-prot']);
    // sin gestión → el viejo gana (doctrina sync)
    const out2 = planAgendaCleanup(rows);
    expect(out2).toEqual(['sol-iv']);
  });

  it('1.5-C suplementos ×3 a la misma hora → queda 1', () => {
    const rows = [
      evRow({ id: 's1', name: 'Suplementos', time: '06:00', source: 'protocol', intervention_key: null }),
      evRow({ id: 's2', name: 'Suplementos', time: '06:00', source: 'protocol', intervention_key: null }),
      evRow({ id: 's3', name: 'Tomar suplementos', time: '06:00', source: 'protocol', intervention_key: null }),
    ];
    const out = planAgendaCleanup(rows);
    expect(out).toHaveLength(2);
  });

  it('1.5-C presupuesto de familia: hidratación permite hasta 5 dosis, romper ayuno solo 1', () => {
    const agua = [1, 2, 3, 4].map((i) =>
      evRow({ id: `agua-${i}`, name: 'Hidratación', time: `0${i + 6}:00`, source: 'protocol', intervention_key: null }));
    const ayuno = [1, 2, 3].map((i) =>
      evRow({ id: `ayuno-${i}`, name: 'Romper ayuno', time: `1${i}:00`, source: 'protocol', intervention_key: null }));
    const out = planAgendaCleanup([...agua, ...ayuno]);
    expect(out.filter(id => id.startsWith('agua'))).toHaveLength(0); // 4 ≤ 5
    expect(out.filter(id => id.startsWith('ayuno'))).toHaveLength(2); // 3 → 1
  });
});

// ── 1.5-C: motor inteligente ─────────────────────────────────────────────────

describe('canonicalConcept (familias cross-vocabulario)', () => {
  it('agrupa sinónimos reales del device test', () => {
    expect(canonicalConcept('Luz solar')).toBe('sol');
    expect(canonicalConcept('Exposición solar matutina (Fitzpatrick)')).toBe('sol');
    expect(canonicalConcept('Suplementos AM')).toBe('suplementos');
    expect(canonicalConcept('Tomar suplementos')).toBe('suplementos');
    expect(canonicalConcept('Hidratación matutina 500 ml')).toBe('hidratacion');
    expect(canonicalConcept('Agua')).toBe('hidratacion');
    expect(canonicalConcept('Romper ayuno (16:8)')).toBe('romper_ayuno');
    expect(canonicalConcept('Ayuno 16:8 con carbos densos en cena')).toBe('romper_ayuno');
    expect(canonicalConcept('Hora de dormir')).toBe('dormir');
    expect(canonicalConcept('Despertar')).toBe('despertar');
  });

  it('pantallas y lentes NO caen en la familia dormir aunque digan "antes de dormir"', () => {
    expect(canonicalConcept('Pantallas off 30 min antes de dormir')).toBe('pantallas');
    expect(canonicalConcept('Lentes rojos 2h antes de dormir')).toBe('lentes_rojos');
  });

  it('nombre sin familia → su propio normalizado (no colapsa con otros)', () => {
    expect(canonicalConcept('Sauna 20 min')).toBe('sauna 20 min');
  });
});

describe('validatedSchedule (cronotipo respetado)', () => {
  it('guard doc: lobo con wake almacenado 05:30 (dato roto) → default del tipo, >= 07:30', () => {
    const s = validatedSchedule({ wake_time: '05:30', sleep_time: '23:00' }, 'wolf');
    expect(s.wake_time).toBe('08:00');
    expect(s.wake_time >= '07:30').toBe(true);
  });

  it('oso con wake 05:30 (el bug del device) → 07:00, no se fuerza madrugada', () => {
    const s = validatedSchedule({ wake_time: '05:30', sleep_time: '23:00' }, 'bear');
    expect(s.wake_time).toBe('07:00');
  });

  it('valores dentro de tolerancia (±60) se respetan: oso 06:30 OK', () => {
    const s = validatedSchedule({ wake_time: '06:30', sleep_time: '22:30' }, 'oso');
    expect(s.wake_time).toBe('06:30');
    expect(s.sleep_time).toBe('22:30');
  });

  it('lobo sleep 00:00 default con wrap: 23:30 almacenado está a 30 min → se respeta', () => {
    const s = validatedSchedule({ wake_time: null, sleep_time: '23:30' }, 'lobo');
    expect(s.sleep_time).toBe('23:30');
  });

  it('delfín NO es cronotipo → valida contra su madre (oso)', () => {
    const s = validatedSchedule({ wake_time: '05:00', sleep_time: null }, 'dolphin');
    expect(s.wake_time).toBe('07:00');
  });
});

describe('computeBreakFastTime (romper ayuno dinámico)', () => {
  it('con fasting_log real: start 20:30 + 16h → 12:30, no estimado', () => {
    const r = computeBreakFastTime('2026-07-13T20:30:00', 16);
    expect(r.time).toBe('12:30');
    expect(r.estimated).toBe(false);
  });

  it('guard doc: sin fasting_logs → 12:00 (cena 20:00 + 16h) con estimated', () => {
    const r = computeBreakFastTime(null, 16);
    expect(r.time).toBe('12:00');
    expect(r.estimated).toBe(true);
  });

  it('horas inválidas → default 16', () => {
    expect(computeBreakFastTime(null, NaN).time).toBe('12:00');
    expect(computeBreakFastTime(null, 0).time).toBe('12:00');
  });

  it('fastingHoursFromKey extrae del catálogo', () => {
    expect(fastingHoursFromKey('ayuno_16_8')).toBe(16);
    expect(fastingHoursFromKey('ayuno_20_4_omad')).toBe(20);
    expect(fastingHoursFromKey('grounding')).toBeNull();
  });
});

describe('buildDesiredInterventionEvents (1.5-C)', () => {
  const anchors = anchorTimes({ wake_time: '07:00', sleep_time: '23:00' }, 'bear');

  it('guard doc: misma intervención 3× → 1 solo evento deseado', () => {
    const iv = resolved('grounding', 'Grounding 10-15 min');
    const { events } = buildDesiredInterventionEvents([iv, iv, iv], anchors);
    expect(events).toHaveLength(1);
  });

  it('ayuno activo + breakFast dinámico → evento "Romper ayuno (16:8)" a la hora real', () => {
    const iv = resolved('ayuno_16_8', 'Ayuno 16:8 con carbos densos en cena');
    const { events } = buildDesiredInterventionEvents([iv], anchors, {
      breakFast: { time: '12:30', estimated: false },
    });
    expect(events[0].name).toBe('Romper ayuno (16:8)');
    expect(events[0].time).toBe('12:30');
  });

  it('guard doc: sin fasting_logs → label estimado en el nombre', () => {
    const iv = resolved('ayuno_16_8', 'Ayuno 16:8 con carbos densos en cena');
    const { events } = buildDesiredInterventionEvents([iv], anchors, {
      breakFast: { time: '12:00', estimated: true },
    });
    expect(events[0].name).toContain('estimado');
  });

  it('custom_time del user gana al cálculo dinámico del ayuno', () => {
    const iv = resolved('ayuno_16_8', 'Ayuno 16:8', { custom_time: '13:15' });
    const { events } = buildDesiredInterventionEvents([iv], anchors, {
      breakFast: { time: '12:00', estimated: true },
    });
    expect(events[0].time).toBe('13:15');
  });

  it('techo 15: universales P1 nunca se descartan; el resto se reporta', () => {
    const universals = Array.from({ length: 5 }, (_, i) =>
      resolved(`uni-${i}`, `Universal ${i}`, { is_universal: true, priority: 1 }));
    const extras = Array.from({ length: 15 }, (_, i) =>
      resolved(`extra-${i}`, `Extra ${i}`, { priority: 2 }));
    const { events, discardedKeys } = buildDesiredInterventionEvents([...extras, ...universals], anchors);
    expect(events).toHaveLength(15);
    expect(discardedKeys).toHaveLength(5);
    const names = events.map(e => e.name);
    for (let i = 0; i < 5; i++) expect(names).toContain(`Universal ${i}`);
  });

  it('hidratación matutina va a wake+15 (antes del ancla morning wake+30)', () => {
    const iv = resolved('hidratacion_matutina', 'Hidratación matutina 500 ml');
    const { events } = buildDesiredInterventionEvents([iv], anchors);
    expect(events[0].time).toBe('07:15'); // wake 07:00 + 15
  });

  it('guard doc clamp: wake 05:00 (león) → sol nunca antes de 06:30', () => {
    const lionAnchors = anchorTimes({ wake_time: '05:00', sleep_time: '21:30' }, 'lion');
    const sol = resolved('exposicion_solar_matutina', 'Exposición solar matutina');
    const { events } = buildDesiredInterventionEvents([sol], lionAnchors);
    expect(events[0].time >= '06:30').toBe(true);
  });

  it('pase 3 sin desiredConcepts (flag OFF hipotético) → no toca protocolo', () => {
    const rows = [
      evRow({ id: 'sol-prot', name: 'Exposición solar matutina', time: '06:00', source: 'protocol', intervention_key: null }),
    ];
    expect(planAgendaCleanup(rows)).toEqual([]);
  });

  it('manual y manual_override JAMÁS se desactivan (ni por dupes ni por pase 3)', () => {
    const rows = [
      evRow({ id: 'm-1', name: 'Sol', time: '07:00', source: 'manual_override', intervention_key: 'exposicion_solar_matutina' }),
      evRow({ id: 'm-2', name: 'Sol', time: '07:00', source: 'manual', intervention_key: null }),
      evRow({ id: 'iv', name: 'Sol', time: '07:00', intervention_key: 'exposicion_solar_matutina' }),
    ];
    const out = planAgendaCleanup(rows, new Set([normalizeConceptName('Sol')]));
    expect(out).not.toContain('m-1');
    expect(out).not.toContain('m-2');
    expect(out).toContain('iv'); // pierde por key contra el override y por concepto+hora
  });

  it('inactivas se ignoran (no compiten ni se re-desactivan)', () => {
    const rows = [
      evRow({ id: 'muerta', name: 'Sol', time: '06:00', intervention_key: 'exposicion_solar_matutina', is_active: false }),
      evRow({ id: 'viva', name: 'Sol', time: '06:30', intervention_key: 'exposicion_solar_matutina' }),
    ];
    expect(planAgendaCleanup(rows)).toEqual([]);
  });

  it('escenario device: 5 universales P1 duplicados 3× → quedan exactamente 5 activos', () => {
    const keys = ['sol', 'agua', 'sups', 'lentes', 'grounding'];
    const rows: AgendaEventRowLike[] = [];
    for (const k of keys) {
      for (let i = 0; i < 3; i++) {
        rows.push(evRow({ id: `${k}-${i}`, name: `Intervención ${k}`, time: '06:00', intervention_key: k }));
      }
    }
    const out = planAgendaCleanup(rows);
    expect(out).toHaveLength(10); // 15 filas − 5 supervivientes
    const vivos = rows.filter(r => !out.includes(r.id));
    expect(new Set(vivos.map(r => r.intervention_key)).size).toBe(5);
  });
});
