/**
 * intervention-agenda-core — lógica PURA del swap HOY/AGENDA (DX F4).
 * Sin react-native/supabase → testeable con vitest (patrón *-core del repo).
 *
 * Aquí vive lo determinístico del driver nuevo:
 *  · selectAgendaDrivers: la doble-lectura del flag INTERVENTIONS_DRIVE_HOY en
 *    un solo lugar (day-compiler y agenda-service consumen la misma decisión).
 *  · anchorTimes: anclas horarias de la AGENDA por cronotipo (León/Oso/Lobo —
 *    SON 3; 'dolphin' es legacy del quiz v1 y se mapea a Oso, su equivalente
 *    más cercano: wake 06:30≈07:00, sleep 23:30≈23:00).
 *  · resolveInterventionTime: custom_time > computed_time (effectiveTime de F3)
 *    > ancla por timeOfDay del catálogo.
 *  · interventionAgendaItems: intervenciones activas → items con el shape de
 *    AgendaItem de day-compiler (dedup defensivo por concepto).
 *  · planInterventionEventSync: reconciliación idempotente contra agenda_events
 *    (inserts/updates/reactivaciones/desactivaciones) para agenda-service.
 *
 * DEDUP DEFENSIVO (carrera del flag): si un mismo concepto llega por protocolo
 * Y por intervención (p.ej. daily_plans viejo aún materializado el día del flip),
 * el criterio es el NOMBRE NORMALIZADO (lowercase, sin acentos, espacios
 * colapsados): el item pre-existente (protocolo/custom/manual) GANA y la
 * intervención no se duplica. Complementa el dedup exacto `HH:MM|nombre` que
 * ya hacen buildAgenda y generateAgendaEvents.
 */
import { INTERVENTION_BY_KEY, type TimeOfDay } from '@/src/constants/interventions-catalog';
import type { ChronotypeSchedule } from './intervention-engine-core';
import { SLEEP_PREP_MINUTES } from './intervention-engine-core';
import { effectiveTime, type ResolvedUserIntervention } from './intervention-service-core';

// ── Doble-lectura del flag (un solo punto de decisión) ───────────────────────

export interface AgendaDrivers {
  /** Las intervenciones activas inyectan items a HOY/AGENDA. */
  interventions: boolean;
  /** Los protocolos (user_protocols → daily_plans) inyectan items a HOY/AGENDA. */
  protocols: boolean;
}

/**
 * Decide qué driver alimenta HOY/AGENDA según el flag. Exactamente uno activo:
 * flag ON → intervenciones (swap); flag OFF → protocolos (status quo intacto).
 */
export function selectAgendaDrivers(interventionsDriveHoy: boolean): AgendaDrivers {
  return { interventions: interventionsDriveHoy, protocols: !interventionsDriveHoy };
}

// ── Cronotipo (3 tipos) + anclas horarias ────────────────────────────────────

export type Chronotype3 = 'lion' | 'bear' | 'wolf';

/**
 * Normaliza el valor crudo de user_chronotype.chronotype a los 3 cronotipos
 * doctrinales. 'dolphin' (legacy del quiz v1, sigue persistido en algunas
 * cuentas) → 'bear' (equivalente más cercano). Desconocido/null → 'bear'.
 */
export function normalizeChronotype(raw: string | null | undefined): Chronotype3 {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'lion' || v === 'leon' || v === 'león') return 'lion';
  if (v === 'wolf' || v === 'lobo') return 'wolf';
  // 'bear', 'oso', 'dolphin' (legacy→oso), y cualquier otro → bear.
  return 'bear';
}

/** Wake/sleep default por cronotipo (mismos valores que CHRONO_SCHEDULES v1/v2). */
export const CHRONO_ANCHOR_DEFAULTS: Record<Chronotype3, { wake: string; sleep: string }> = {
  lion: { wake: '05:30', sleep: '21:30' },
  bear: { wake: '07:00', sleep: '23:00' },
  wolf: { wake: '08:00', sleep: '00:00' },
};

