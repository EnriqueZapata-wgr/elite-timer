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
  distanciaEsPropiaHealthConnect,
  esCaminataHealthConnect,
  esCaminataHealthKit,
  importOtorgaElectron,
  esImportable,
  MIN_IMPORT_DISTANCE_METERS,
  SALVAVIDAS_GPS_SECONDS,
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
    esCaminata: false,
    distanciaPropia: true,
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

describe('reglas de import (NOCTURNO B2 · MB-27 P4.2 = mutación 11)', () => {
  it('la frontera de duración es 5 minutos exactos', () => {
    expect(esImportable(w({ durationSeconds: 299 }))).toBe(false);
    expect(esImportable(w({ durationSeconds: 300 }))).toBe(true);
  });

  it("'other' sin distancia no se importa", () => {
    expect(esImportable(w({ discipline: 'other', distanceMeters: null }))).toBe(false);
    expect(esImportable(w({ discipline: 'other', distanceMeters: 0 }))).toBe(false);
  });

  it("mutación 11: una caminata NO entra, aunque traiga GPS y 'other' con distancia", () => {
    // El hueco viejo: WALKING caía en 'other' y con distancia pasaba limpio.
    expect(esImportable(w({ discipline: 'other', distanceMeters: 3000, esCaminata: true }))).toBe(false);
    // Un desconocido legítimo (no caminata) con distancia real sigue entrando.
    expect(esImportable(w({ discipline: 'other', distanceMeters: 3000, esCaminata: false }))).toBe(true);
  });

  // Audit V2 N1: el piso de 'other' aplica SIEMPRE — la distancia es su
  // único discriminante, propia o agregada.
  it('N1: la sesión de pesas (other, 45 min, 20 m de agregado) NO entra como cardio', () => {
    expect(esImportable(w({
      discipline: 'other', durationSeconds: 2700,
      distanceMeters: 20, distanciaPropia: false,
    }))).toBe(false);
    // Igual yoga/pilates/básquet: other + distancia diminuta = fuera,
    // sin importar la bandera de procedencia de la distancia.
    expect(esImportable(w({
      discipline: 'other', durationSeconds: 3600,
      distanceMeters: 149, distanciaPropia: true,
    }))).toBe(false);
    // La frontera exacta de 'other':
    expect(esImportable(w({ discipline: 'other', distanceMeters: MIN_IMPORT_DISTANCE_METERS }))).toBe(true);
  });

  it('N1: el salvavidas — carrera outdoor de 30 min con GPS fallido (40 m) SÍ entra', () => {
    expect(esImportable(w({
      discipline: 'running', durationSeconds: 1800,
      distanceMeters: 40, distanciaPropia: true,
    }))).toBe(true);
    // La frontera del salvavidas: bajo 20 min el GPS diminuto sigue siendo ruido.
    expect(esImportable(w({
      discipline: 'running', durationSeconds: SALVAVIDAS_GPS_SECONDS,
      distanceMeters: 40, distanciaPropia: true,
    }))).toBe(true);
    expect(esImportable(w({
      discipline: 'running', durationSeconds: SALVAVIDAS_GPS_SECONDS - 1,
      distanceMeters: 40, distanciaPropia: true,
    }))).toBe(false);
  });

  it('mutación 11: 10 metros en 6 minutos NO entra; correr 2 km sí', () => {
    expect(esImportable(w({ durationSeconds: 360, distanceMeters: 10 }))).toBe(false);
    expect(esImportable(w({ durationSeconds: 720, distanceMeters: 2000 }))).toBe(true);
    // La frontera exacta (en mapeado, corto y con GPS propio).
    expect(esImportable(w({ durationSeconds: 720, distanceMeters: MIN_IMPORT_DISTANCE_METERS - 1 }))).toBe(false);
    expect(esImportable(w({ durationSeconds: 720, distanceMeters: MIN_IMPORT_DISTANCE_METERS }))).toBe(true);
  });

  it('distancia ausente o en cero NO descalifica (caminadora, remo bajo techo)', () => {
    expect(esImportable(w({ discipline: 'running', distanceMeters: null }))).toBe(true);
    expect(esImportable(w({ discipline: 'running', distanceMeters: 0 }))).toBe(true);
  });

  it('el tipo crudo clasifica caminata y senderismo en ambas plataformas', () => {
    expect(esCaminataHealthConnect(79)).toBe(true);  // WALKING
    expect(esCaminataHealthConnect(37)).toBe(true);  // HIKING
    expect(esCaminataHealthConnect(56)).toBe(false); // RUNNING
    expect(esCaminataHealthKit(52)).toBe(true);      // walking
    expect(esCaminataHealthKit(24)).toBe(true);      // hiking
    expect(esCaminataHealthKit(37)).toBe(false);     // running
  });

  // Audit B8: el piso SOLO aplica donde la distancia es señal del ejercicio.
  it('B8: el nado en alberca con 120 m de agregado ambiental SÍ entra (la regresión, cerrada)', () => {
    // Android SWIMMING_POOL: la "distancia" es el aggregate de la ventana
    // (caminata ambiental de pasos), no del nado — distanciaPropia false.
    expect(distanciaEsPropiaHealthConnect(74)).toBe(false);
    expect(esImportable(w({
      discipline: 'swimming', durationSeconds: 2400,
      distanceMeters: 120, distanciaPropia: false,
    }))).toBe(true);
    // Mismo caso remo en máquina (54) y caminadora (57):
    expect(distanciaEsPropiaHealthConnect(54)).toBe(false);
    expect(distanciaEsPropiaHealthConnect(57)).toBe(false);
    expect(esImportable(w({
      discipline: 'rowing', durationSeconds: 1800,
      distanceMeters: 90, distanciaPropia: false,
    }))).toBe(true);
  });

  it('B8: donde la distancia SÍ es propia (GPS outdoor, iOS), el piso sigue vivo', () => {
    // Outdoor en Android: BIKING/ROWING/RUNNING/OPEN_WATER llevan GPS propio.
    expect(distanciaEsPropiaHealthConnect(56)).toBe(true);
    expect(distanciaEsPropiaHealthConnect(8)).toBe(true);
    expect(distanciaEsPropiaHealthConnect(53)).toBe(true);
    expect(distanciaEsPropiaHealthConnect(73)).toBe(true);
    // El registro de 10 metros en 6 minutos (test 11) sigue fuera:
    expect(esImportable(w({ durationSeconds: 360, distanceMeters: 10, distanciaPropia: true }))).toBe(false);
    // Y en iOS (per-workout, distanciaPropia true) igual:
    expect(esImportable(w({
      source: 'healthkit', durationSeconds: 360, distanceMeters: 10, distanciaPropia: true,
    }))).toBe(false);
  });
});
