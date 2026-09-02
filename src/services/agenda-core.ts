/**
 * Agenda — núcleo PURO (sin RN, sin supabase). Testeable con node/vitest.
 *
 * 31-ago-2026 (pendientes 12.1 y 12.3). Dos decisiones que antes vivían
 * repartidas entre agenda-service.ts y app/agenda.tsx, sin test:
 *
 *  1. EL ORDEN DEL DÍA. La agenda ordenaba por `time` (la hora plantilla),
 *     así que un evento pospuesto +60 min seguía pintado en su hueco viejo,
 *     y un evento con hora vacía o rota ('' / null / 'HH:MM' inválido)
 *     caía al PRINCIPIO de la lista y además se etiquetaba NOCHE, porque
 *     parseInt('') es NaN y NaN no es < 12 ni < 18. Aquí la hora efectiva
 *     de un pospuesto es su scheduled_at real, y lo que no tiene hora va al
 *     final, bajo su propio divisor.
 *
 *  2. EL RECORDATORIO QUE YA PASÓ. notify_at se calculaba como
 *     scheduled_at menos N minutos SIN mirar el reloj. Las instancias del
 *     día se crean cuando el usuario abre /agenda; si abre a las 21:49, los
 *     recordatorios de las 07:20 nacen ya vencidos y el despachador
 *     (dispatch-agenda-notifications, corre cada minuto) los manda en ese
 *     instante. Evidencia en la base del dueño: "Eliminar aceites vegetales
 *     · Luz roja · en breve" (evento de 07:30) entregado a las 21:50, 19:34,
 *     20:27, 19:10, 15:09, 16:51 y 21:35 en días distintos. Un recordatorio
 *     cuyo momento ya pasó no se programa: null.
 */

export type AgendaDayPart = 'morning' | 'afternoon' | 'evening' | 'unscheduled';

export const DAY_PART_LABEL: Record<AgendaDayPart, string> = {
  morning: 'MAÑANA',
  afternoon: 'TARDE',
  evening: 'NOCHE',
  unscheduled: 'SIN HORA',
};

/** 'HH:MM:SS' o 'HH:MM' → 'HH:MM'. Vacío si no hay nada. */
export function hhmm(time: string | null | undefined): string {
  return (time ?? '').slice(0, 5);
}

/** 'HH:MM' → minutos desde medianoche, o null si no es una hora válida. */
export function parseHHMM(time: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((time ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/** Date → 'HH:MM' en hora LOCAL del device (la agenda vive en hora local). */
export function localHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Lo mínimo que el orden necesita saber de una instancia. */
export interface AgendaOrderable {
  id: string;
  name: string;
  time: string;
  status: string;
  scheduledAt: string;
}

/**
 * Hora efectiva de una instancia: un pospuesto vive donde cayó
 * (scheduled_at, que snoozeEvent corre +N min); el resto en su hora plantilla.
 * null = sin hora (va al final).
 */
export function effectiveTimeHHMM(ev: AgendaOrderable): string | null {
  if (ev.status === 'snoozed') {
    const d = new Date(ev.scheduledAt);
    if (!Number.isNaN(d.getTime())) return localHHMM(d);
  }
  const t = hhmm(ev.time);
  return parseHHMM(t) === null ? null : t;
}

export function dayPartOf(time: string | null): AgendaDayPart {
  const min = parseHHMM(time);
  if (min === null) return 'unscheduled';
  const h = Math.floor(min / 60);
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

/**
 * Orden del día: hora efectiva ascendente; sin hora al final; empates por
 * nombre (es) y luego id, para que dos renders den la misma lista. No muta.
 */
export function sortAgendaInstances<T extends AgendaOrderable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ma = parseHHMM(effectiveTimeHHMM(a));
    const mb = parseHHMM(effectiveTimeHHMM(b));
    if (ma === null && mb === null) return a.name.localeCompare(b.name, 'es') || a.id.localeCompare(b.id);
    if (ma === null) return 1;
    if (mb === null) return -1;
    return ma - mb || a.name.localeCompare(b.name, 'es') || a.id.localeCompare(b.id);
  });
}

export type AgendaListItem<T> = T | { divider: string };

/**
 * Intercala divisores MAÑANA (<12h) / TARDE (<18h) / NOCHE / SIN HORA donde
 * cambia la franja. Ordena ANTES de intercalar: nunca confía en el orden de
 * entrada (esa confianza es la que dejaba pospuestos fuera de sitio).
 */
export function insertDayPartDividers<T extends AgendaOrderable>(events: T[]): AgendaListItem<T>[] {
  const out: AgendaListItem<T>[] = [];
  let last: AgendaDayPart | null = null;
  for (const ev of sortAgendaInstances(events)) {
    const part = dayPartOf(effectiveTimeHHMM(ev));
    if (part !== last) {
      out.push({ divider: DAY_PART_LABEL[part] });
      last = part;
    }
    out.push(ev);
  }
  return out;
}

/**
 * notify_at = scheduledAt menos minutesBefore, o null si no hay recordatorio.
 * Tres casos según el reloj (nowMs):
 *   - el disparo aún no llega → esa hora.
 *   - el disparo ya pasó pero el EVENTO todavía no (4EP M1: evento de 07:30
 *     abierto a las 07:25 con aviso de 10) → AHORA: avisa ya, "en breve".
 *   - el evento ya pasó → null. Un recordatorio de la mañana creado de noche
 *     no se programa: el despachador lo mandaría en el acto, a la hora equivocada.
 */
export function notifyAtISO(
  scheduledISO: string,
  minutesBefore: number | null | undefined,
  nowMs: number = Date.now(),
): string | null {
  if (!minutesBefore || minutesBefore <= 0) return null;
  const sched = new Date(scheduledISO).getTime();
  if (!Number.isFinite(sched)) return null;
  const fireMs = sched - minutesBefore * 60000;
  if (fireMs > nowMs) return new Date(fireMs).toISOString();
  if (sched > nowMs) return new Date(nowMs).toISOString();
  return null;
}

/** Margen mínimo del aviso de un pospuesto: un minuto, para que caiga en el siguiente tick del cron. */
export const SNOOZE_MIN_LEAD_MS = 60_000;

/**
 * notify_at de un evento POSPUESTO (4EP G2). Posponer es la única intención
 * explícita de "avísame otra vez": con aviso de 15 y "Posponer 15" el disparo
 * caería ahora mismo o en el pasado, y null lo dejaba en silencio (peor que
 * antes, que avisaba en el acto). Regla: max(newSched - lead, now + 1 min).
 */
export function snoozeNotifyAtISO(
  newScheduledISO: string,
  minutesBefore: number | null | undefined,
  nowMs: number = Date.now(),
): string | null {
  if (!minutesBefore || minutesBefore <= 0) return null;
  const sched = new Date(newScheduledISO).getTime();
  if (!Number.isFinite(sched)) return null;
  const fireMs = Math.max(sched - minutesBefore * 60000, nowMs + SNOOZE_MIN_LEAD_MS);
  return new Date(fireMs).toISOString();
}
