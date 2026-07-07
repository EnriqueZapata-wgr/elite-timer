import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_PREFS_DEFAULTS,
  timeToMinutes,
  isInQuietHours,
  shouldNotify,
  type NotificationPrefs,
} from '../notification-prefs-core';

function prefs(p: Partial<NotificationPrefs> = {}): NotificationPrefs {
  return { ...NOTIFICATION_PREFS_DEFAULTS, ...p };
}

const MIN = (h: number, m = 0) => h * 60 + m;

describe('timeToMinutes', () => {
  it('parsea HH:MM y HH:MM:SS', () => {
    expect(timeToMinutes('07:30')).toBe(450);
    expect(timeToMinutes('22:00:00')).toBe(1320);
  });
  it('inválidos → null', () => {
    expect(timeToMinutes(null)).toBeNull();
    expect(timeToMinutes('25:00')).toBeNull();
    expect(timeToMinutes('basura')).toBeNull();
  });
});

describe('isInQuietHours', () => {
  it('ventana normal (13:00-15:00)', () => {
    const p = prefs({ quiet_hours_start: '13:00', quiet_hours_end: '15:00' });
    expect(isInQuietHours(p, MIN(14))).toBe(true);
    expect(isInQuietHours(p, MIN(12))).toBe(false);
    expect(isInQuietHours(p, MIN(15))).toBe(false); // fin exclusivo
  });

  it('ventana que cruza medianoche (22:00-07:00)', () => {
    const p = prefs({ quiet_hours_start: '22:00', quiet_hours_end: '07:00' });
    expect(isInQuietHours(p, MIN(23))).toBe(true);
    expect(isInQuietHours(p, MIN(2))).toBe(true);
    expect(isInQuietHours(p, MIN(8))).toBe(false);
    expect(isInQuietHours(p, MIN(21))).toBe(false);
  });

  it('sin ventana configurada → nunca silencia', () => {
    expect(isInQuietHours(prefs(), MIN(3))).toBe(false);
    expect(isInQuietHours(prefs({ quiet_hours_start: '22:00' }), MIN(23))).toBe(false);
  });
});

describe('shouldNotify (#61 enforcement)', () => {
  it('defaults: todo pasa', () => {
    expect(shouldNotify(prefs(), 'agenda', MIN(10))).toBe(true);
    expect(shouldNotify(prefs(), 'argos', MIN(10))).toBe(true);
  });

  it('toggle de canal apagado → no manda', () => {
    expect(shouldNotify(prefs({ agenda_enabled: false }), 'agenda', MIN(10))).toBe(false);
    expect(shouldNotify(prefs({ streak_enabled: false }), 'streak', MIN(10))).toBe(false);
  });

  it('modo silent → solo system', () => {
    const p = prefs({ mode: 'silent' });
    expect(shouldNotify(p, 'agenda', MIN(10))).toBe(false);
    expect(shouldNotify(p, 'argos', MIN(10))).toBe(false);
    expect(shouldNotify(p, 'system', MIN(10))).toBe(true);
  });

  it('quiet hours silencia todo menos system', () => {
    const p = prefs({ quiet_hours_start: '22:00', quiet_hours_end: '07:00' });
    expect(shouldNotify(p, 'agenda', MIN(23))).toBe(false);
    expect(shouldNotify(p, 'system', MIN(23))).toBe(true);
    expect(shouldNotify(p, 'agenda', MIN(10))).toBe(true);
  });

  it('system respeta su propio toggle', () => {
    expect(shouldNotify(prefs({ system_enabled: false }), 'system', MIN(10))).toBe(false);
  });

  it('adaptive_argos se comporta como standard por ahora', () => {
    const p = prefs({ mode: 'adaptive_argos' });
    expect(shouldNotify(p, 'agenda', MIN(10))).toBe(true);
    expect(shouldNotify(p, 'argos', MIN(10))).toBe(true);
  });
});
