import { describe, it, expect } from 'vitest';
import {
  planSuggestedInserts,
  planComputedTimeUpdates,
  resolveRows,
  sortProtocol,
  sortSuggested,
  partitionSuggested,
  orderProtocolForDisplay,
  protocolLoadHint,
  effectiveTime,
  isValidHHMM,
  SUGGESTED_TOP_COUNT,
  esPracticaAsignada,
  esErrorDeColumnaFaltante,
  leerConCaidaDeAsignacion,
  COLUMNAS_FILA,
  COLUMNAS_FILA_SIN_ASIGNACION,
  type RespuestaDeLectura,
  type UserInterventionRow,
  type ResolvedUserIntervention,
} from '../intervention-service-core';
import { matchInterventions } from '../intervention-engine-core';
import type { DxRoot } from '../intervention-engine-core';
import { CLINICAL_VALIDATION_PENDING } from '@/src/constants/interventions-catalog';
import { INTERVENTION_ROOTS } from '@/src/constants/intervention-vocab';

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

  it('gating clínico end-to-end: ninguna pendiente llega a user_interventions vía sync', () => {
    const fullDx: DxRoot[] = INTERVENTION_ROOTS.map(r => ({ root_key: r, severity: 5 }));
    const inserts = planSuggestedInserts(USER, matchInterventions(fullDx), [], 'dx-1', schedule);
    const pendingKeys = new Set(CLINICAL_VALIDATION_PENDING.map(i => i.key));
    for (const ins of inserts) {
      expect(pendingKeys.has(ins.intervention_key), `${ins.intervention_key} pendiente insertada`).toBe(false);
    }
  });

  it('data existente intacta: una pendiente ya activa del user resuelve y ordena normal', () => {
    // El user activó bulletproof_coffee antes del gating → sigue viva en su protocolo.
    const rows = [row({ intervention_key: 'bulletproof_coffee', status: 'active', priority: 2 })];
    const resolved = resolveRows(rows);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].def.name).toBe('Bulletproof coffee');
    expect(sortProtocol(resolved)).toHaveLength(1);
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
    // v4 epigenético: ayuno_16_8 quedó gateado (requiresClinicalValidation) →
    // el motor ya no lo puntúa; 18:6 (misma raíz, no gateado) toma su lugar.
    const match = matchInterventions([{ root_key: 'resistencia_insulina', severity: 5 }]);
    const rows = [row({ intervention_key: 'ayuno_18_6' })];
    const resolved = resolveRows(rows, match);
    expect(resolved[0].score).toBeGreaterThan(0);
  });

  it('gating clínico v4: ayuno_16_8 resuelve (data del user intacta) pero score 0', () => {
    const match = matchInterventions([{ root_key: 'resistencia_insulina', severity: 5 }]);
    const resolved = resolveRows([row({ intervention_key: 'ayuno_16_8' })], match);
    expect(resolved).toHaveLength(1); // el user SÍ puede tenerla activa
    expect(resolved[0].score).toBe(0); // el motor no la sugiere hasta firma clínica
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
      // v4 epigenético: 16:8 gateado → score 0 → cae al final de las curadas.
      row({ intervention_key: 'ayuno_16_8', priority: 2 }),
      // Catálogo v3 (cc12ceb): key renombrada grounding → grounding_earthing.
      row({ intervention_key: 'grounding_earthing', priority: 1, is_universal: true }),
    ], match);
    const sorted = sortSuggested(list);
    expect(sorted[0].row.intervention_key).toBe('grounding_earthing'); // base universal primero
    // curadas: 18:6 (raíz matcheada, score real) sobre 16:8 (gateado, score 0)
    expect(sorted[1].row.intervention_key).toBe('ayuno_18_6');
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

// ── A.3 megahotfix 3ra pasada: motor saturado → top acotado ──────────────────

