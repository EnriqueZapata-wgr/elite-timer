/**
 * Tests de today-session-core (20-sep-2026): la rutina asignada gana sobre
 * el onboarding del generador, los intervalos y el cardio marcan el día, y
 * la semana no cuenta dos veces una sesión que escribió en dos tablas.
 */
import { describe, it, expect } from 'vitest';
import {
  decidirHoy, diasEntrenados, esAsignadaPorCoach, primerNombre, rutinaAsignadaCumplida,
} from '@/src/services/fitness/today-session-core';
import type { AsignacionRow } from '@/src/services/fitness/plan-semanal-core';

const YO = 'user-1';
const COACH = 'coach-1';

const rutina = (over: Partial<AsignacionRow> = {}): AsignacionRow => ({
  schedule_type: 'weekly_cycle',
  day_of_week: 1,
  specific_date: null,
  focus: null,
  routine_id: 'rut-1',
  routine_name: 'Tren superior A',
  is_active: true,
  assigned_by: COACH,
  ...over,
});

const enfoque = (): AsignacionRow => ({
  schedule_type: 'weekly_cycle', day_of_week: 1, specific_date: null,
  focus: 'empuje', routine_id: null, is_active: true, assigned_by: YO,
});

const base = { userId: YO, sesion: null, cardioHoy: [], nivel: null, tienePrefs: false, asignacion: null };

describe('decidirHoy: la rutina asignada gana', () => {
  it('cliente día uno (sin nivel, sin prefs) con rutina del coach → asignada, no primer_uso', () => {
    const d = decidirHoy({ ...base, asignacion: rutina() });
    expect(d.kind).toBe('asignada');
    if (d.kind === 'asignada') {
      expect(d.porCoach).toBe(true);
      expect(d.asignacion.routine_id).toBe('rut-1');
    }
  });

  it('con nivel pero sin prefs y rutina agendada → asignada, no sin_prefs', () => {
    expect(decidirHoy({ ...base, nivel: 'avanzado', asignacion: rutina() }).kind).toBe('asignada');
  });

  it('rutina autoagendada (assigned_by = yo) → asignada pero no porCoach', () => {
    const d = decidirHoy({ ...base, asignacion: rutina({ assigned_by: YO }) });
    expect(d.kind).toBe('asignada');
    if (d.kind === 'asignada') expect(d.porCoach).toBe(false);
  });

  it('rutina agendada sin assigned_by (schedule-service viejo) → propia', () => {
    expect(esAsignadaPorCoach(rutina({ assigned_by: null }), YO)).toBe(false);
    expect(esAsignadaPorCoach(rutina({ assigned_by: undefined }), YO)).toBe(false);
    expect(esAsignadaPorCoach(rutina(), YO)).toBe(true);
  });

  it('un ENFOQUE del plan no es rutina concreta: sigue el camino del generador', () => {
    expect(decidirHoy({ ...base, asignacion: enfoque() }).kind).toBe('primer_uso');
    expect(decidirHoy({ ...base, nivel: 'intermedio', asignacion: enfoque() }).kind).toBe('sin_prefs');
    expect(decidirHoy({ ...base, nivel: 'intermedio', tienePrefs: true, asignacion: enfoque() }).kind).toBe('generar');
  });

  it('sin asignación: el orden viejo se conserva (primer_uso → sin_prefs → generar)', () => {
    expect(decidirHoy(base).kind).toBe('primer_uso');
    expect(decidirHoy({ ...base, nivel: 'principiante' }).kind).toBe('sin_prefs');
    expect(decidirHoy({ ...base, nivel: 'principiante', tienePrefs: true }).kind).toBe('generar');
  });
});

describe('decidirHoy: intervalos y cardio cuentan', () => {
  it('un Tabata (cardio_sessions other) sin rutina agendada → entrenado', () => {
    const d = decidirHoy({ ...base, cardioHoy: [{ discipline: 'other', notes: 'Tabata · 8 steps · 160s trabajo' }] });
    expect(d.kind).toBe('entrenado');
    if (d.kind === 'entrenado') expect(d.asignadaPendiente).toBe(null);
  });

  it('cardio registrado a mano → entrenado aunque haya nivel y prefs', () => {
    const d = decidirHoy({ ...base, nivel: 'avanzado', tienePrefs: true, cardioHoy: [{ discipline: 'running', notes: null }] });
    expect(d.kind).toBe('entrenado');
  });

  it('un calentamiento de intervalos NO sustituye la rutina del coach: sigue asignada', () => {
    const d = decidirHoy({
      ...base, asignacion: rutina(),
      cardioHoy: [{ discipline: 'other', notes: 'Tabata · 8 steps · 160s trabajo' }],
    });
    expect(d.kind).toBe('asignada');
  });

  it('la rutina asignada corrida en modo timer (notes con su nombre) → entrenado', () => {
    const d = decidirHoy({
      ...base, asignacion: rutina(),
      cardioHoy: [{ discipline: 'other', notes: 'Tren superior A · 12 steps · 600s trabajo' }],
    });
    expect(d.kind).toBe('entrenado');
    if (d.kind === 'entrenado') expect(d.asignadaPendiente).toBe(null);
  });

  it('sesión de fuerza con el nombre de la rutina → entrenado sin pendiente', () => {
    const d = decidirHoy({ ...base, asignacion: rutina(), sesion: { routine_name: 'Tren superior A' } });
    expect(d.kind).toBe('entrenado');
    if (d.kind === 'entrenado') expect(d.asignadaPendiente).toBe(null);
  });

  it('sesión de fuerza de OTRA cosa → entrenado, con la asignada pendiente en quiet', () => {
    const d = decidirHoy({ ...base, asignacion: rutina(), sesion: { routine_name: 'Sesión de hoy' } });
    expect(d.kind).toBe('entrenado');
    if (d.kind === 'entrenado') expect(d.asignadaPendiente?.routine_id).toBe('rut-1');
  });

  it('rutinaAsignadaCumplida: sin nombre no adivina; el prefijo exige el separador', () => {
    expect(rutinaAsignadaCumplida(rutina({ routine_name: null }), null, [{ discipline: 'other', notes: ' · 1 steps' }])).toBe(false);
    expect(rutinaAsignadaCumplida(rutina(), null, [{ discipline: 'other', notes: 'Tren superior AB · 1 steps' }])).toBe(false);
    expect(rutinaAsignadaCumplida(rutina(), null, [{ discipline: 'running', notes: 'Tren superior A · 1 steps' }])).toBe(false);
    expect(rutinaAsignadaCumplida(null, { routine_name: 'x' }, [])).toBe(false);
  });
});

