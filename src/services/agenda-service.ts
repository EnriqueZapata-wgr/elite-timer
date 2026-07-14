/**
 * Agenda service (#v13g) — CRUD + auto-generación + tracking de la pantalla /agenda.
 *
 * Modelo (migración 098):
 *   - agenda_events: plantillas recurrentes del usuario (manual | protocol | chronotype | manual_override).
 *   - agenda_event_logs: instancia por día (status + scheduled_at + notify_at para el push server-side).
 *   - user_day_preferences.disabled_protocol_events: keys de eventos de protocolo/cronotipo que el
 *     usuario quitó → la auto-gen NO los recrea.
 *
 * Defensivo: toda lectura cae a [] / no-op si falla; nunca rompe la pantalla.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { generateUUID } from '@/src/services/routine-service';
import { generateDailyPlan } from '@/src/services/protocol-builder-service';
import { awardBooleanElectron, revokeBooleanElectron } from '@/src/services/electron-service';
import type { ElectronSource } from '@/src/constants/electrons';
import { warn as logWarn } from '@/src/lib/logger';
// ── DX F4 (swap HOY/AGENDA) — doble-lectura gateada por flag ──
import { INTERVENTIONS_DRIVE_HOY } from '@/src/constants/flags';
import {
  selectAgendaDrivers, anchorTimes, desiredInterventionEvents, planInterventionEventSync,
  planAgendaCleanup, normalizeConceptName, INTERVENTION_NOTIFY_MINUTES_BEFORE,
  type AgendaEventRowLike,
} from '@/src/services/interventions/intervention-agenda-core';
import { getMyProtocol, getChronotypeSchedule } from '@/src/services/interventions/intervention-service';

// 'intervention' (DX F4): eventos volcados desde intervenciones activas (columna
// source es TEXT sin CHECK — migración 098 — así que no requiere ALTER).
export type AgendaSource = 'manual' | 'protocol' | 'chronotype' | 'manual_override' | 'intervention';
export type AgendaStatus = 'pending' | 'completed' | 'skipped' | 'snoozed';

export interface AgendaEventInstance {
  /** id del log (instancia diaria). */
  id: string;
  eventId: string;
  name: string;
  time: string;            // 'HH:MM'
  category: string;
  status: AgendaStatus;
  scheduledAt: string;     // ISO (UTC)
  notifyMinutesBefore: number;
  source: AgendaSource;
  /** DX F4: key del catálogo si el evento viene de una intervención (source 'intervention'). */
  interventionKey?: string | null;
}

export interface CreateEventInput {
  name: string;
  time: string;            // 'HH:MM'
  category: string;
  notifyMinutesBefore?: number;
}

// ═══ HELPERS ═══

/** 'HH:MM:SS' o 'HH:MM' → 'HH:MM'. */
function hhmm(time: string): string {
  return (time ?? '').slice(0, 5);
}

/** date 'YYYY-MM-DD' + time 'HH:MM' → ISO UTC del momento local del evento. */
function scheduledAtISO(date: string, time: string): string {
  return new Date(`${date}T${hhmm(time)}:00`).toISOString();
}

/** notify_at = scheduledAt - minutesBefore (null si no hay notif). */
function notifyAtISO(scheduledISO: string, minutesBefore: number): string | null {
  if (!minutesBefore || minutesBefore <= 0) return null;
  return new Date(new Date(scheduledISO).getTime() - minutesBefore * 60000).toISOString();
}

/** key de dedupe/disabled de un evento de auto-gen: `HH:MM|nombre-min`. */
function eventKey(name: string, time: string): string {
  return `${hhmm(time)}|${(name ?? '').trim().toLowerCase()}`;
}

async function getDisabledKeys(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('user_day_preferences').select('disabled_protocol_events')
      .eq('user_id', userId).maybeSingle();
    return new Set<string>(((data?.disabled_protocol_events as string[]) ?? []));
  } catch {
    return new Set<string>();
  }
}

// ═══ AUTO-GENERACIÓN ═══

/**
 * Genera eventos plantilla desde protocolo (daily_plans) + cronotipo (wake/sleep). Idempotente:
 * dedupe por key (HH:MM|nombre) contra los existentes y respeta disabled_protocol_events. Luego
 * asegura los logs (instancias) del día. Barato de re-llamar en cada entrada a /agenda.
 */