/** Suma (o resta, delta negativo) minutos a un 'HH:MM' con wrap 24h. */
export function shiftMinutes(hhmm: string, delta: number): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  let total = h * 60 + min + delta;
  total = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Anclas de la agenda por franja (TimeOfDay → 'HH:MM'), derivadas del horario
 * real del user (wake/sleep del cronotipo, ajustable) con fallback a los
 * defaults del cronotipo normalizado:
 *  · morning   = wake + 30 min (tras la rutina de despertar)
 *  · noon      = wake + 5 h
 *  · afternoon = wake + 9 h
 *  · evening   = sleep − 3 h
 *  · night     = sleep − SLEEP_PREP_MINUTES (alineado a la rutina de sueño F3)
 */
export function anchorTimes(
  schedule: ChronotypeSchedule,
  chronotype: string | null | undefined,
): Record<TimeOfDay, string> {
  const defaults = CHRONO_ANCHOR_DEFAULTS[normalizeChronotype(chronotype)];
  const wake = isHHMM(schedule.wake_time) ? (schedule.wake_time as string) : defaults.wake;
  const sleep = isHHMM(schedule.sleep_time) ? (schedule.sleep_time as string) : defaults.sleep;
  return {
    morning: shiftMinutes(wake, 30) ?? wake,
    noon: shiftMinutes(wake, 5 * 60) ?? wake,
    afternoon: shiftMinutes(wake, 9 * 60) ?? wake,
    evening: shiftMinutes(sleep, -3 * 60) ?? sleep,
    night: shiftMinutes(sleep, -SLEEP_PREP_MINUTES) ?? sleep,
  };
}

function isHHMM(v: string | null | undefined): boolean {
  return typeof v === 'string' && /^(\d{1,2}):(\d{2})$/.test(v.trim());
}

// ── Calibración de tiempos (A.2 megahotfix 3ra pasada) ──────────────────────

/** Intervenciones de exposición solar: nunca antes del amanecer razonable. */
export const SOLAR_INTERVENTION_KEYS = new Set(['exposicion_solar_matutina']);
/** Piso para eventos solares sin hora del user (sin API sunrise: 06:30 doctrinal). */
export const MIN_SOLAR_TIME = '06:30';
/** Separación entre eventos máquina que caían simultáneos (agua+sol+sups a las 6). */
export const STAGGER_MINUTES = 15;

/**
 * Hora del item de una intervención + si la fijó el user:
 *  1. custom_time (user — SAGRADA, nunca se ajusta),
 *  2. computed_time (máquina, F3), 3. ancla por timeOfDay del catálogo,
 *  4. sin timeOfDay: circadian 'sleep' → night; default morning.
 * A las horas de máquina se les aplica el piso solar (MIN_SOLAR_TIME).
 */
export function resolveInterventionTimeEx(
  iv: ResolvedUserIntervention,
  anchors: Record<TimeOfDay, string>,
): { time: string; userLocked: boolean } {
  let time: string;
  let userLocked = false;
  const custom = iv.row.custom_time;
  const computed = iv.row.computed_time;
  if (custom && isHHMM(custom)) {
    time = normalizeHHMM(custom);
    userLocked = true;
  } else if (computed && isHHMM(computed)) {
    time = normalizeHHMM(computed);
  } else {
    const cat = INTERVENTION_BY_KEY[iv.row.intervention_key];
    const tod: TimeOfDay = cat?.timeOfDay
      ?? (cat?.circadian === 'sleep' ? 'night' : 'morning');
    time = anchors[tod];
  }
  if (!userLocked && SOLAR_INTERVENTION_KEYS.has(iv.row.intervention_key) && time < MIN_SOLAR_TIME) {
    time = MIN_SOLAR_TIME;
  }
  return { time, userLocked };
}

/** Compat: solo la hora (clamp solar incluido, sin stagger). */
export function resolveInterventionTime(
  iv: ResolvedUserIntervention,
  anchors: Record<TimeOfDay, string>,
): string {
  return resolveInterventionTimeEx(iv, anchors).time;
}

/**
 * Asigna hora a cada intervención activa espaciando colisiones: los custom_time
 * del user son slots fijos; las horas de máquina que caigan en un slot ocupado
 * se corren +STAGGER_MINUTES hasta hueco libre. Determinístico: se procesa
 * ordenado por (hora resuelta, key), así el mismo set activo produce siempre
 * las mismas horas (idempotente contra agenda_events).
 */