describe('A1 + A4 (20-sep-2026): el clon del coach y lo propio desplazado', () => {
  it('A1: la sesión guardada con el nombre crudo del clon " (copia)" cuenta como la rutina asignada', () => {
    // La fila del plan llega recortada ("Tren superior A"); la sesión pudo
    // guardarse como "Tren superior A (copia)" si se abrió desde Mis rutinas.
    const d = decidirHoy({ ...base, asignacion: rutina(), sesion: { routine_name: 'Tren superior A (copia)' } });
    expect(d.kind).toBe('entrenado');
    if (d.kind === 'entrenado') expect(d.asignadaPendiente).toBe(null);
    expect(rutinaAsignadaCumplida(rutina({ routine_name: 'Tren superior A (copia)' }), { routine_name: 'Tren superior A' }, [])).toBe(true);
    expect(rutinaAsignadaCumplida(rutina(), null, [{ discipline: 'other', notes: 'Tren superior A (copia) · 12 steps' }])).toBe(true);
    // El separador sigue siendo obligatorio en las notas del runner.
    expect(rutinaAsignadaCumplida(rutina(), null, [{ discipline: 'other', notes: 'Tren superior A' }])).toBe(false);
  });

  it('A4: la desplazada viaja en la decisión solo cuando la asignada es del coach', () => {
    const propia = rutina({ routine_id: 'r-propia', routine_name: 'Mi rutina', assigned_by: YO });
    const d = decidirHoy({ ...base, asignacion: rutina(), desplazada: propia });
    expect(d.kind).toBe('asignada');
    if (d.kind === 'asignada') {
      expect(d.porCoach).toBe(true);
      expect(d.desplazada?.routine_id).toBe('r-propia');
    }
    // Rutina propia elegida: no hay coach de por medio, nada que anunciar.
    const d2 = decidirHoy({ ...base, asignacion: rutina({ assigned_by: YO }), desplazada: propia });
    if (d2.kind === 'asignada') expect(d2.desplazada).toBe(null);
    // Sin desplazada en la entrada (llamadores viejos): null, no undefined.
    const d3 = decidirHoy({ ...base, asignacion: rutina() });
    if (d3.kind === 'asignada') expect(d3.desplazada).toBe(null);
    // Ya cumplida: entrenado, y la desplazada no reaparece por otro lado.
    const d4 = decidirHoy({ ...base, asignacion: rutina(), desplazada: propia, sesion: { routine_name: 'Tren superior A' } });
    expect(d4.kind).toBe('entrenado');
  });
});

describe('diasEntrenados: la semana suma cualquier sesión sin doble conteo', () => {
  it('une fechas de fuerza y cardio por día', () => {
    expect(diasEntrenados(['2026-09-14', '2026-09-16'], ['2026-09-15'])).toBe(3);
  });
  it('una sesión que escribió en las dos tablas cuenta UN día', () => {
    expect(diasEntrenados(['2026-09-14'], ['2026-09-14', '2026-09-14'])).toBe(1);
  });
  it('solo cardio en la semana ya no marca cero', () => {
    expect(diasEntrenados([], ['2026-09-14', '2026-09-17'])).toBe(2);
  });
  it('timestamps se recortan a fecha; vacíos se ignoran', () => {
    expect(diasEntrenados(['2026-09-14T19:00:00'], ['2026-09-14', ''])).toBe(1);
    expect(diasEntrenados([], [])).toBe(0);
  });
});

describe('primerNombre', () => {
  it('toma el primer nombre y trata vacío como null', () => {
    expect(primerNombre('Enrique Zapata')).toBe('Enrique');
    expect(primerNombre('  Enrique ')).toBe('Enrique');
    expect(primerNombre('')).toBe(null);
    expect(primerNombre(null)).toBe(null);
    expect(primerNombre(undefined)).toBe(null);
  });
});