describe('partitionSuggested', () => {
  const item = (key: string, opts: { universal?: boolean; score?: number; priority?: number } = {}): ResolvedUserIntervention => ({
    row: row({
      intervention_key: key,
      is_universal: opts.universal ?? false,
      priority: opts.priority ?? 2,
    }),
    def: { key, name: key, how: '', benefit: '', categories: ['sueno'] as any, roots: [], isCustom: false },
    score: opts.score ?? 0,
  });

  it('lista corta → todo al top, sin resto', () => {
    const list = [item('a'), item('b', { universal: true })];
    const { top, rest } = partitionSuggested(list);
    expect(top).toHaveLength(2);
    expect(rest).toHaveLength(0);
  });

  it('satura a SUGGESTED_TOP_COUNT: 30 sugeridas → top 12, resto 18 colapsado', () => {
    const list = Array.from({ length: 30 }, (_, i) => item(`iv-${i}`, { score: 30 - i }));
    const { top, rest } = partitionSuggested(list);
    expect(top).toHaveLength(SUGGESTED_TOP_COUNT);
    expect(rest).toHaveLength(30 - SUGGESTED_TOP_COUNT);
    // el top son las de mayor score (orden del motor intacto)
    expect(top[0].row.intervention_key).toBe('iv-0');
    expect(rest[0].score).toBeLessThanOrEqual(top[top.length - 1].score);
  });

  it('universales SIEMPRE en el top, aunque las curadas tengan más score', () => {
    const list = [
      ...Array.from({ length: 15 }, (_, i) => item(`curada-${i}`, { score: 100 - i })),
      ...Array.from({ length: 7 }, (_, i) => item(`universal-${i}`, { universal: true, score: 0, priority: 1 })),
    ];
    const { top, rest } = partitionSuggested(list);
    const topKeys = top.map(t => t.row.intervention_key);
    for (let i = 0; i < 7; i++) expect(topKeys).toContain(`universal-${i}`);
    expect(top).toHaveLength(SUGGESTED_TOP_COUNT); // 7 universales + 5 curadas top
    expect(rest.every(r => !r.row.is_universal)).toBe(true);
  });

  it('más universales que topCount → entran todas igual (jamás se pierden)', () => {
    const list = Array.from({ length: 5 }, (_, i) => item(`u-${i}`, { universal: true }));
    const { top, rest } = partitionSuggested(list, 3);
    expect(top).toHaveLength(5);
    expect(rest).toHaveLength(0);
  });

  it('top + rest reconstruyen la lista completa sin perder ni duplicar', () => {
    const list = Array.from({ length: 25 }, (_, i) => item(`iv-${i}`, { score: i % 7, universal: i % 5 === 0 }));
    const { top, rest } = partitionSuggested(list);
    const all = [...top, ...rest].map(t => t.row.intervention_key).sort();
    expect(all).toEqual(list.map(t => t.row.intervention_key).sort());
  });
});

// ── 1.5-D: universales visibles + umbrales UX progresiva ─────────────────────

describe('orderProtocolForDisplay', () => {
  const item = (key: string, opts: { universal?: boolean; priority?: number } = {}): ResolvedUserIntervention => ({
    row: row({ intervention_key: key, is_universal: opts.universal ?? false, priority: opts.priority ?? 2 }),
    def: { key, name: key, how: '', benefit: '', categories: ['sueno'] as any, roots: [], isCustom: false },
    score: 0,
  });

  it('universales SIEMPRE arriba aunque haya 20 activas con mejor prioridad', () => {
    const list = [
      ...Array.from({ length: 20 }, (_, i) => item(`activa-${i}`, { priority: 1 })),
      ...Array.from({ length: 7 }, (_, i) => item(`uni-${i}`, { universal: true, priority: 1 })),
    ];
    const ordered = orderProtocolForDisplay(list);
    for (let i = 0; i < 7; i++) expect(ordered[i].row.is_universal).toBe(true);
    expect(ordered).toHaveLength(27); // nada se pierde
  });
});

