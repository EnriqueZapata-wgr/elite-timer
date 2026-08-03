/**
 * tareas-editorial-core (MB-20.1) — la piel editorial de TAREAS es
 * determinística: cada tarea conocida tiene sección (y por lo tanto color de
 * APP_SECTION_COLORS), el dato de la card sale solo de lo compilado, y el
 * héroe de AGENDA se decide por hora sin tocar red.
 */
import { describe, it, expect } from 'vitest';
import {
  seccionForTarea,
  datoForTarea,
  datoVivoForTarea,
  pickHeroTarea,
  HERO_VENTANA_MIN,
  type TareaSeccion,
  type DatosVivos,
} from '@/src/services/hoy/tareas-editorial-core';
import { TAREA_MOMENTO } from '@/src/services/hoy/tareas-core';
import { APP_SECTION_COLORS } from '@/src/constants/brand';

describe('seccionForTarea', () => {
  it('toda tarea del catálogo canónico resuelve a una sección con color', () => {
    for (const key of Object.keys(TAREA_MOMENTO)) {
      const seccion = seccionForTarea(key);
      expect(APP_SECTION_COLORS[seccion], `${key} → ${seccion}`).toBeTruthy();
    }
  });

  it('mapea por el puente electrón→app (secciones de la sala)', () => {
    expect(seccionForTarea('meditation')).toBe('mente');
    expect(seccionForTarea('journal')).toBe('mente');
    expect(seccionForTarea('strength')).toBe('cuerpo');
    expect(seccionForTarea('cardio')).toBe('cuerpo');
    expect(seccionForTarea('water')).toBe('diario');
    expect(seccionForTarea('supplements')).toBe('diario');
    expect(seccionForTarea('sunlight')).toBe('salud');
  });

  it('period_log pinta ciclo, no salud (decisión del brief)', () => {
    expect(seccionForTarea('period_log')).toBe('ciclo');
  });

  it('los hábitos sin app tienen sección manual (nunca caen al default por accidente)', () => {
    const esperado: Record<string, TareaSeccion> = {
      cold_shower: 'diario',
      grounding: 'diario',
      no_alcohol: 'diario',
      red_glasses: 'diario',
      no_processed_foods: 'diario',
      screen_time_cutoff: 'diario',
      steps: 'cuerpo',
    };
    for (const [key, seccion] of Object.entries(esperado)) {
      expect(seccionForTarea(key), key).toBe(seccion);
    }
  });

  it('los smart de agenda (romper ayuno) son hábito diario', () => {
    expect(seccionForTarea('agenda-smart-fast-break')).toBe('diario');
  });
});

describe('datoForTarea', () => {
  it('cuantitativos: el dato es la meta compilada tal cual', () => {
    expect(datoForTarea({ key: 'water', kind: 'quant', meta: '2.0L de 3.5L', time: '08:30' }))
      .toBe('2.0L de 3.5L');
  });

  it('sol: usa el uvMini que el HOY ya carga', () => {
    const t = { key: 'sunlight', kind: 'bool' as const, meta: '+2 e-', time: '07:30' };
    expect(datoForTarea(t, { current: 6, vitaminD: 'ventana 10-12h' })).toBe('UV 6 ahora · ventana 10-12h');
    expect(datoForTarea(t, { current: 3 })).toBe('UV 3 ahora');
    // Sin uvMini va sin dato: no inventa un UV ni cae a un folleto.
    expect(datoForTarea(t, null)).toBeUndefined();
  });

  it('ayuno: meta compilada + a qué hora rompe (la hora del smart item)', () => {
    expect(datoForTarea({ key: 'agenda-smart-fast-break', kind: 'agenda', meta: 'Ayuno 16h', time: '13:40' }))
      .toBe('Ayuno 16h · rompe a las 13:40');
  });

  it('bool con dato vivo lo muestra; sin dato vivo va SIN dato (fin del folleto)', () => {
    const vivos: DatosVivos = { meditation: { lastDate: '2026-08-03', durationSeconds: 720 } };
    expect(datoForTarea({ key: 'meditation', kind: 'bool', meta: '+2 e-', time: '07:00' }, null, vivos, '2026-08-03'))
      .toBe('Última sesión: 12 min');
    expect(datoForTarea({ key: 'meditation', kind: 'bool', meta: '+2 e-', time: '07:00' }))
      .toBeUndefined();
    // Los hábitos sin fuente de dato (baño frío) van sin línea de dato, siempre.
    expect(datoForTarea({ key: 'cold_shower', kind: 'bool', meta: '+3 e-', time: '07:45' }, null, vivos, '2026-08-03'))
      .toBeUndefined();
  });
});