export async function generateAgendaEvents(userId: string, date?: string): Promise<void> {
  const targetDate = date || getLocalToday();
  // DX F4: doble-lectura — flag ON las intervenciones vuelcan (swap), flag OFF
  // el protocolo sigue volcando (status quo). Cronotipo vuelca SIEMPRE.
  const drivers = selectAgendaDrivers(INTERVENTIONS_DRIVE_HOY);
  try {
    const { data: existing } = await supabase
      .from('agenda_events').select('name, time').eq('user_id', userId);
    const existingKeys = new Set((existing ?? []).map((e: any) => eventKey(e.name, e.time)));
    const disabled = await getDisabledKeys(userId);

    const toInsert: any[] = [];
    const pushEvent = (name: string, time: string, category: string, source: AgendaSource, duration?: number | null, notify?: number | null) => {
      const key = eventKey(name, time);
      if (existingKeys.has(key) || disabled.has(key)) return;
      existingKeys.add(key);
      toInsert.push({
        id: generateUUID(), user_id: userId, name, time: hhmm(time), category,
        source, duration_min: duration ?? null, notify_minutes_before: notify ?? 0, is_active: true,
      });
    };

    // Cronotipo → despertar + dormir
    // HOTFIX schema: wake_time/sleep_time son columnas PLANAS — NO existe
    // columna `schedule` (el select viejo daba 400 silencioso → sin eventos).
    try {
      const { data: chrono } = await supabase
        .from('user_chronotype').select('wake_time, sleep_time').eq('user_id', userId).maybeSingle();
      const wake = (chrono as any)?.wake_time;
      const sleep = (chrono as any)?.sleep_time;
      if (typeof wake === 'string' && /^\d{1,2}:\d{2}/.test(wake)) pushEvent('Despertar', wake, 'ritmo', 'chronotype');
      if (typeof sleep === 'string' && /^\d{1,2}:\d{2}/.test(sleep)) pushEvent('Dormir', sleep, 'sueño', 'chronotype');
    } catch (e) { logWarn('[agenda] chronotype gen failed', e); }

    // Protocolo → acciones del plan del día (con hora). DX F4: solo con flag OFF.
    if (drivers.protocols) try {
      const plan = await generateDailyPlan(userId, targetDate);
      for (const a of plan?.actions ?? []) {
        if (!a.scheduled_time || !a.name) continue;
        pushEvent(a.name, a.scheduled_time, a.category || 'custom', 'protocol', a.duration_min, a.notify_minutes_before);
      }
    } catch (e) { logWarn('[agenda] generateDailyPlan failed', e); }

    if (toInsert.length > 0) {
      await supabase.from('agenda_events').insert(toInsert);
    }
  } catch (e) {
    logWarn('[agenda] generateAgendaEvents failed', e);
  }
  // DX F4: intervenciones activas → agenda_events (MISMO volcado/pipeline:
  // ensureLogsForDate crea las instancias con notify_at → dispatch-agenda-
  // notifications les manda push sin tocar el pipeline).
  if (drivers.interventions) {
    try {
      await syncInterventionEvents(userId);
    } catch (e) { logWarn('[agenda] syncInterventionEvents failed', e); }
  }
  await ensureLogsForDate(userId, targetDate);
}

/**
 * DX F4 — reconciliación idempotente agenda_events ↔ "Mi Protocolo" (activas).
 * El plan es puro (planInterventionEventSync): inserts para intervenciones
 * nuevas, updates si cambió la hora (custom_time F3), reactivación al
 * des-pausar, desactivación (soft) al pausar/descartar. Respeta
 * manual_override (el user editó el evento) y disabled_protocol_events
 * (el user lo quitó de su agenda). Barato de re-llamar en cada entrada.
 */
