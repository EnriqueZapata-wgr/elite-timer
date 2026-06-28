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
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { generateUUID } from '@/src/services/routine-service';
import { generateDailyPlan } from '@/src/services/protocol-builder-service';
import { warn as logWarn } from '@/src/lib/logger';

export type AgendaSource = 'manual' | 'protocol' | 'chronotype' | 'manual_override';
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
  try {
    const { data: existing } = await supabase
      .from('agenda_events').select('name, time').eq('user_id', userId);
    const existingKeys = new Set((existing ?? []).map((e: any) => eventKey(e.name, e.time)));
    const disabled = await getDisabledKeys(userId);

    const toInsert: any[] = [];
    const pushEvent = (name: string, time: string, category: string, source: AgendaSource, duration?: number | null) => {
      const key = eventKey(name, time);
      if (existingKeys.has(key) || disabled.has(key)) return;
      existingKeys.add(key);
      toInsert.push({
        id: generateUUID(), user_id: userId, name, time: hhmm(time), category,
        source, duration_min: duration ?? null, notify_minutes_before: 0, is_active: true,
      });
    };

    // Cronotipo → despertar + dormir
    try {
      const { data: chrono } = await supabase
        .from('user_chronotype').select('schedule').eq('user_id', userId).maybeSingle();
      const wake = (chrono as any)?.schedule?.wake_time;
      const sleep = (chrono as any)?.schedule?.sleep_time;
      if (typeof wake === 'string' && /^\d{1,2}:\d{2}/.test(wake)) pushEvent('Despertar', wake, 'ritmo', 'chronotype');
      if (typeof sleep === 'string' && /^\d{1,2}:\d{2}/.test(sleep)) pushEvent('Dormir', sleep, 'sueño', 'chronotype');
    } catch (e) { logWarn('[agenda] chronotype gen failed', e); }

    // Protocolo → acciones del plan del día (con hora)
    try {
      const plan = await generateDailyPlan(userId, targetDate);
      for (const a of plan?.actions ?? []) {
        if (!a.scheduled_time || !a.name) continue;
        pushEvent(a.name, a.scheduled_time, a.category || 'custom', 'protocol', a.duration_min);
      }
    } catch (e) { logWarn('[agenda] generateDailyPlan failed', e); }

    if (toInsert.length > 0) {
      await supabase.from('agenda_events').insert(toInsert);
    }
  } catch (e) {
    logWarn('[agenda] generateAgendaEvents failed', e);
  }
  await ensureLogsForDate(userId, targetDate);
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
    const { data: logs } = await supabase
      .from('agenda_event_logs')
      .select('id, event_id, status, scheduled_at, agenda_events(name, time, category, source, notify_minutes_before, is_active)')
      .eq('user_id', userId).eq('date', targetDate);
    const instances: AgendaEventInstance[] = [];
    for (const l of (logs ?? []) as any[]) {
      const ev = l.agenda_events;
      if (!ev || ev.is_active === false) continue;
      instances.push({
        id: l.id, eventId: l.event_id, name: ev.name, time: hhmm(ev.time),
        category: ev.category, status: l.status, scheduledAt: l.scheduled_at,
        notifyMinutesBefore: ev.notify_minutes_before ?? 0, source: ev.source,
      });
    }
    instances.sort((a, b) => a.time.localeCompare(b.time));
    return instances;
  } catch (e) {
    logWarn('[agenda] getAgendaForDate failed', e);
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
  if (ev?.source === 'protocol' || ev?.source === 'chronotype') patch.source = 'manual_override';
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
  if (ev && (ev.source === 'protocol' || ev.source === 'chronotype')) {
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
