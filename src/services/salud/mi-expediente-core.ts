/**
 * mi-expediente-core — construcción PURA del timeline del registro epigenético
 * (Mega-Sprint B · B5). Sin supabase/react-native → testeable node-only.
 *
 * Doctrina registro_epigenetico_3_funciones: el expediente es el eje temporal que
 * cruza síntomas (inicio/fin), intervenciones activadas, labs y mediciones. ARGOS
 * puede leerlo para correlacionar ("en tu mes previo a PCR elevada, 40% días sin sol").
 */

export type TimelineKind =
  | 'symptom_start' | 'symptom_resolved' | 'intervention_activated'
  | 'lab' | 'measurement' | 'glucose' | 'ketones';

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string;        // ISO
  title: string;
  detail?: string;
}

/** Fuentes crudas (cada una fail-soft en el servicio). */
export interface TimelineSources {
  symptoms: { id: string; name: string; started_at: string; resolved_at: string | null; severity: number }[];
  interventionsActivated: { id: string; name: string; activated_at: string | null }[];
  labs: { marker: string; measured_at: string }[];
  measurements: { date: string; label: string }[];
  glucose: { value: number; at: string }[];
  ketones: { value: number; at: string }[];
}

const ICON: Record<TimelineKind, string> = {
  symptom_start: '🩺', symptom_resolved: '✅', intervention_activated: '💊',
  lab: '🧪', measurement: '📊', glucose: '🩸', ketones: '🔥',
};

export function iconFor(kind: TimelineKind): string {
  return ICON[kind] ?? '•';
}

/** Fusiona todas las fuentes en un timeline ordenado (más reciente primero). */
export function buildTimeline(src: TimelineSources): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const s of src.symptoms) {
    if (s.started_at) {
      events.push({ id: `sym-start-${s.id}`, kind: 'symptom_start', at: s.started_at, title: `Síntoma: ${s.name}`, detail: `severidad ${s.severity}/5` });
    }
    if (s.resolved_at) {
      events.push({ id: `sym-res-${s.id}`, kind: 'symptom_resolved', at: s.resolved_at, title: `Resuelto: ${s.name}` });
    }
  }
  for (const iv of src.interventionsActivated) {
    if (iv.activated_at) {
      events.push({ id: `iv-${iv.id}`, kind: 'intervention_activated', at: iv.activated_at, title: `Activaste: ${iv.name}` });
    }
  }
  for (const l of src.labs) {
    if (l.measured_at) {
      events.push({ id: `lab-${l.marker}-${l.measured_at}`, kind: 'lab', at: l.measured_at, title: `Lab: ${l.marker}` });
    }
  }
  for (const m of src.measurements) {
    if (m.date) {
      events.push({ id: `meas-${m.date}-${m.label}`, kind: 'measurement', at: m.date, title: m.label });
    }
  }
  for (const g of src.glucose) {
    if (g.at) events.push({ id: `glu-${g.at}`, kind: 'glucose', at: g.at, title: `Glucosa ${g.value} mg/dL` });
  }
  for (const k of src.ketones) {
    if (k.at) events.push({ id: `ket-${k.at}`, kind: 'ketones', at: k.at, title: `Cetonas ${k.value} mmol/L` });
  }

  return events
    .filter((e) => !isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** Agrupa el timeline por mes ("julio 2026") preservando el orden. */
export function groupByMonth(events: TimelineEvent[]): { month: string; events: TimelineEvent[] }[] {
  const groups: { month: string; events: TimelineEvent[] }[] = [];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  for (const e of events) {
    const d = new Date(e.at);
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const last = groups[groups.length - 1];
    if (last && last.month === label) last.events.push(e);
    else groups.push({ month: label, events: [e] });
  }
  return groups;
}

/** Fecha corta "16 jul" para el marcador del evento. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${M[d.getMonth()]}`;
}
