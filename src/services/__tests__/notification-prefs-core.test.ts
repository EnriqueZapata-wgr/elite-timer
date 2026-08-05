import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_PREFS_DEFAULTS,
  timeToMinutes,
  isInQuietHours,
  shouldNotify,
  planAppAviso,
  parseAvisoCondition,
  type NotificationPrefs,
  type AppAvisoPref,
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

describe('planAppAviso (MB-23 P3 · avisos por app)', () => {
  const aviso = (a: Partial<AppAvisoPref> = {}): AppAvisoPref => ({
    enabled: true,
    time: '21:00',
    condition: 'not_done_today',
    ...a,
  });

  it('⚠️ EL MAESTRO MANDA: en silent ninguna app avisa, diga lo que diga su ficha', () => {
    const p = prefs({ mode: 'silent' });
    expect(planAppAviso(p, aviso(), MIN(10), false)).toBeNull();
    expect(planAppAviso(p, aviso({ condition: 'always' }), MIN(10), false)).toBeNull();
    expect(planAppAviso(p, aviso({ time: '09:00' }), MIN(20), true)).toBeNull();
  });

  it('las horas de silencio aplican a todo: hora de aviso dentro de la ventana → nunca', () => {
    const p = prefs({ quiet_hours_start: '22:00', quiet_hours_end: '07:00' });
    expect(planAppAviso(p, aviso({ time: '23:00' }), MIN(10), false)).toBeNull();
    expect(planAppAviso(p, aviso({ time: '06:30' }), MIN(10), false)).toBeNull();
    // Fuera de la ventana sí pasa.
    expect(planAppAviso(p, aviso({ time: '21:00' }), MIN(10), false)).toBe('today');
  });

  it('ficha apagada → nada, aunque el maestro esté prendido', () => {
    expect(planAppAviso(prefs(), aviso({ enabled: false }), MIN(10), false)).toBeNull();
  });

  it('hora futura y no hecho → hoy; hora pasada → mañana', () => {
    expect(planAppAviso(prefs(), aviso(), MIN(10), false)).toBe('today');
    expect(planAppAviso(prefs(), aviso(), MIN(22), false)).toBe('tomorrow');
    // La hora exacta ya no es futura: va a mañana, no dispara al agendar.
    expect(planAppAviso(prefs(), aviso(), MIN(21), false)).toBe('tomorrow');
  });

  it('"solo si no lo has hecho hoy": hecho → salta a mañana, que arranca sin hacer', () => {
    expect(planAppAviso(prefs(), aviso(), MIN(10), true)).toBe('tomorrow');
  });

  it('condición always: avisa hoy aunque ya lo hayas hecho', () => {
    expect(planAppAviso(prefs(), aviso({ condition: 'always' }), MIN(10), true)).toBe('today');
  });

  it('hora inválida → nada (jamás un Date corrupto)', () => {
    expect(planAppAviso(prefs(), aviso({ time: 'basura' }), MIN(10), false)).toBeNull();
  });
});

describe('parseAvisoCondition', () => {
  it('estricto: basura en DB cae al default seguro', () => {
    expect(parseAvisoCondition('always')).toBe('always');
    expect(parseAvisoCondition('not_done_today')).toBe('not_done_today');
    expect(parseAvisoCondition('siempre')).toBe('not_done_today');
    expect(parseAvisoCondition(null)).toBe('not_done_today');
  });
});