describe('datoVivoForTarea (MB-20.2 · Pieza 2)', () => {
  const HOY = '2026-08-03';
  const vivos: DatosVivos = {
    supplements: { taken: 2, total: 5 },
    strength: { lastDate: '2026-08-01' },
    cardio: { lastDate: '2026-08-02', distanceMeters: 5200, durationSeconds: 1920 },
    journal: { lastDate: '2026-08-02' },
    nback: { lastDate: '2026-08-01', nLevel: 3 },
    checkin: { lastDate: '2026-08-02', quadrant: 'low_pleasant' },
    meditation: { lastDate: HOY, durationSeconds: 720 },
  };

  it('suplementos: tomadas contra las del protocolo', () => {
    expect(datoVivoForTarea('supplements', vivos, HOY)).toBe('2 de 5 tomados');
    // Sin suplementos activos no hay "0 de 0": va sin dato.
    expect(datoVivoForTarea('supplements', { supplements: { taken: 0, total: 0 } }, HOY)).toBeUndefined();
  });

  it('entrenar: recencia de la última sesión', () => {
    expect(datoVivoForTarea('strength', vivos, HOY)).toBe('Última sesión: hace 2 días');
    expect(datoVivoForTarea('strength', { strength: { lastDate: HOY } }, HOY)).toBe('Última sesión: hoy');
    expect(datoVivoForTarea('strength', { strength: { lastDate: '2026-08-02' } }, HOY)).toBe('Última sesión: ayer');
  });

  it('cardio: distancia y tiempo de la última sesión', () => {
    expect(datoVivoForTarea('cardio', vivos, HOY)).toBe('Última: 5.2 km · 32 min');
    // Sin distancia (sesión de tiempo) el dato no inventa kilómetros.
    expect(datoVivoForTarea('cardio', { cardio: { lastDate: HOY, durationSeconds: 1800 } }, HOY))
      .toBe('Última: 30 min');
  });

  it('journal y n-back: recencia y último nivel', () => {
    expect(datoVivoForTarea('journal', vivos, HOY)).toBe('Última entrada: ayer');
    expect(datoVivoForTarea('nback', vivos, HOY)).toBe('Último nivel: 3');
  });

  it('check-in: dónde terminó la última vez (etiqueta canónica del cuadrante)', () => {
    expect(datoVivoForTarea('checkin', vivos, HOY)).toBe('Última vez: Baja energía · Agradable');
    // Cuadrante desconocido/ausente → sin dato, no una etiqueta inventada.
    expect(datoVivoForTarea('checkin', { checkin: { lastDate: HOY, quadrant: 'otro' } }, HOY)).toBeUndefined();
  });

  it('sin vivos o fecha futura corrupta: sin dato', () => {
    expect(datoVivoForTarea('strength', undefined, HOY)).toBeUndefined();
    expect(datoVivoForTarea('strength', { strength: { lastDate: '2026-09-01' } }, HOY)).toBeUndefined();
  });
});

describe('pickHeroTarea', () => {
  const t = (time: string, completed = false) => ({ time, completed });

  it('gana la pendiente cuya ventana está abierta (la más reciente)', () => {
    const tareas = [t('21:00'), t('21:30'), t('21:45'), t('22:30')];
    // 22:00 → apagar pantallas (21:45) es lo que importa ahora.
    expect(pickHeroTarea(tareas, 22 * 60)).toEqual(t('21:45'));
  });

  it('sin ventana abierta, la próxima por hora', () => {
    const tareas = [t('07:30', true), t('14:00'), t('17:00')];
    expect(pickHeroTarea(tareas, 10 * 60)).toEqual(t('14:00'));
  });

  it('día pasado de largo: la última pendiente', () => {
    const tareas = [t('07:30'), t('09:00')];
    expect(pickHeroTarea(tareas, 23 * 60 + 30)).toEqual(t('09:00'));
  });

  it('todo hecho: no hay héroe', () => {
    expect(pickHeroTarea([t('07:30', true), t('21:00', true)], 12 * 60)).toBeNull();
  });

  it('la ventana mide exactamente HERO_VENTANA_MIN', () => {
    const tareas = [t('07:30'), t('12:00')];
    // A las 09:00 el sol (07:30) lleva justo 90 min: sigue en ventana.
    expect(pickHeroTarea(tareas, 7 * 60 + 30 + HERO_VENTANA_MIN)).toEqual(t('07:30'));
    // Un minuto después ya no: gana la próxima.
    expect(pickHeroTarea(tareas, 7 * 60 + 31 + HERO_VENTANA_MIN)).toEqual(t('12:00'));
  });
});
