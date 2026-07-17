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
// HOTFIX 1.5: León despierta 06:00 (doctrina Sprint 1.5) — 05:30 era el default
// v1 y mandaba madrugada; CHRONO_SCHEDULES (onboarding-v2-core) va en espejo.
export const CHRONO_ANCHOR_DEFAULTS: Record<Chronotype3, { wake: string; sleep: string }> = {
  lion: { wake: '06:00', sleep: '21:30' },
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
  // 1.5-C: horario validado contra el cronotipo — un wake 05:30 almacenado en
  // un oso es dato roto y snapea al default del tipo (no forzar madrugada).
  const { wake_time: wake, sleep_time: sleep } = validatedSchedule(schedule, chronotype);
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
  // 1.5-C: hidratación matutina va a wake+15 (antes del sol/café), no al ancla
  // morning genérica (wake+30). Solo horas de máquina.
  if (!userLocked && iv.row.intervention_key === 'hidratacion_matutina') {
    const custom = shiftMinutes(anchors.morning, -15);
    if (custom) time = custom;
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

// \u2500\u2500 1.5-C: familias de concepto cross-vocabulario \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// El device test tumb\u00f3 el dedup por nombre exacto: "Luz solar" (protocolo
// legacy) \u2260 "Exposici\u00f3n solar matutina (Fitzpatrick)" (intervenci\u00f3n) aunque
// son EL MISMO concepto. Reglas ordenadas sobre el nombre normalizado; la
// primera que matchea gana. Sin match \u2192 el nombre normalizado es su familia.

const FAMILY_RULES: [string, RegExp][] = [
  ['pantallas', /pantalla/],                                   // antes que 'dormir' ("...antes de dormir")
  ['lentes_rojos', /lentes/],                                  // \u00eddem
  ['sol', /solar|(^|\s)sol($|\s)/],
  ['hidratacion', /hidratacion|(^|\s)agua($|\s)/],
  ['suplementos', /suplement/],
  ['romper_ayuno', /romper.*ayuno|(^|\s)ayuno($|\s|\d)/],
  ['ventana_alimentacion', /ventana de (alimentacion|comida)|recordatorio comer/],
  ['dormir', /dormir/],
  ['despertar', /despertar/],
  ['grounding', /grounding|earthing|descalz/],
];

/** Familia can\u00f3nica de un nombre de evento/intervenci\u00f3n (para dedup sem\u00e1ntico). */
export function canonicalConcept(name: string): string {
  const n = normalizeConceptName(name);
  for (const [family, rule] of FAMILY_RULES) {
    if (rule.test(n)) return family;
  }
  return n;
}

/**
 * Repeticiones por d\u00eda permitidas por familia (multi-dosis leg\u00edtima). Familias
 * fuera de esta lista: 1 evento/d\u00eda \u2014 "nunca 2 eventos de la misma intervenci\u00f3n
 * el mismo d\u00eda" (doc 1.5-C).
 */
export const FAMILY_REPEATS_PER_DAY: Record<string, number> = {
  hidratacion: 5,   // spread wake\u2192sleep
  suplementos: 3,   // batch matutino/tarde/noche
};

// \u2500\u2500 1.5-C: cronotipo validado (Despertar 05:30 en un oso = dato roto) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** Tolerancia contra el default del cronotipo antes de snapear al default. */
export const CHRONO_TOLERANCE_MINUTES = 60;

function minutesOf(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())!;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Distancia circular en minutos entre dos HH:MM (wrap 24h, p.ej. 23:30\u219400:30 = 60). */
function circularDiff(a: string, b: string): number {
  const d = Math.abs(minutesOf(a) - minutesOf(b));
  return Math.min(d, 1440 - d);
}

/**
 * Horario validado contra el cronotipo: un wake/sleep almacenado que se aleja
 * m\u00e1s de CHRONO_TOLERANCE_MINUTES del default del tipo normalizado (dolphin \u2192
 * oso, doctrina) se considera dato roto y snapea al default. El custom_time de
 * cada intervenci\u00f3n sigue siendo sagrado \u2014 esto solo gobierna horas de m\u00e1quina.
 */
export function validatedSchedule(
  schedule: ChronotypeSchedule,
  chronotype: string | null | undefined,
): { wake_time: string; sleep_time: string } {
  const defaults = CHRONO_ANCHOR_DEFAULTS[normalizeChronotype(chronotype)];
  const wakeOk = isHHMM(schedule.wake_time)
    && circularDiff(schedule.wake_time as string, defaults.wake) <= CHRONO_TOLERANCE_MINUTES;
  const sleepOk = isHHMM(schedule.sleep_time)
    && circularDiff(schedule.sleep_time as string, defaults.sleep) <= CHRONO_TOLERANCE_MINUTES;
  return {
    wake_time: wakeOk ? (schedule.wake_time as string) : defaults.wake,
    sleep_time: sleepOk ? (schedule.sleep_time as string) : defaults.sleep,
  };
}

// \u2500\u2500 1.5-C: romper ayuno din\u00e1mico (lee el fasting_log real, no hardcode) \u2500\u2500\u2500\u2500\u2500\u2500

/** Cena default asumida cuando el user no tiene fasting_logs. */
export const BREAKFAST_FALLBACK_DINNER = '20:00';

/**
 * Hora de "Romper ayuno" = inicio real del \u00faltimo ayuno + horas del protocolo.
 * Sin fasting_logs \u2192 estimado: cena asumida 20:00 del d\u00eda previo + horas
 * (16h \u2192 12:00), marcado `estimated` para etiquetarlo en el evento.
 */
export function computeBreakFastTime(
  lastFastStartISO: string | null | undefined,
  fastingHours: number,
): { time: string; estimated: boolean } {
  const hours = Number.isFinite(fastingHours) && fastingHours > 0 ? fastingHours : 16;
  if (lastFastStartISO) {
    const start = new Date(lastFastStartISO);
    if (!isNaN(start.getTime())) {
      const startHHMM = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
      return { time: shiftMinutes(startHHMM, Math.round(hours * 60)) ?? startHHMM, estimated: false };
    }
  }
  return {
    time: shiftMinutes(BREAKFAST_FALLBACK_DINNER, Math.round(hours * 60)) ?? '12:00',
    estimated: true,
  };
}

/** Horas de ayuno codificadas en la key del cat\u00e1logo (ayuno_16_8 \u2192 16). */
export function fastingHoursFromKey(interventionKey: string): number | null {
  const m = /^ayuno_(\d{2})_/.exec(interventionKey);
  return m ? Number(m[1]) : null;
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
  const taken = new Set(existingNames.map(canonicalConcept));
  const times = assignInterventionTimes(interventions, anchors);
  const items: InterventionAgendaItem[] = [];
  // 1.5-D: mismo orden/techo que la agenda — universales P1 primero (exentas
  // del techo, siempre presentes en HOY), no-universales hasta 15.
  const ordered = [...interventions].sort((a, b) => {
    if (a.row.is_universal !== b.row.is_universal) return a.row.is_universal ? -1 : 1;
    if (a.row.priority !== b.row.priority) return a.row.priority - b.row.priority;
    return a.def.name.localeCompare(b.def.name);
  });
  for (const iv of ordered) {
    const concept = canonicalConcept(iv.def.name);
    if (taken.has(concept)) continue; // carrera protocolo/intervención → no duplicar
    if (!iv.row.is_universal && items.length >= MAX_MACHINE_EVENTS_PER_DAY) continue;
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

/** 1.5-C: techo de eventos de máquina por día (excluye manuales del user). */
export const MAX_MACHINE_EVENTS_PER_DAY = 15;

export interface DesiredEventsOptions {
  /** Hora dinámica de "Romper ayuno" (computeBreakFastTime). */
  breakFast?: { time: string; estimated: boolean };
  /** Override del techo (default MAX_MACHINE_EVENTS_PER_DAY). */
  maxEvents?: number;
}

/** Etiqueta legible de una key de ayuno (ayuno_16_8 → '16:8'). */
function fastingLabelFromKey(key: string): string | null {
  const m = /^ayuno_(\d+)_(\d+)/.exec(key);
  return m ? `${m[1]}:${m[2]}` : null;
}

/**
 * Eventos deseados desde "Mi Protocolo": dedup por familia canónica, timing
 * dinámico para ayuno (romper ayuno real, no la ancla), y techo de eventos
 * priorizando universales P1 → priority asc. Las descartadas se reportan para
 * el warning de Sentry (nunca se descartan en silencio).
 */
export function buildDesiredInterventionEvents(
  interventions: ResolvedUserIntervention[],
  anchors: Record<TimeOfDay, string>,
  opts: DesiredEventsOptions = {},
): { events: DesiredInterventionEvent[]; discardedKeys: string[] } {
  const max = opts.maxEvents ?? MAX_MACHINE_EVENTS_PER_DAY;
  // Orden del cap: universales P1 primero (jamás se descartan por techo),
  // luego prioridad del semáforo, luego nombre (determinístico).
  const ordered = [...interventions].sort((a, b) => {
    if (a.row.is_universal !== b.row.is_universal) return a.row.is_universal ? -1 : 1;
    if (a.row.priority !== b.row.priority) return a.row.priority - b.row.priority;
    return a.def.name.localeCompare(b.def.name);
  });
  const times = assignInterventionTimes(interventions, anchors);
  const seen = new Set<string>();
  const events: DesiredInterventionEvent[] = [];
  const discardedKeys: string[] = [];

  for (const iv of ordered) {
    const key = iv.row.intervention_key;
    const cat = INTERVENTION_BY_KEY[key];
    let name = iv.def.name;
    let time = times.get(iv.row.id) ?? resolveInterventionTime(iv, anchors);

    // Familia ayuno → el evento agendable es ROMPER el ayuno, a la hora real
    // (último fasting_log + horas del protocolo). custom_time sigue mandando.
    if (cat?.family === 'ayuno' && opts.breakFast) {
      const label = fastingLabelFromKey(key);
      name = `Romper ayuno${label ? ` (${label})` : ''}${opts.breakFast.estimated ? ' · estimado' : ''}`;
      const custom = iv.row.custom_time;
      time = custom && isHHMM(custom) ? normalizeHHMM(custom) : opts.breakFast.time;
    }

    const concept = canonicalConcept(name);
    if (seen.has(concept)) continue;
    seen.add(concept);
    if (events.length >= max) {
      discardedKeys.push(key);
      continue;
    }
    events.push({
      intervention_key: key,
      name,
      time,
      category: iv.def.categories[0] ?? 'intervencion',
    });
  }
  return { events, discardedKeys };
}

/** Compat: solo la lista (sin timing dinámico de ayuno ni reporte de descartes). */
export function desiredInterventionEvents(
  interventions: ResolvedUserIntervention[],
  anchors: Record<TimeOfDay, string>,
): DesiredInterventionEvent[] {
  return buildDesiredInterventionEvents(interventions, anchors).events;
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
    existing.filter((r) => r.is_active && !r.intervention_key).map((r) => canonicalConcept(r.name)),
  );

  // #29: dato user sagrado — si el concepto ya existe como evento MANUAL activo,
  // el motor no compite: la intervención duplicada se excluye de `desired`. Al no
  // entrar a desiredKeys, una fila del motor ya insertada para ese concepto cae
  // en el loop de desactivación de abajo (se conserva la del user, muere la del motor).
  const manualConcepts = new Set(
    existing
      .filter((r) => r.is_active && (r.source === 'manual' || r.source === 'manual_override'))
      .map((r) => canonicalConcept(r.name)),
  );
  const dedupedDesired = desired.filter((d) => !manualConcepts.has(canonicalConcept(d.name)));

  const plan: InterventionEventSyncPlan = { inserts: [], updates: [], reactivations: [], deactivateIds: [] };
  const desiredKeys = new Set<string>();

  for (const d of dedupedDesired) {
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
        if (activeConceptNames.has(canonicalConcept(d.name))) continue;
        plan.reactivations.push({ id: row.id, name: d.name, time: d.time });
      } else if (timeChanged || nameChanged) {
        plan.updates.push({ id: row.id, name: d.name, time: d.time });
      }
      continue;
    }
    if (disabledKeys.has(agendaEventKey(d.name, d.time))) continue;
    if (activeConceptNames.has(canonicalConcept(d.name))) continue; // dedup carrera
    plan.inserts.push(d);
  }

  for (const row of existing) {
    if (row.source !== 'intervention' || !row.is_active) continue;
    if (!row.intervention_key || desiredKeys.has(row.intervention_key)) continue;
    plan.deactivateIds.push(row.id);
  }

  return plan;
}

// ── Reconcile cronotipo (Despertar/Dormir) — decisión pura ───────────────────

export interface ChronoReconcileAction {
  /** No hay fila de la familia → insertar (el caller respeta disabled). */
  insert: boolean;
  /** Fila activa que sobrevive y cuya hora hay que actualizar. */
  updateId: string | null;
  /** Fila inactiva a revivir con la hora nueva (la mató el cleanup, no el user). */
  reactivateId: string | null;
  /** Filas activas sobrantes de la misma familia (histórico pre-reconcile). */
  deactivateIds: string[];
}

/**
 * HOTFIX 1.5: decisión pura del reconcile de un evento de cronotipo.
 * Antes: fila inactiva == "el user lo quitó" y jamás se reinsertaba. FALSO —
 * el cleanup por familia también desactiva (p.ej. 'Dormir' cronotipo perdió
 * contra 'Dormir 8-9 horas' del protocolo, hoy retirado). El removal del USER
 * queda registrado en disabled_protocol_events; si la key NO está ahí, la
 * desactivación fue de máquina y el evento debe revivir con la hora validada.
 * `revive` lo gatea el caller (solo con el swap activo, para no duplicar
 * contra el driver protocolo aún vivo con flag OFF).
 */
export function planChronotypeReconcile(
  familyRows: AgendaEventRowLike[],
  desiredName: string,
  desiredTime: string,
  disabledKeys: Set<string>,
  revive: boolean,
): ChronoReconcileAction {
  const none: ChronoReconcileAction = { insert: false, updateId: null, reactivateId: null, deactivateIds: [] };
  if (familyRows.length === 0) return { ...none, insert: true };
  const activeOnes = familyRows.filter((r) => r.is_active);
  if (activeOnes.length > 0) {
    const keep = activeOnes[0];
    return {
      ...none,
      updateId: (keep.time ?? '').slice(0, 5) !== desiredTime ? keep.id : null,
      deactivateIds: activeOnes.slice(1).map((r) => r.id),
    };
  }
  if (!revive) return none;
  if (disabledKeys.has(agendaEventKey(desiredName, desiredTime))) return none;
  const candidate = familyRows.find((r) => !disabledKeys.has(agendaEventKey(r.name, r.time)));
  return candidate ? { ...none, reactivateId: candidate.id } : none;
}

// ── Limpieza de duplicados históricos (A.2 → upgrade 1.5-C con familias) ─────

const isUserRow = (r: AgendaEventRowLike) => r.source === 'manual' || r.source === 'manual_override';

/**
 * Rango de una fila de MÁQUINA dentro de su familia. Si la familia la gestiona
 * Mi Protocolo (desired), la fila 'intervention' gana (trae el timing calibrado:
 * clamp solar, stagger, romper-ayuno dinámico); si no, gana el driver viejo
 * ("el viejo gana", doctrina del sync). Empate → primera en orden de entrada
 * (created_at asc en el caller: la más vieja, que puede tener historial).
 */
function machineRank(r: AgendaEventRowLike, familyDesired: boolean): number {
  if (familyDesired) return r.source === 'intervention' ? 3 : r.source === 'protocol' ? 2 : 1;
  return r.source === 'protocol' ? 3 : r.source === 'chronotype' ? 2 : 1;
}

/**
 * Duplicados ACTIVOS acumulados en agenda_events. Devuelve ids a desactivar
 * (soft, reversible). Tres pases sobre familias CANÓNICAS (canonicalConcept —
 * "Luz solar" y "Exposición solar matutina" son la misma familia 'sol'):
 *  1. mismo intervention_key → sobrevive 1.
 *  2. misma familia + misma hora exacta → sobrevive 1.
 *  3. presupuesto por familia: FAMILY_REPEATS_PER_DAY (hidratación 5,
 *     suplementos 3, resto 1). Las filas del USER (manual/manual_override)
 *     jamás se desactivan y ocupan presupuesto primero — si el user creó su
 *     propio "Sol", la versión de máquina muere (mismo criterio que el guard
 *     de inserts del sync).
 *
 * HOTFIX 1.5 `retireProtocolDriver` (pase 0): con el swap activo el driver
 * protocolo está MUERTO (Bloque B) — toda fila activa source='protocol' se
 * retira (soft, reversible), no solo las que chocan por familia. Sin este pase
 * el device test veía 28 eventos: ~10 zombies del protocolo viejo conviviendo
 * con las intervenciones nuevas. manual/manual_override (user) intactas.
 */
export function planAgendaCleanup(
  existing: AgendaEventRowLike[],
  desiredConcepts: Set<string> = new Set(),
  opts: { retireProtocolDriver?: boolean } = {},
): string[] {
  const toDeactivate = new Set<string>();
  const active = existing.filter((r) => r.is_active);

  // Pase 0: retiro del driver muerto (protocolo ya no vuelca a HOY/AGENDA).
  if (opts.retireProtocolDriver) {
    for (const row of active) {
      if (row.source === 'protocol') toDeactivate.add(row.id);
    }
  }

  // Pase 1: un solo evento por intervention_key (el user gana; luego el 1ro).
  const byKey = new Map<string, AgendaEventRowLike>();
  for (const row of active) {
    if (toDeactivate.has(row.id)) continue; // retirada en pase 0
    if (!row.intervention_key) continue;
    const prev = byKey.get(row.intervention_key);
    if (!prev) {
      byKey.set(row.intervention_key, row);
      continue;
    }
    if (isUserRow(prev) && isUserRow(row)) continue; // data del user: intactas ambas
    if (isUserRow(row)) {
      toDeactivate.add(prev.id);
      byKey.set(row.intervention_key, row);
    } else {
      toDeactivate.add(row.id);
    }
  }

  // Pase 2: misma familia + misma hora exacta → 1 (dupes literales).
  const byFamilyTime = new Map<string, AgendaEventRowLike>();
  for (const row of active) {
    if (toDeactivate.has(row.id)) continue;
    const family = canonicalConcept(row.name);
    const k = `${family}|${(row.time ?? '').slice(0, 5)}`;
    const prev = byFamilyTime.get(k);
    if (!prev) {
      byFamilyTime.set(k, row);
      continue;
    }
    if (isUserRow(prev) && isUserRow(row)) continue;
    if (isUserRow(row)) {
      toDeactivate.add(prev.id);
      byFamilyTime.set(k, row);
    } else if (isUserRow(prev)) {
      toDeactivate.add(row.id);
    } else {
      const desired = desiredConcepts.has(family);
      const winner = machineRank(row, desired) > machineRank(prev, desired) ? row : prev;
      toDeactivate.add(winner === prev ? row.id : prev.id);
      byFamilyTime.set(k, winner);
    }
  }

  // Pase 3: presupuesto por familia (multi-dosis whitelist; resto 1/día).
  const byFamily = new Map<string, AgendaEventRowLike[]>();
  for (const row of active) {
    if (toDeactivate.has(row.id)) continue;
    const family = canonicalConcept(row.name);
    const list = byFamily.get(family) ?? [];
    list.push(row);
    byFamily.set(family, list);
  }
  for (const [family, rows] of byFamily) {
    const allowed = FAMILY_REPEATS_PER_DAY[family] ?? 1;
    if (rows.length <= allowed) continue;
    const userRows = rows.filter(isUserRow);
    const machine = rows.filter((r) => !isUserRow(r));
    const desired = desiredConcepts.has(family);
    // sort estable: rango desc; empates conservan orden de entrada (más vieja 1ro)
    const rankedMachine = machine
      .map((r, i) => ({ r, i }))
      .sort((a, b) => machineRank(b.r, desired) - machineRank(a.r, desired) || a.i - b.i)
      .map((x) => x.r);
    const slots = Math.max(0, allowed - userRows.length);
    for (const r of rankedMachine.slice(slots)) toDeactivate.add(r.id);
  }
  return [...toDeactivate];
}