describe('protocolLoadHint (guards doc: 5/8/10)', () => {
  const item = (key: string, universal = false): ResolvedUserIntervention => ({
    row: row({ intervention_key: key, is_universal: universal, priority: 2 }),
    def: { key, name: key, how: '', benefit: '', categories: ['sueno'] as any, roots: [], isCustom: false },
    score: 0,
  });
  const actives = (n: number, universals = 0) => [
    ...Array.from({ length: n }, (_, i) => item(`a-${i}`)),
    ...Array.from({ length: universals }, (_, i) => item(`u-${i}`, true)),
  ];

  it('5 activas → sin hint', () => {
    expect(protocolLoadHint(actives(5)).hint).toBe('none');
  });

  it('8 activas → hint suave', () => {
    expect(protocolLoadHint(actives(8)).hint).toBe('soft');
  });

  it('10 activas → warning claro', () => {
    expect(protocolLoadHint(actives(10)).hint).toBe('strong');
  });

  // HOTFIX 1.5: el umbral cuenta el TOTAL de activas (device test: 5 universales
  // P1 + 2 curadas = 7 → hint). La versión que excluía universales dejaba el
  // hint invisible en el caso real (todo user arranca con 5 universales activas).
  it('universales SÍ cuentan: 2 curadas + 5 universales = 7 → hint suave', () => {
    const r = protocolLoadHint(actives(2, 5));
    expect(r.hint).toBe('soft');
    expect(r.activeCount).toBe(7);
  });

  it('5 curadas + 5 universales = 10 → warning claro', () => {
    expect(protocolLoadHint(actives(5, 5)).hint).toBe('strong');
  });

  it('bordes exactos: 6 → soft, 9 → strong', () => {
    expect(protocolLoadHint(actives(6)).hint).toBe('soft');
    expect(protocolLoadHint(actives(9)).hint).toBe('strong');
  });
});

// ── 8-oct-2026 (nivel 2): prácticas asignadas por el coach (migración 329) ───

const COACH = '90a55e74-0e3d-477a-9ac5-2b339f7c40af';

describe('esPracticaAsignada', () => {
  it('con assigned_by de un coach → asignada', () => {
    expect(esPracticaAsignada(row({ intervention_key: 'grounding_earthing', assigned_by: COACH }))).toBe(true);
  });

  it('assigned_by null → es de la persona o del motor', () => {
    expect(esPracticaAsignada(row({ intervention_key: 'grounding_earthing', assigned_by: null }))).toBe(false);
  });

  it('sin el campo (base anterior a la 329 o lectura con el select viejo) → no asignada', () => {
    const fila = row({ intervention_key: 'grounding_earthing' });
    expect('assigned_by' in fila).toBe(false);
    expect(esPracticaAsignada(fila)).toBe(false);
  });

  it('vacío, espacios o un valor que no es texto → no asignada (nunca se asume)', () => {
    expect(esPracticaAsignada({ assigned_by: '' })).toBe(false);
    expect(esPracticaAsignada({ assigned_by: '   ' })).toBe(false);
    expect(esPracticaAsignada({ assigned_by: 1 as unknown as string })).toBe(false);
    expect(esPracticaAsignada({ assigned_by: true as unknown as string })).toBe(false);
    expect(esPracticaAsignada({})).toBe(false);
    expect(esPracticaAsignada(null)).toBe(false);
    expect(esPracticaAsignada(undefined)).toBe(false);
  });

  it('no mira el status: una asignada en pausa sigue siendo asignada', () => {
    expect(esPracticaAsignada(row({ intervention_key: 'grounding_earthing', status: 'paused', assigned_by: COACH }))).toBe(true);
    expect(esPracticaAsignada(row({ intervention_key: 'grounding_earthing', status: 'active' }))).toBe(false);
  });
});

describe('columnas de la lectura', () => {
  it('el select nuevo es el de siempre más assigned_by, y el de caída no la nombra', () => {
    expect(COLUMNAS_FILA).toBe(`${COLUMNAS_FILA_SIN_ASIGNACION}, assigned_by`);
    expect(COLUMNAS_FILA_SIN_ASIGNACION.includes('assigned_by')).toBe(false);
  });

  it('el select de caída conserva las 16 columnas de la 171', () => {
    expect(COLUMNAS_FILA_SIN_ASIGNACION.split(',').map((c) => c.trim())).toEqual([
      'id', 'user_id', 'intervention_key', 'status', 'priority', 'source_dx_id', 'is_custom', 'is_universal',
      'custom_definition', 'custom_time', 'computed_time', 'custom_notes', 'custom_dose', 'activated_at',
      'created_at', 'updated_at',
    ]);
  });
});

