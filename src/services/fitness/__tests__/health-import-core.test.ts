/**
 * Tests del dedupe de import de salud (MB-3.6 Bloque 3.2) — el footgun
 * crítico del brief: importado NO duplica manual (ni al revés), external_id
 * manda, y la economía no se farmea con retroactividad.
 */
import { describe, it, expect } from 'vitest';
import {
  dedupeWorkouts,
  duracionesAproximadas,
  disciplineFromHealthConnect,
  disciplineFromHealthKit,
  importOtorgaElectron,
  type NormalizedWorkout,
  type ExistingSessionLike,
} from '../health-import-core';

function w(over: Partial<NormalizedWorkout> = {}): NormalizedWorkout {
  return {
    externalId: over.externalId ?? `ext-${Math.abs(JSON.stringify(over).split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`,
    discipline: 'running',
    dateLocal: '2026-07-25',
    durationSeconds: 1800,
    distanceMeters: 5000,
    avgHeartRate: null,
    calories: null,
    source: 'health_connect',
    ...over,
  };
}

describe('health-import dedupe', () => {
  it('external_id ya importado → duplicado', () => {
    const existentes: ExistingSessionLike[] = [
      { date: '2026-07-25', discipline: 'running', duration_seconds: 1800, external_id: 'strava-1' },
    ];
    const r = dedupeWorkouts([w({ externalId: 'strava-1' })], existentes);
    expect(r.nuevos).toHaveLength(0);
    expect(r.duplicados).toHaveLength(1);
  });

  it('manual del mismo día/disciplina/duración aproximada → duplicado (sin external_id)', () => {
    const existentes: ExistingSessionLike[] = [
      { date: '2026-07-25', discipline: 'running', duration_seconds: 1750, external_id: null },
    ];
    // 1800 vs 1750 = 50 s de diferencia < 90 s → mismo entrenamiento
    const r = dedupeWorkouts([w({ externalId: 'garmin-9' })], existentes);
    expect(r.nuevos).toHaveLength(0);
    expect(r.duplicados).toHaveLength(1);
  });

  it('mismo día y disciplina pero duración distinta → SÍ es nuevo (dos corridas reales)', () => {
    const existentes: ExistingSessionLike[] = [
      { date: '2026-07-25', discipline: 'running', duration_seconds: 1800 },
    ];
    const r = dedupeWorkouts([w({ externalId: 'x', durationSeconds: 3600 })], existentes);
    expect(r.nuevos).toHaveLength(1);
  });

  it('disciplina distinta el mismo día → nuevo', () => {
    const existentes: ExistingSessionLike[] = [
      { date: '2026-07-25', discipline: 'running', duration_seconds: 1800 },
    ];
    const r = dedupeWorkouts([w({ externalId: 'x', discipline: 'cycling' })], existentes);
    expect(r.nuevos).toHaveLength(1);
  });

  it('dedupe intra-lote: dos fuentes reportando el mismo workout → una sola', () => {
    const r = dedupeWorkouts([
      w({ externalId: 'strava-1', durationSeconds: 1800 }),
      w({ externalId: 'garmin-1', durationSeconds: 1820 }),
    ], []);
    expect(r.nuevos).toHaveLength(1);
    expect(r.duplicados).toHaveLength(1);
  });

  it('tolerancia: ±10% en duraciones largas, ±90 s en cortas', () => {
    expect(duracionesAproximadas(3600, 3900)).toBe(true);   // 5 min de 60 → dentro del 10%
    expect(duracionesAproximadas(3600, 4100)).toBe(false);  // 8.3 min → fuera
    expect(duracionesAproximadas(300, 380)).toBe(true);     // 80 s < 90 s piso
    expect(duracionesAproximadas(300, 400)).toBe(false);
  });
});

describe('mapeo de disciplinas', () => {
  it('Health Connect: running/biking/swimming/rowing y other para lo demás', () => {
    expect(disciplineFromHealthConnect(56)).toBe('running');
    expect(disciplineFromHealthConnect(8)).toBe('cycling');
    expect(disciplineFromHealthConnect(74)).toBe('swimming');
    expect(disciplineFromHealthConnect(54)).toBe('rowing');
    expect(disciplineFromHealthConnect(79)).toBe('other'); // walking
  });

  it('HealthKit: ídem', () => {
    expect(disciplineFromHealthKit(37)).toBe('running');
    expect(disciplineFromHealthKit(13)).toBe('cycling');
    expect(disciplineFromHealthKit(46)).toBe('swimming');
    expect(disciplineFromHealthKit(35)).toBe('rowing');
    expect(disciplineFromHealthKit(52)).toBe('other'); // walking
  });
});

describe('economía del import', () => {
  it('solo otorga si hay workout NUEVO de HOY — cero retroactividad', () => {
    const hoy = '2026-07-25';
    expect(importOtorgaElectron([w({ dateLocal: '2026-07-20' }), w({ dateLocal: '2026-07-21' })], hoy)).toBe(false);
    expect(importOtorgaElectron([w({ dateLocal: hoy })], hoy)).toBe(true);
    expect(importOtorgaElectron([], hoy)).toBe(false);
  });
});
