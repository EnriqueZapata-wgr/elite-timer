/**
 * Tests de feed-core (Comunidad V1.1 §2.4) — emisor day_complete + guards.
 */
import { describe, it, expect } from 'vitest';
import {
  buildDayCompletePayload,
  dayCompletePayloadIsClean,
  filterAllowedFeedRows,
  isDayComplete,
  isFeedEventAllowed,
  DAY_COMPLETE_PAYLOAD_FIELDS,
  type FriendFeedRow,
} from '../feed-core';
import { FEED_EVENT_TYPES, FORBIDDEN_FEED_EVENTS } from '@/src/constants/community';

describe('isFeedEventAllowed', () => {
  it('acepta todos los eventos del whitelist (incluido day_complete V1.1)', () => {
    for (const t of FEED_EVENT_TYPES) {
      expect(isFeedEventAllowed(t), `rechazó evento whitelisteado: ${t}`).toBe(true);
    }
    expect(isFeedEventAllowed('day_complete')).toBe(true);
  });

  it('rechaza todos los eventos clínicos prohibidos', () => {
    for (const t of FORBIDDEN_FEED_EVENTS) {
      expect(isFeedEventAllowed(t), `aceptó evento clínico: ${t}`).toBe(false);
    }
  });

  it('rechaza tipos desconocidos', () => {
    expect(isFeedEventAllowed('random_event')).toBe(false);
    expect(isFeedEventAllowed('')).toBe(false);
  });
});

describe('isDayComplete', () => {
  it('100 = día completo; menos no', () => {
    expect(isDayComplete(100)).toBe(true);
    expect(isDayComplete(99)).toBe(false);
    expect(isDayComplete(75)).toBe(false);
    expect(isDayComplete(0)).toBe(false);
  });

  it('valores no finitos / null no completan', () => {
    expect(isDayComplete(null)).toBe(false);
    expect(isDayComplete(undefined)).toBe(false);
    expect(isDayComplete(NaN)).toBe(false);
    expect(isDayComplete(Infinity)).toBe(false);
  });
});

describe('buildDayCompletePayload', () => {
  it('payload válido con fecha local y score', () => {
    expect(buildDayCompletePayload('2026-07-10', 100)).toEqual({
      date: '2026-07-10',
      atp_score: 100,
    });
  });

  it('redondea el score', () => {
    expect(buildDayCompletePayload('2026-07-10', 99.6)?.atp_score).toBe(100);
  });

  it('rechaza fechas mal formadas (ISO datetime, vacía, texto)', () => {
    expect(buildDayCompletePayload('2026-07-10T00:00:00Z', 100)).toBeNull();
    expect(buildDayCompletePayload('', 100)).toBeNull();
    expect(buildDayCompletePayload('hoy', 100)).toBeNull();
  });

  it('rechaza scores fuera de rango o no finitos', () => {
    expect(buildDayCompletePayload('2026-07-10', -1)).toBeNull();
    expect(buildDayCompletePayload('2026-07-10', 101)).toBeNull();
    expect(buildDayCompletePayload('2026-07-10', NaN)).toBeNull();
  });

  it('el payload emitido pasa el guard de limpieza (solo date + atp_score)', () => {
    const p = buildDayCompletePayload('2026-07-10', 100)!;
    expect(dayCompletePayloadIsClean(p as unknown as Record<string, unknown>)).toBe(true);
    expect(Object.keys(p).sort()).toEqual([...DAY_COMPLETE_PAYLOAD_FIELDS].sort());
  });
});

describe('dayCompletePayloadIsClean', () => {
  it('rechaza cualquier key extra (defensa anti-fuga)', () => {
    expect(dayCompletePayloadIsClean({ date: '2026-07-10', atp_score: 100, dx: 'leak' })).toBe(false);
    expect(dayCompletePayloadIsClean({ date: '2026-07-10', atp_score: 100, symptoms: [] })).toBe(false);
  });

  it('acepta subconjuntos del whitelist', () => {
    expect(dayCompletePayloadIsClean({ date: '2026-07-10' })).toBe(true);
    expect(dayCompletePayloadIsClean({})).toBe(true);
  });
});

describe('filterAllowedFeedRows', () => {
  const row = (event_type: string): FriendFeedRow => ({
    event_id: 'e1', friend_user_id: 'u1', username: 'ana', display_name: 'Ana',
    avatar_url: null, event_type: event_type as FriendFeedRow['event_type'],
    event_date: '2026-07-10', payload: {}, created_at: '2026-07-10T12:00:00Z',
  });

  it('deja pasar eventos del whitelist y filtra los demás', () => {
    const rows = [row('day_complete'), row('symptom_logged'), row('rank_up'), row('hacked')];
    const out = filterAllowedFeedRows(rows);
    expect(out.map((r) => r.event_type)).toEqual(['day_complete', 'rank_up']);
  });
});