async function syncInterventionEvents(userId: string): Promise<void> {
  const [myProtocol, schedule, disabled] = await Promise.all([
    getMyProtocol(userId),
    getChronotypeSchedule(userId),
    getDisabledKeys(userId),
  ]);

  let chronoType: string | null = null;
  try {
    const { data: chronoRow } = await supabase
      .from('user_chronotype').select('chronotype')
      .eq('user_id', userId).maybeSingle();
    chronoType = (chronoRow as any)?.chronotype ?? null;
  } catch { /* anchors caen al default del cronotipo normalizado */ }

  const desired = desiredInterventionEvents(myProtocol, anchorTimes(schedule, chronoType));

  // Filas existentes con las columnas que el planner necesita (incluye
  // intervention_key — migración 185; requiere db push ANTES del OTA del flag).
  // Orden por created_at → el cleanup de duplicados es determinístico (en
  // empate de fuente sobrevive la fila más vieja, que puede tener historial).
  const { data: existing, error } = await supabase
    .from('agenda_events')
    .select('id, name, time, source, is_active, intervention_key')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    logWarn('[agenda] intervention events select failed (¿migración 185 aplicada?)', error);
    return;
  }

  let rows = ((existing ?? []) as any[]).map((e): AgendaEventRowLike => ({
    id: e.id, name: e.name, time: hhmm(e.time), source: e.source,
    is_active: e.is_active !== false, intervention_key: e.intervention_key ?? null,
  }));

  // A.2 megahotfix 3ra pasada: barrer duplicados históricos ("sol 3× a las 6am")
  // acumulados por versiones sin dedup + zombies del driver protocolo para
  // conceptos que ya gestiona Mi Protocolo. Soft-deactivate, reversible.
  const desiredConcepts = new Set(desired.map((d) => normalizeConceptName(d.name)));
  const cleanupIds = planAgendaCleanup(rows, desiredConcepts);
  if (cleanupIds.length > 0) {
    await supabase.from('agenda_events')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', cleanupIds).eq('user_id', userId);
    rows = rows.map((r) => (cleanupIds.includes(r.id) ? { ...r, is_active: false } : r));
  }

  const plan = planInterventionEventSync(rows, desired, disabled);

  if (plan.inserts.length > 0) {
    await supabase.from('agenda_events').insert(plan.inserts.map((d) => ({
      id: generateUUID(), user_id: userId, name: d.name, time: d.time,
      category: d.category, source: 'intervention', duration_min: null,
      notify_minutes_before: INTERVENTION_NOTIFY_MINUTES_BEFORE, is_active: true,
      intervention_key: d.intervention_key,
    })));
  }
  for (const u of plan.updates) {
    await supabase.from('agenda_events')
      .update({ name: u.name, time: u.time, updated_at: new Date().toISOString() })
      .eq('id', u.id).eq('user_id', userId);
  }
  for (const r of plan.reactivations) {
    await supabase.from('agenda_events')
      .update({ name: r.name, time: r.time, is_active: true, updated_at: new Date().toISOString() })
      .eq('id', r.id).eq('user_id', userId);
  }
  if (plan.deactivateIds.length > 0) {
    await supabase.from('agenda_events')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', plan.deactivateIds).eq('user_id', userId);
  }

  // Si cambió la hora de un evento existente, re-armar el log de HOY para que
  // la push salga a la hora nueva (mismo patrón que updateAgendaEvent).
  const timeChanged = [...plan.updates, ...plan.reactivations];
  if (timeChanged.length > 0) {
    const today = getLocalToday();
    for (const t of timeChanged) {
      const scheduledAt = scheduledAtISO(today, t.time);
      await supabase.from('agenda_event_logs').update({
        scheduled_at: scheduledAt,
        notify_at: notifyAtISO(scheduledAt, INTERVENTION_NOTIFY_MINUTES_BEFORE),
        notified_at: null,
      }).eq('user_id', userId).eq('event_id', t.id).eq('date', today);
    }
  }
}

/** Crea los logs (instancias) faltantes para los eventos activos del día. Idempotente. */
async function ensureLogsForDate(userId: string, date: string): Promise<void> {
  try {
    const { data: events } = await supabase
      .from('agenda_events').select('id, time, notify_minutes_before')
      .eq('user_id', userId).eq('is_active', true);
    if (!events?.length) return;
    const { data: logs } = await supabase
      .from('agenda_event_logs').select('event_id').eq('user_id', userId).eq('date', date);
    const haveLog = new Set((logs ?? []).map((l: any) => l.event_id));
    const toInsert = (events as any[])
      .filter((e) => !haveLog.has(e.id))
      .map((e) => {
        const scheduledAt = scheduledAtISO(date, e.time);
        return {
          id: generateUUID(), user_id: userId, event_id: e.id, date,
          status: 'pending', scheduled_at: scheduledAt,
          notify_at: notifyAtISO(scheduledAt, e.notify_minutes_before ?? 0),
        };
      });
    if (toInsert.length > 0) await supabase.from('agenda_event_logs').insert(toInsert);
  } catch (e) {
    logWarn('[agenda] ensureLogsForDate failed', e);
  }
}