export function assignInterventionTimes(
  interventions: ResolvedUserIntervention[],
  anchors: Record<TimeOfDay, string>,
): Map<string, string> {
  const resolved = interventions.map((iv) => ({ iv, ...resolveInterventionTimeEx(iv, anchors) }));
  const out = new Map<string, string>();
  const taken = new Set<string>();
  for (const r of resolved) {
    if (!r.userLocked) continue;
    out.set(r.iv.row.id, r.time); // user manda: puede haber 2 custom iguales
    taken.add(r.time);
  }
  const machine = resolved
    .filter((r) => !r.userLocked)
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.iv.row.intervention_key < b.iv.row.intervention_key ? -1 : 1));
  for (const r of machine) {
    let t = r.time;
    for (let i = 0; taken.has(t) && i < 96; i++) {
      t = shiftMinutes(t, STAGGER_MINUTES) ?? t;
    }
    taken.add(t);
    out.set(r.iv.row.id, t);
  }
  return out;
}

/** '7:30' → '07:30' (comparable y ordenable). */
function normalizeHHMM(v: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return v;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Nombre normalizado para dedup por concepto (lowercase, sin acentos, 1 espacio). */
export function normalizeConceptName(name: string): string {
  return (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Intervenciones activas → AgendaItems (HOY) ───────────────────────────────

/** Prefijo de id de los items de intervención en HOY (toggle → logCompletion). */
export const INTERVENTION_ITEM_PREFIX = 'iv-';

/** Shape estructural de AgendaItem (day-compiler) — sin importar day-compiler aquí. */
export interface InterventionAgendaItem {
  id: string;
  time: string;
  name: string;
  subtitle?: string;
  category: string;
  completed: boolean;
  isNext: boolean;
  isSmart: boolean;
}

/**
 * Convierte "Mi Protocolo" (activas resueltas) a items con el shape exacto que
 * buildAgenda produce para el resto del día. `completedTodayIds` = ids de
 * user_interventions con compleción hoy (intervention_completions). Dedup por
 * concepto contra `existingNames` (items ya en la agenda: el existente gana).
 */
export function interventionAgendaItems(
  interventions: ResolvedUserIntervention[],
  anchors: Record<TimeOfDay, string>,
  completedTodayIds: Set<string>,
  existingNames: string[] = [],
): InterventionAgendaItem[] {
  const taken = new Set(existingNames.map(normalizeConceptName));
  const times = assignInterventionTimes(interventions, anchors);
  const items: InterventionAgendaItem[] = [];
  for (const iv of interventions) {
    const concept = normalizeConceptName(iv.def.name);
    if (taken.has(concept)) continue; // carrera protocolo/intervención → no duplicar
    taken.add(concept);
    items.push({
      id: `${INTERVENTION_ITEM_PREFIX}${iv.row.id}`,
      time: times.get(iv.row.id) ?? resolveInterventionTime(iv, anchors),
      name: iv.def.name,
      subtitle: 'Mi Protocolo',
      category: iv.def.categories[0] ?? 'intervencion',
      completed: completedTodayIds.has(iv.row.id),
      isNext: false,
      isSmart: false,
    });
  }
  return items;
}

// ── Reconciliación contra agenda_events (AGENDA + push) ──────────────────────

/** Notif default de un evento de intervención (hereda push del pipeline 098). */
export const INTERVENTION_NOTIFY_MINUTES_BEFORE = 10;

/** Evento deseado desde una intervención activa. */
export interface DesiredInterventionEvent {
  intervention_key: string;
  name: string;
  time: string; // 'HH:MM'
  category: string;
}

/** Lo mínimo de una fila agenda_events que el planner necesita. */
export interface AgendaEventRowLike {
  id: string;
  name: string;
  time: string; // 'HH:MM' (o 'HH:MM:SS' de la columna TIME)
  source: string;
  is_active: boolean;
  intervention_key: string | null;
}

/** key de dedupe/disabled — MISMO formato que agenda-service (`HH:MM|nombre`). */
export function agendaEventKey(name: string, time: string): string {
  return `${(time ?? '').slice(0, 5)}|${(name ?? '').trim().toLowerCase()}`;
}

/** Eventos deseados desde "Mi Protocolo" (dedup interno por concepto). */
export function desiredInterventionEvents(
  interventions: ResolvedUserIntervention[],
  anchors: Record<TimeOfDay, string>,
): DesiredInterventionEvent[] {
  const seen = new Set<string>();
  const times = assignInterventionTimes(interventions, anchors);
  const out: DesiredInterventionEvent[] = [];
  for (const iv of interventions) {
    const concept = normalizeConceptName(iv.def.name);
    if (seen.has(concept)) continue;
    seen.add(concept);
    out.push({
      intervention_key: iv.row.intervention_key,
      name: iv.def.name,
      time: times.get(iv.row.id) ?? resolveInterventionTime(iv, anchors),
      category: iv.def.categories[0] ?? 'intervencion',
    });
  }
  return out;
}

export interface InterventionEventSyncPlan {
  /** Filas nuevas a insertar (source 'intervention'). */
  inserts: DesiredInterventionEvent[];
  /** Eventos existentes cuyo time/name cambió (p.ej. custom_time nuevo). */
  updates: { id: string; name: string; time: string }[];
  /** Eventos de intervención desactivados que vuelven a estar activos. */
  reactivations: { id: string; name: string; time: string }[];
  /** Eventos de intervención cuya intervención ya no está activa (pausa/dismiss). */
  deactivateIds: string[];
}

/**
 * Plan idempotente de sincronización agenda_events ↔ intervenciones activas.
 * Reglas:
 *  · Fila existente con el mismo intervention_key:
 *      - source ≠ 'intervention' (manual_override: el user la editó) → NO se toca.
 *      - inactiva + deseada → reactivar (con time/name frescos), salvo que el
 *        user la haya quitado (disabledKeys, mismo mecanismo que protocolo).
 *      - activa + time/name distintos → update quirúrgico.
 *  · Sin fila para el key → insert, salvo disabled o choque de concepto con un
 *    evento activo pre-existente (carrera protocolo/intervención: el viejo gana).
 *  · Fila 'intervention' activa cuyo key ya no está deseado → desactivar
 *    (is_active=false, reversible — igual que el soft delete existente).
 */
export function planInterventionEventSync(
  existing: AgendaEventRowLike[],
  desired: DesiredInterventionEvent[],
  disabledKeys: Set<string>,
): InterventionEventSyncPlan {
  // A.2: con filas duplicadas del mismo key (pre-cleanup) la fila ACTIVA gana el
  // slot — las inactivas sobrantes quedan fuera del plan (nunca se reactivan).
  const byKey = new Map<string, AgendaEventRowLike>();
  for (const row of existing) {
    if (!row.intervention_key) continue;
    const prev = byKey.get(row.intervention_key);
    if (!prev || (row.is_active && !prev.is_active)) byKey.set(row.intervention_key, row);
  }
  const activeConceptNames = new Set(
    existing.filter((r) => r.is_active && !r.intervention_key).map((r) => normalizeConceptName(r.name)),
  );

  const plan: InterventionEventSyncPlan = { inserts: [], updates: [], reactivations: [], deactivateIds: [] };
  const desiredKeys = new Set<string>();

  for (const d of desired) {
    desiredKeys.add(d.intervention_key);
    const row = byKey.get(d.intervention_key);
    if (row) {
      if (row.source !== 'intervention') continue; // manual_override: el user manda
      const timeChanged = (row.time ?? '').slice(0, 5) !== d.time;
      const nameChanged = row.name !== d.name;
      if (!row.is_active) {
        if (disabledKeys.has(agendaEventKey(d.name, d.time))) continue;
        // A.2: mismo guard de concepto que los inserts — sin él, una fila
        // desactivada por el cleanup (el viejo gana) reviviría en cada sync.
        if (activeConceptNames.has(normalizeConceptName(d.name))) continue;
        plan.reactivations.push({ id: row.id, name: d.name, time: d.time });
      } else if (timeChanged || nameChanged) {
        plan.updates.push({ id: row.id, name: d.name, time: d.time });
      }
      continue;
    }
    if (disabledKeys.has(agendaEventKey(d.name, d.time))) continue;
    if (activeConceptNames.has(normalizeConceptName(d.name))) continue; // dedup carrera
    plan.inserts.push(d);
  }

  for (const row of existing) {
    if (row.source !== 'intervention' || !row.is_active) continue;
    if (!row.intervention_key || desiredKeys.has(row.intervention_key)) continue;
    plan.deactivateIds.push(row.id);
  }

  return plan;
}

// ── Limpieza de duplicados históricos (A.2 megahotfix 3ra pasada) ────────────

/** Al deduplicar por concepto+hora gana la fila de mayor prioridad de fuente. */
const SOURCE_PRIORITY: Record<string, number> = {
  manual_override: 5, // el user la editó — sagrada
  manual: 4,          // el user la creó
  protocol: 3,        // pre-existente al swap ("el viejo gana", misma doctrina del sync)
  chronotype: 2,
  intervention: 1,    // re-generable por el sync
};

/**
 * Duplicados ACTIVOS acumulados en agenda_events por versiones previas sin
 * dedup ("sol 3× a las 6am"). Devuelve ids a desactivar (soft, reversible):
 *  · mismo intervention_key → sobrevive 1 (mayor prioridad de fuente; empate:
 *    primera en el orden de entrada — ordenar por created_at en el caller).
 *  · mismo concepto (nombre normalizado) + misma hora HH:MM → sobrevive 1.
 *  · concepto gestionado por Mi Protocolo (`desiredConcepts`) con fila zombie
 *    del driver viejo (source 'protocol') → la intervención es la fuente
 *    única, la fila de protocolo se desactiva (aunque esté a otra hora).
 * Mismo concepto a horas DISTINTAS fuera de desiredConcepts no se toca
 * (multi-dosis legítima del protocolo del user, p.ej. agua 3× espaciada).
 * 'manual' y 'manual_override' JAMÁS se desactivan por el pase 3.
 */
export function planAgendaCleanup(
  existing: AgendaEventRowLike[],
  desiredConcepts: Set<string> = new Set(),
): string[] {
  const toDeactivate = new Set<string>();
  const better = (a: AgendaEventRowLike, b: AgendaEventRowLike): AgendaEventRowLike =>
    (SOURCE_PRIORITY[b.source] ?? 0) > (SOURCE_PRIORITY[a.source] ?? 0) ? b : a;
  const isUserRow = (r: AgendaEventRowLike) => r.source === 'manual' || r.source === 'manual_override';
  const dedupe = (rows: AgendaEventRowLike[], keyOf: (r: AgendaEventRowLike) => string | null) => {
    const seen = new Map<string, AgendaEventRowLike>();
    for (const row of rows) {
      const k = keyOf(row);
      if (!k) continue;
      const prev = seen.get(k);
      if (!prev) {
        seen.set(k, row);
        continue;
      }
      // Dos filas del USER duplicadas entre sí → no tocamos ninguna (su data
      // es sagrada); solo las filas de máquina pierden contra lo que sea.
      if (isUserRow(prev) && isUserRow(row)) continue;
      const winner = better(prev, row);
      toDeactivate.add(winner === prev ? row.id : prev.id);
      seen.set(k, winner);
    }
  };

  const active = existing.filter((r) => r.is_active);
  // Pase 1: un solo evento por intervention_key.
  dedupe(active, (r) => r.intervention_key);
  // Pase 2: sobre lo que sigue vivo, un solo evento por concepto+hora.
  dedupe(
    active.filter((r) => !toDeactivate.has(r.id)),
    (r) => `${normalizeConceptName(r.name)}|${(r.time ?? '').slice(0, 5)}`,
  );
  // Pase 3: zombies del driver viejo — filas 'protocol' cuyo concepto ahora lo
  // gestiona Mi Protocolo. La intervención (con clamp solar + stagger) toma el
  // control; sin este pase, el sol de protocolo a las 06:00 ganaría para
  // siempre por el dedup de conceptos del sync.
  if (desiredConcepts.size > 0) {
    for (const r of active) {
      if (toDeactivate.has(r.id) || r.source !== 'protocol') continue;
      if (desiredConcepts.has(normalizeConceptName(r.name))) toDeactivate.add(r.id);
    }
  }
  return [...toDeactivate];
}
