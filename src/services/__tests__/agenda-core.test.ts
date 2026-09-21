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

// 21-sep-2026 · AGENDA DEL DÍA UNO ELITE: tomas del plan de Enrique.

import {
  tomasConHora, etiquetaPlanCoach, nombreBaseDeToma, indiceOrigenTomas, claveDeToma, HORA_POR_TOMA,
} from '@/src/services/agenda-core';

describe('tomas de suplemento con hora (21-sep-2026)', () => {
  it('sin dose_times, una toma en su timing con la hora de la tabla', () => {
    expect(tomasConHora({ name: 'Magnesio', timing: 'evening' })).toEqual([
      { name: 'Magnesio · noche', time: '21:00', label: 'noche' },
    ]);
    expect(tomasConHora({ name: 'Omega 3', timing: 'with_food' })[0].time).toBe(HORA_POR_TOMA['comida']);
  });
  it('dose_times manda: etiquetas y horas libres, una por toma', () => {
    const t = tomasConHora({ name: 'Creatina', timing: 'morning', dose_times: ['mañana', '16:30'] });
    expect(t.map((x) => x.time)).toEqual(['08:00', '16:30']);
    expect(t[1].name).toBe('Creatina · toma');
  });
  it('timing NULL (plan del coach sin momento) NO cae a 08:00: se omite', () => {
    expect(tomasConHora({ name: 'Vitamina D', timing: null })).toEqual([]);
    expect(tomasConHora({ name: 'Vitamina D', timing: 'cuando_sea' })).toEqual([]);
    expect(tomasConHora({ name: 'Zinc', timing: null, dose_times: ['a la hora que sea'] })).toEqual([]);
  });
  it('sin nombre no hay toma', () => {
    expect(tomasConHora({ name: '', timing: 'morning' })).toEqual([]);
  });
});

describe('etiqueta "Plan de Enrique" (por la fila que originó la toma, no por nombre)', () => {
  const fichas = [
    { id: 'c1', name: 'Magnesio (glicinato)', timing: 'evening', source: 'coach', is_plan: true },
    { id: 'c2', name: 'Omega 3', timing: 'morning', dose_times: ['16:30'], source: 'coach', is_plan: true },
    { id: 'p1', name: 'Creatina', timing: 'morning', source: 'manual', is_plan: true },
  ];
  const origen = indiceOrigenTomas(fichas);
  it('la toma de una ficha del coach lleva la etiqueta; las demás no', () => {
    expect(etiquetaPlanCoach({ name: 'Magnesio (glicinato) · noche', time: '21:00' }, origen, 'Enrique')).toBe('Plan de Enrique');
    expect(etiquetaPlanCoach({ name: 'Omega 3 · toma', time: '16:30' }, origen, 'Enrique')).toBe('Plan de Enrique');
    expect(etiquetaPlanCoach({ name: 'Creatina · mañana', time: '08:00' }, origen, 'Enrique')).toBeNull();
    expect(etiquetaPlanCoach({ name: 'Despertar', time: '06:30' }, origen, 'Enrique')).toBeNull();
  });
  it('una ficha PROPIA con el mismo nombre que una del coach no sale como "Plan de Enrique"', () => {
    // Antes se etiquetaba por nombre base: la creatina propia salía como del
    // coach solo por llamarse igual que una ficha del coach.
    const o = indiceOrigenTomas([
      { id: 'c9', name: 'Creatina', timing: 'evening', source: 'coach', is_plan: true },
      { id: 'p9', name: 'Creatina', timing: 'morning', source: 'manual', is_plan: true },
    ]);
    expect(etiquetaPlanCoach({ name: 'Creatina · noche', time: '21:00' }, o, 'Enrique')).toBe('Plan de Enrique');
    expect(etiquetaPlanCoach({ name: 'Creatina · mañana', time: '08:00' }, o, 'Enrique')).toBeNull();
  });
  it('misma toma desde las dos fichas (coach y propia) es ambigua: no se inventa', () => {
    const o = indiceOrigenTomas([
      { id: 'c9', name: 'Zinc', timing: 'evening', source: 'coach', is_plan: true },
      { id: 'p9', name: 'Zinc', timing: 'evening', source: 'manual', is_plan: true },
    ]);
    expect(o.get(claveDeToma('Zinc · noche', '21:00'))).toEqual({ deCoach: true, propia: true });
    expect(etiquetaPlanCoach({ name: 'Zinc · noche', time: '21:00' }, o, 'Enrique')).toBeNull();
  });
  it('las eventuales (is_plan false) y las fichas sin hora no entran al índice; la clave normaliza hora y nombre', () => {
    const o = indiceOrigenTomas([
      { id: 'e1', name: 'Vitamina C', timing: 'morning', source: 'coach', is_plan: false },
      { id: 'c2', name: 'Vitamina D', timing: null, source: 'coach', is_plan: true },
    ]);
    expect(o.size).toBe(0);
    expect(claveDeToma('  Omega 3 · Noche ', '21:00:00')).toBe(claveDeToma('omega 3 · noche', '21:00'));
  });
  it('nombre base: sin etiqueta de toma, en minúsculas', () => {
    expect(nombreBaseDeToma('Omega 3 · noche')).toBe('omega 3');
    expect(nombreBaseDeToma('  Zinc ')).toBe('zinc');
  });
});
