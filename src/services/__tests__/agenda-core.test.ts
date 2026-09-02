import { describe, it, expect } from 'vitest';
import {
  hhmm, parseHHMM, effectiveTimeHHMM, dayPartOf, sortAgendaInstances,
  insertDayPartDividers, notifyAtISO, snoozeNotifyAtISO, SNOOZE_MIN_LEAD_MS,
} from '@/src/services/agenda-core';

// 31-ago-2026 · pendientes 12.1 (orden) y 12.3 (recordatorios a destiempo).

const ev = (id: string, time: string, over: Partial<{ status: string; scheduledAt: string; name: string }> = {}) => ({
  id, name: over.name ?? id, time, status: over.status ?? 'pending',
  scheduledAt: over.scheduledAt ?? `2026-08-31T${time || '00:00'}:00`,
});

describe('hhmm / parseHHMM', () => {
  it('recorta segundos y rechaza lo que no es hora', () => {
    expect(hhmm('07:30:00')).toBe('07:30');
    expect(hhmm(null)).toBe('');
    expect(parseHHMM('07:30')).toBe(450);
    expect(parseHHMM('')).toBeNull();
    expect(parseHHMM(null)).toBeNull();
    expect(parseHHMM('25:00')).toBeNull();
    expect(parseHHMM('abc')).toBeNull();
  });
});

describe('orden del día (12.1)', () => {
  it('hora ascendente, y lo que no tiene hora va AL FINAL, no al principio', () => {
    const list = [ev('c', '21:30'), ev('sin', ''), ev('a', '07:00'), ev('b', '14:00')];
    expect(sortAgendaInstances(list).map((e) => e.id)).toEqual(['a', 'b', 'c', 'sin']);
  });

  it('un pospuesto vive donde cayó (scheduled_at), no en su hora plantilla', () => {
    const d = new Date(2026, 7, 31, 9, 15, 0); // local 09:15
    const snoozed = ev('s', '07:30', { status: 'snoozed', scheduledAt: d.toISOString() });
    expect(effectiveTimeHHMM(snoozed)).toBe('09:15');
    const order = sortAgendaInstances([snoozed, ev('x', '08:00'), ev('y', '10:00')]).map((e) => e.id);
    expect(order).toEqual(['x', 's', 'y']);
  });

  it('un pospuesto con scheduled_at roto cae a su hora plantilla (no truena)', () => {
    expect(effectiveTimeHHMM(ev('s', '07:30', { status: 'snoozed', scheduledAt: 'nada' }))).toBe('07:30');
  });

  it('es determinista: mismo input, mismo orden, sin mutar', () => {
    const list = [ev('b', '08:00'), ev('a', '08:00')];
    const a = sortAgendaInstances(list).map((e) => e.id);
    const b = sortAgendaInstances(list).map((e) => e.id);
    expect(a).toEqual(['a', 'b']);
    expect(b).toEqual(a);
    expect(list[0].id).toBe('b');
  });

  it('divisores: MAÑANA <12, TARDE <18, NOCHE, y SIN HORA al final (antes NaN caía en NOCHE al inicio)', () => {
    const items = insertDayPartDividers([ev('sin', ''), ev('n', '20:00'), ev('m', '07:00'), ev('t', '13:00')]);
    const labels = items.map((i) => ('divider' in i ? `[${i.divider}]` : i.id));
    expect(labels).toEqual(['[MAÑANA]', 'm', '[TARDE]', 't', '[NOCHE]', 'n', '[SIN HORA]', 'sin']);
    expect(dayPartOf('11:59')).toBe('morning');
    expect(dayPartOf('12:00')).toBe('afternoon');
    expect(dayPartOf('18:00')).toBe('evening');
    expect(dayPartOf(null)).toBe('unscheduled');
  });
});

describe('notifyAtISO (12.3): un recordatorio vencido al nacer no se programa', () => {
  const sched = '2026-08-22T13:30:00.000Z'; // 07:30 CDMX

  it('EL CASO DEL DUEÑO: instancia creada a las 21:49 para un evento de 07:30 → null (antes: push a las 21:50)', () => {
    const now = new Date('2026-08-23T03:49:09Z').getTime();
    expect(notifyAtISO(sched, 10, now)).toBeNull();
  });

  it('con el reloj antes del disparo sí programa, restando los minutos', () => {
    const now = new Date('2026-08-22T12:00:00Z').getTime();
    expect(notifyAtISO(sched, 10, now)).toBe('2026-08-22T13:20:00.000Z');
  });

  it('4EP M1: disparo pasado pero evento inminente → AHORA (07:30 abierto a las 07:25, aviso 10)', () => {
    const now = new Date('2026-08-22T13:25:00Z').getTime();
    expect(notifyAtISO(sched, 10, now)).toBe('2026-08-22T13:25:00.000Z');
    // el instante exacto del disparo también avisa ya
    expect(notifyAtISO(sched, 10, new Date('2026-08-22T13:20:00Z').getTime())).toBe('2026-08-22T13:20:00.000Z');
  });

  it('4EP M1: evento ya pasado → null (el caso de la noche se mantiene)', () => {
    expect(notifyAtISO(sched, 10, new Date('2026-08-22T13:30:00Z').getTime())).toBeNull();
    expect(notifyAtISO(sched, 10, new Date('2026-08-22T20:00:00Z').getTime())).toBeNull();
  });

  it('sin minutos (0/null) o con fecha rota → null', () => {
    expect(notifyAtISO(sched, 0, 0)).toBeNull();
    expect(notifyAtISO(sched, null, 0)).toBeNull();
    expect(notifyAtISO('nada', 10, 0)).toBeNull();
  });
});

describe('snoozeNotifyAtISO (4EP G2): posponer siempre re-arma el aviso', () => {
  const now = new Date('2026-08-22T14:00:00Z').getTime();

  it('EL CASO GRAVE: aviso 15 + "Posponer 15" → avisa en 1 min, no silencio', () => {
    const newSched = new Date(now + 15 * 60_000).toISOString();
    expect(snoozeNotifyAtISO(newSched, 15, now)).toBe(new Date(now + SNOOZE_MIN_LEAD_MS).toISOString());
  });

  it('aviso 15 + "Posponer 60" → 15 min antes del nuevo momento', () => {
    const newSched = new Date(now + 60 * 60_000).toISOString();
    expect(snoozeNotifyAtISO(newSched, 15, now)).toBe(new Date(now + 45 * 60_000).toISOString());
  });

  it('aviso 30 + "Posponer 15" (lead mayor que el snooze) → también 1 min', () => {
    const newSched = new Date(now + 15 * 60_000).toISOString();
    expect(snoozeNotifyAtISO(newSched, 30, now)).toBe(new Date(now + SNOOZE_MIN_LEAD_MS).toISOString());
  });

  it('sin aviso configurado → null; fecha rota → null', () => {
    expect(snoozeNotifyAtISO(new Date(now).toISOString(), 0, now)).toBeNull();
    expect(snoozeNotifyAtISO('nada', 15, now)).toBeNull();
  });
});