// ═══ LECTURA ═══

/** Instancias de la agenda del día (join logs ↔ events activos), ordenadas por hora. */
export async function getAgendaForDate(userId: string, date?: string): Promise<AgendaEventInstance[]> {
  const targetDate = date || getLocalToday();
  try {
    // DX F4: intervention_key solo con flag ON (la columna llega en migración
    // 185 — con flag OFF el select queda idéntico al previo, status quo).
    const evCols = INTERVENTIONS_DRIVE_HOY
      ? 'name, time, category, source, notify_minutes_before, is_active, intervention_key'
      : 'name, time, category, source, notify_minutes_before, is_active';
    const { data: logs } = await supabase
      .from('agenda_event_logs')
      .select(`id, event_id, status, scheduled_at, agenda_events(${evCols})`)
      .eq('user_id', userId).eq('date', targetDate);
    const instances: AgendaEventInstance[] = [];
    for (const l of (logs ?? []) as any[]) {
      const ev = l.agenda_events;
      if (!ev || ev.is_active === false) continue;
      instances.push({
        id: l.id, eventId: l.event_id, name: ev.name, time: hhmm(ev.time),
        category: ev.category, status: l.status, scheduledAt: l.scheduled_at,
        notifyMinutesBefore: ev.notify_minutes_before ?? 0, source: ev.source,
        interventionKey: ev.intervention_key ?? null,
      });
    }
    instances.sort((a, b) => a.time.localeCompare(b.time));
    return instances;
  } catch (e) {
    logWarn('[agenda] getAgendaForDate failed', e);
    return [];
  }
}

// ═══ PROHIBICIONES (banner) ═══

/**
 * #v13i D — Etiqueta corta de una prohibición: "Eliminar café" → "Café", "Sin alcohol" → "Alcohol".
 * Quita el verbo de prohibición inicial y capitaliza.
 */