describe('esErrorDeColumnaFaltante', () => {
  it('42703 de PostgREST en un select que nombra la columna', () => {
    expect(esErrorDeColumnaFaltante({ code: '42703', message: 'column user_interventions.assigned_by does not exist' })).toBe(true);
  });

  it('PGRST204 (columna desconocida en el caché de esquema)', () => {
    expect(esErrorDeColumnaFaltante({
      code: 'PGRST204',
      message: "Could not find the 'assigned_by' column of 'user_interventions' in the schema cache",
    })).toBe(true);
  });

  it('sin code pero con el texto del error (como el precedente sinCampos312)', () => {
    expect(esErrorDeColumnaFaltante({ message: "Could not find the 'assigned_by' column of 'user_interventions' in the schema cache" })).toBe(true);
    expect(esErrorDeColumnaFaltante({ message: 'column "assigned_by" does not exist' })).toBe(true);
  });

  it('solo el código, sin mensaje → se acepta', () => {
    expect(esErrorDeColumnaFaltante({ code: '42703' })).toBe(true);
    expect(esErrorDeColumnaFaltante({ code: 'PGRST204', message: '' })).toBe(true);
  });

  it('42703 de OTRA columna es un error de verdad', () => {
    expect(esErrorDeColumnaFaltante({ code: '42703', message: 'column user_interventions.custom_time does not exist' })).toBe(false);
  });

  it('cualquier otro error no se disfraza de columna faltante', () => {
    expect(esErrorDeColumnaFaltante({ code: '42501', message: 'permission denied for table user_interventions' })).toBe(false);
    expect(esErrorDeColumnaFaltante({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
    expect(esErrorDeColumnaFaltante({ message: 'TypeError: Network request failed' })).toBe(false);
    // Nombra la columna pero no es un error de columna.
    expect(esErrorDeColumnaFaltante({ code: '57014', message: 'canceling statement due to statement timeout (assigned_by)' })).toBe(false);
    expect(esErrorDeColumnaFaltante({})).toBe(false);
    expect(esErrorDeColumnaFaltante(null)).toBe(false);
    expect(esErrorDeColumnaFaltante(undefined)).toBe(false);
  });

  it('sirve para otra columna si se le pide', () => {
    expect(esErrorDeColumnaFaltante({ code: '42703', message: 'column x.otra does not exist' }, 'otra')).toBe(true);
  });
});

describe('leerConCaidaDeAsignacion', () => {
  const ERR_COLUMNA = { code: '42703', message: 'column user_interventions.assigned_by does not exist' };
  const ERR_RED = { message: 'TypeError: Network request failed' };

  /** Lector falso: contesta en orden y anota con qué columnas lo llamaron. */
  function lector<T>(respuestas: RespuestaDeLectura<T>[]) {
    const pedidos: string[] = [];
    const leer = async (columnas: string): Promise<RespuestaDeLectura<T>> => {
      pedidos.push(columnas);
      const r = respuestas[pedidos.length - 1];
      if (!r) throw new Error('lectura de más');
      return r;
    };
    return { leer, pedidos };
  }

  it('base con la 329: una sola lectura, assigned_by tal cual llega', async () => {
    const filas = [
      row({ intervention_key: 'grounding_earthing', status: 'active', assigned_by: COACH }),
      row({ intervention_key: 'hidratacion_matutina', status: 'active', assigned_by: null }),
    ];
    const { leer, pedidos } = lector<UserInterventionRow[]>([{ data: filas, error: null }]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(pedidos).toEqual([COLUMNAS_FILA]);
    expect(r.error).toBeNull();
    expect(r.sinColumnaAsignacion).toBe(false);
    expect((r.data ?? []).map(esPracticaAsignada)).toEqual([true, false]);
  });

  it('base SIN la 329: reintenta una vez sin la columna y nadie queda asignado', async () => {
    const viejas = [
      row({ intervention_key: 'grounding_earthing', status: 'active' }),
      row({ intervention_key: 'hidratacion_matutina', status: 'active' }),
    ];
    const { leer, pedidos } = lector<UserInterventionRow[]>([
      { data: null, error: ERR_COLUMNA },
      { data: viejas, error: null },
    ]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(pedidos).toEqual([COLUMNAS_FILA, COLUMNAS_FILA_SIN_ASIGNACION]);
    expect(r.error).toBeNull();
    expect(r.sinColumnaAsignacion).toBe(true);
    expect(r.data).toHaveLength(2);
    expect((r.data ?? []).every((f) => f.assigned_by === null)).toBe(true);
    expect((r.data ?? []).some(esPracticaAsignada)).toBe(false);
    // El resto de la fila llega intacto y resuelve contra el catálogo.
    expect(resolveRows(r.data ?? []).map((x) => x.row.intervention_key)).toEqual(['grounding_earthing', 'hidratacion_matutina']);
    // No muta lo que devolvió la base.
    expect('assigned_by' in viejas[0]).toBe(false);
  });

  it('PGRST204 también dispara la caída', async () => {
    const { leer, pedidos } = lector<UserInterventionRow[]>([
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'assigned_by' column of 'user_interventions' in the schema cache" } },
      { data: [], error: null },
    ]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(pedidos).toHaveLength(2);
    expect(r.error).toBeNull();
    expect(r.data).toEqual([]);
  });

  it('lista vacía de verdad sigue siendo lista vacía, sin error', async () => {
    const { leer, pedidos } = lector<UserInterventionRow[]>([{ data: [], error: null }]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(pedidos).toHaveLength(1);
    expect(r.data).toEqual([]);
    expect(r.error).toBeNull();
  });

  it('otro error NO se reintenta y NO se vuelve lista vacía', async () => {
    const { leer, pedidos } = lector<UserInterventionRow[]>([{ data: null, error: ERR_RED }]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(pedidos).toHaveLength(1);
    expect(r.error).toEqual(ERR_RED);
    expect(r.data).toBeNull();
    expect(r.sinColumnaAsignacion).toBe(false);
  });

  it('un error con data parcial tampoco deja pasar la data', async () => {
    const { leer } = lector<UserInterventionRow[]>([{ data: [], error: ERR_RED }]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(r.data).toBeNull();
    expect(r.error).toEqual(ERR_RED);
  });

  it('si el reintento también falla, se devuelve ESE error y data null', async () => {
    const { leer, pedidos } = lector<UserInterventionRow[]>([
      { data: null, error: ERR_COLUMNA },
      { data: null, error: ERR_RED },
    ]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(pedidos).toHaveLength(2);
    expect(r.error).toEqual(ERR_RED);
    expect(r.data).toBeNull();
    expect(r.sinColumnaAsignacion).toBe(true);
  });

  it('nunca hay un tercer intento', async () => {
    const { leer, pedidos } = lector<UserInterventionRow[]>([
      { data: null, error: ERR_COLUMNA },
      { data: null, error: ERR_COLUMNA },
      { data: [], error: null },
    ]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(pedidos).toHaveLength(2);
    expect(r.error).toEqual(ERR_COLUMNA);
    expect(r.data).toBeNull();
  });

  it('una sola fila (maybeSingle): con caída se marca no asignada', async () => {
    const vieja = row({ intervention_key: 'grounding_earthing', status: 'active' });
    const { leer } = lector<UserInterventionRow>([
      { data: null, error: ERR_COLUMNA },
      { data: vieja, error: null },
    ]);
    const r = await leerConCaidaDeAsignacion(leer);
    expect(r.error).toBeNull();
    expect(r.data?.intervention_key).toBe('grounding_earthing');
    expect(r.data?.assigned_by).toBeNull();
    expect(esPracticaAsignada(r.data)).toBe(false);
  });

  it('maybeSingle sin fila: null sin error, con y sin caída', async () => {
    const a = await leerConCaidaDeAsignacion(lector<UserInterventionRow>([{ data: null, error: null }]).leer);
    expect(a.data).toBeNull();
    expect(a.error).toBeNull();
    const b = await leerConCaidaDeAsignacion(lector<UserInterventionRow>([
      { data: null, error: ERR_COLUMNA },
      { data: null, error: null },
    ]).leer);
    expect(b.data).toBeNull();
    expect(b.error).toBeNull();
    expect(b.sinColumnaAsignacion).toBe(true);
  });

  it('acepta un thenable como el builder de supabase-js (no solo Promise)', async () => {
    const pedidos: string[] = [];
    const leer = (columnas: string): PromiseLike<RespuestaDeLectura<UserInterventionRow[]>> => {
      pedidos.push(columnas);
      const respuesta: RespuestaDeLectura<UserInterventionRow[]> = pedidos.length === 1
        ? { data: null, error: ERR_COLUMNA }
        : { data: [row({ intervention_key: 'grounding_earthing' })], error: null };
      return { then: (ok: any, mal?: any) => Promise.resolve(respuesta).then(ok, mal) } as PromiseLike<RespuestaDeLectura<UserInterventionRow[]>>;
    };
    const r = await leerConCaidaDeAsignacion(leer);
    expect(pedidos).toHaveLength(2);
    expect(r.data).toHaveLength(1);
    expect(r.data?.[0].assigned_by).toBeNull();
  });
});
