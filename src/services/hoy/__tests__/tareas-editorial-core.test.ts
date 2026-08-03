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
  pickHeroTarea,
  HERO_VENTANA_MIN,
  type TareaSeccion,
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
    const t = { key: 'sunlight', kind: 'bool' as const, meta: '+2 e-', time: '07:30', desc: 'Sal al sol' };
    expect(datoForTarea(t, { current: 6, vitaminD: 'ventana 10-12h' })).toBe('UV 6 ahora · ventana 10-12h');
    expect(datoForTarea(t, { current: 3 })).toBe('UV 3 ahora');
    // Sin uvMini cae a la descripción compilada, no inventa un UV.
    expect(datoForTarea(t, null)).toBe('Sal al sol');
  });

  it('ayuno: meta compilada + a qué hora rompe (la hora del smart item)', () => {
    expect(datoForTarea({ key: 'agenda-smart-fast-break', kind: 'agenda', meta: 'Ayuno 16h', time: '13:40' }))
      .toBe('Ayuno 16h · rompe a las 13:40');
  });

  it('bool sin dato vivo: descripción compilada, y sin ella va sin dato', () => {
    expect(datoForTarea({ key: 'meditation', kind: 'bool', meta: '+2 e-', time: '07:00', desc: 'Una sesión hoy' }))
      .toBe('Una sesión hoy');
    expect(datoForTarea({ key: 'meditation', kind: 'bool', meta: '+2 e-', time: '07:00' }))
      .toBeUndefined();
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