export function extractRestrictionLabel(name: string): string {
  let s = (name ?? '').trim();
  s = s.replace(/^(eliminar|evitar|reducir|sin|no|cero|nada de|dejar(?:\s+(?:el|la|los|las))?)\s+/i, '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * #v13i D — Prohibiciones del día para el banner. Lee daily_plans.restrictions (migración 100) y
 * devuelve etiquetas cortas únicas. Defensivo: [] si la columna no existe o no hay plan.
 */
export async function getRestrictionsForDate(userId: string, date?: string): Promise<string[]> {
  const targetDate = date || getLocalToday();
  try {
    const { data } = await supabase
      .from('daily_plans').select('restrictions')
      .eq('user_id', userId).eq('date', targetDate).maybeSingle();
    const raw = (data?.restrictions as any[]) ?? [];
    const labels = raw
      .map((r) => extractRestrictionLabel(typeof r === 'string' ? r : (r?.name ?? '')))
      .filter(Boolean);
    return Array.from(new Set(labels));
  } catch {
    return [];
  }
}

// ═══ CRUD ═══

/** Crea un evento manual + su log de hoy. */
export async function createCustomEvent(userId: string, input: CreateEventInput): Promise<void> {
  const eventId = generateUUID();
  const time = hhmm(input.time);
  const notifyMin = input.notifyMinutesBefore ?? 0;
  await supabase.from('agenda_events').insert({
    id: eventId, user_id: userId, name: input.name, time, category: input.category,
    source: 'manual', duration_min: null, notify_minutes_before: notifyMin, is_active: true,
  });
  const today = getLocalToday();
  const scheduledAt = scheduledAtISO(today, time);
  await supabase.from('agenda_event_logs').upsert({
    user_id: userId, event_id: eventId, date: today, status: 'pending',
    scheduled_at: scheduledAt, notify_at: notifyAtISO(scheduledAt, notifyMin),
  }, { onConflict: 'user_id,event_id,date' });
}

/**
 * Edita un evento. Si era 'protocol'/'chronotype' lo marca 'manual_override' para que la auto-gen
 * NO lo sobrescriba. Recalcula scheduled_at/notify_at del log de hoy si cambió hora o notif.
 */
export async function updateAgendaEvent(
  userId: string,
  eventId: string,
  changes: { name?: string; time?: string; category?: string; notifyMinutesBefore?: number },
): Promise<void> {
  const { data: ev } = await supabase
    .from('agenda_events').select('source').eq('id', eventId).maybeSingle();
  const patch: any = { updated_at: new Date().toISOString() };
  if (changes.name != null) patch.name = changes.name;
  if (changes.time != null) patch.time = hhmm(changes.time);
  if (changes.category != null) patch.category = changes.category;
  if (changes.notifyMinutesBefore != null) patch.notify_minutes_before = changes.notifyMinutesBefore;
  // DX F4: 'intervention' también se promueve — si el user edita el evento en
  // /agenda, la reconciliación (syncInterventionEvents) deja de pisarlo.
  // La fila conserva intervention_key → completar sigue corriendo logCompletion.
  if (ev?.source === 'protocol' || ev?.source === 'chronotype' || ev?.source === 'intervention') patch.source = 'manual_override';
  await supabase.from('agenda_events').update(patch).eq('id', eventId).eq('user_id', userId);

  if (changes.time != null || changes.notifyMinutesBefore != null) {
    const today = getLocalToday();
    const { data: full } = await supabase
      .from('agenda_events').select('time, notify_minutes_before').eq('id', eventId).maybeSingle();
    if (full) {
      const scheduledAt = scheduledAtISO(today, full.time);
      await supabase.from('agenda_event_logs').update({
        scheduled_at: scheduledAt,
        notify_at: notifyAtISO(scheduledAt, full.notify_minutes_before ?? 0),
        notified_at: null, // re-armar la notif
      }).eq('user_id', userId).eq('event_id', eventId).eq('date', today);
    }
  }
}

/** Soft delete. Si era de protocolo/cronotipo, lo registra en disabled para que la auto-gen no lo recree. */
export async function deleteAgendaEvent(userId: string, eventId: string): Promise<void> {
  const { data: ev } = await supabase
    .from('agenda_events').select('source, name, time').eq('id', eventId).maybeSingle();
  await supabase.from('agenda_events')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', eventId).eq('user_id', userId);
  // DX F4: 'intervention' entra al mismo mecanismo — quitarlo de la agenda
  // registra su key para que la reconciliación no lo recree.
  if (ev && (ev.source === 'protocol' || ev.source === 'chronotype' || ev.source === 'intervention')) {
    const key = eventKey(ev.name, ev.time);
    const disabled = await getDisabledKeys(userId);
    disabled.add(key);
    await supabase.from('user_day_preferences')
      .upsert({ user_id: userId, disabled_protocol_events: Array.from(disabled) }, { onConflict: 'user_id' });
  }
}

/** Marca el estado de una instancia (completed/skipped/pending). */
export async function setEventStatus(userId: string, logId: string, status: AgendaStatus): Promise<void> {
  const patch: any = { status };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  await supabase.from('agenda_event_logs').update(patch).eq('id', logId).eq('user_id', userId);
}

// ═══ SYNC HOY ↔ AGENDA (AGENDA-COMPLETE F1) ═══

/**
 * Matching electrón booleano ↔ evento de agenda por patrón de NOMBRE del evento.
 * Por nombre y NO por category: las categorías reales (nutrition/optimization/rest/mind)
 * agrupan cosas distintas (ej. 'optimization' = luz solar + suplementos + lentes rojos)
 * y matchear por categoría completaría eventos que no corresponden.
 *
 * Solo electrones booleanos NO verificados: los verificados (meditation, breathwork,
 * strength, supplements, cardio, checkin) derivan `completed` de actividad real y no
 * deben auto-otorgarse desde la agenda. `journal` tampoco: su award sucede al guardar
 * la entrada en /journal.
 */
const ELECTRON_EVENT_MATCHERS: { source: ElectronSource; pattern: RegExp }[] = [
  { source: 'sunlight', pattern: /luz solar/i },
  { source: 'cold_shower', pattern: /ducha fr|baño fr|exposición a fr|terapia de fr/i },
  { source: 'grounding', pattern: /grounding|descalz/i },
  { source: 'red_glasses', pattern: /lentes rojos|luz roja/i },
  { source: 'screen_time_cutoff', pattern: /pantallas|detox digital/i },
];

/**
 * HOY → Agenda: al completar/revocar un electrón booleano en HOY, marca los eventos de
 * agenda de hoy que matchean como completed (o los regresa a pending). Idempotente:
 * solo toca logs cuyo status necesita cambiar. Defensivo: nunca lanza (affected 0 si falla).
 */
export async function syncCompletionFromElectron(
  userId: string,
  electronSource: string,
  completed: boolean,
): Promise<{ affected: number }> {
  try {
    const matcher = ELECTRON_EVENT_MATCHERS.find((m) => m.source === electronSource);
    if (!matcher) return { affected: 0 };
    const today = getLocalToday();
    const { data: logs } = await supabase
      .from('agenda_event_logs')
      .select('id, status, agenda_events!inner(name, is_active)')
      .eq('user_id', userId)
      .eq('date', today)
      .in('status', completed ? ['pending', 'snoozed'] : ['completed']);
    const targets = ((logs ?? []) as any[]).filter((l) => {
      const ev = l.agenda_events;
      return ev && ev.is_active !== false && matcher.pattern.test(ev.name ?? '');
    });
    if (targets.length === 0) return { affected: 0 };
    await supabase
      .from('agenda_event_logs')
      .update({
        status: completed ? 'completed' : 'pending',
        completed_at: completed ? new Date().toISOString() : null,
      })
      .in('id', targets.map((l) => l.id));
    DeviceEventEmitter.emit('day_changed');
    return { affected: targets.length };
  } catch (e) {
    logWarn('[agenda] syncCompletionFromElectron failed', e);
    return { affected: 0 };
  }
}

/**
 * Agenda → HOY: al completar un evento en /agenda, si su nombre matchea un electrón
 * booleano no-verificado, lo otorga (dual write blob daily_electrons + electron_logs,
 * mismo patrón que HoyEditorialSection.persistToggle). Usa el MISMO idempotencyKey
 * determinístico (user:source:día) que el toggle de HOY → completar en ambas
 * superficies produce UN solo log. Devuelve true si sincronizó un electrón.
 */
export async function syncElectronFromEvent(
  userId: string,
  eventName: string,
  completed: boolean,
): Promise<boolean> {
  try {
    const matcher = ELECTRON_EVENT_MATCHERS.find((m) => m.pattern.test(eventName ?? ''));
    if (!matcher) return false;
    const source = matcher.source;
    const today = getLocalToday();
    // Blob daily_electrons: el compiler lee `completed` de los no-verificados de aquí.
    const { data: row } = await supabase
      .from('daily_electrons').select('electrons')
      .eq('user_id', userId).eq('date', today).maybeSingle();
    const states = { ...((row?.electrons as Record<string, boolean>) ?? {}), [source]: completed };
    await supabase
      .from('daily_electrons')
      .upsert({ user_id: userId, date: today, electrons: states }, { onConflict: 'user_id,date' });
    if (completed) {
      await awardBooleanElectron(userId, source, { idempotencyKey: `${userId}:${source}:${today}` });
    } else {
      await revokeBooleanElectron(userId, source);
    }
    DeviceEventEmitter.emit('electrons_changed');
    return true;
  } catch (e) {
    logWarn('[agenda] syncElectronFromEvent failed', e);
    return false;
  }
}

/** Pospone una instancia: corre scheduled_at + recalcula notify_at + re-arma la notif. */
export async function snoozeEvent(userId: string, logId: string, minutes: number): Promise<void> {
  const { data: log } = await supabase
    .from('agenda_event_logs')
    .select('scheduled_at, agenda_events(notify_minutes_before)')
    .eq('id', logId).maybeSingle();
  if (!log) return;
  const newSched = new Date(new Date((log as any).scheduled_at).getTime() + minutes * 60000).toISOString();
  const notifyMin = (log as any).agenda_events?.notify_minutes_before ?? 0;
  await supabase.from('agenda_event_logs').update({
    status: 'snoozed', scheduled_at: newSched,
    notify_at: notifyAtISO(newSched, notifyMin), notified_at: null,
  }).eq('id', logId).eq('user_id', userId);
}
