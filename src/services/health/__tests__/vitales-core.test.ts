/**
 * Vitales core (13-oct-2026): el lector de días de health_os_daily, amarrado.
 *
 * Lo que este test defiende:
 *  - HRV RMSSD y HRV SDNN son dos métricas: nunca se mezclan.
 *  - Cada valor viaja con su procedencia (fuente, método, rango de la casa).
 *  - La tendencia se calcula SOLO dentro del tramo de la misma fuente; si la
 *    fuente cambió, dice desde cuándo y qué había antes.
 *  - Menos de 4 puntos en el tramo: "no se calcula", nunca "estable".
 *  - El rango de la casa es lista blanca: solo HRV RMSSD de noche completa.
 */
import { describe, it, expect } from 'vitest';
import {
  fuenteParaTramo,
  numeroDeColumna,
  resumirVitales,
  SELECT_VITALES,
  tendenciaEnTramo,
  type FilaVitales,
  type MetricaVital,
} from '../vitales-core';

const dia = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;
const de = (ms: MetricaVital[], clave: MetricaVital['clave']) => ms.find((m) => m.clave === clave);

describe('numeroDeColumna', () => {
  it('acepta número o texto numérico (numeric de Postgres); lo demás es sin dato, nunca cero', () => {
    expect(numeroDeColumna(14.5)).toBe(14.5);
    expect(numeroDeColumna('-0.25')).toBe(-0.25);
    expect(numeroDeColumna(0)).toBe(0);
    expect(numeroDeColumna(null)).toBeNull();
    expect(numeroDeColumna('')).toBeNull();
    expect(numeroDeColumna('abc')).toBeNull();
    expect(numeroDeColumna(Number.NaN)).toBeNull();
  });
});

describe('SELECT_VITALES', () => {
  it('pide las columnas de la 344 con su procedencia y nada de sueño ni hypnogram', () => {
    for (const c of ['date', 'hrv_ms', 'hrv_sdnn_ms', 'resting_hr', 'breath_rate', 'temp_deviation_c', 'spo2_pct', 'readiness_score', 'source', 'field_sources']) {
      expect(SELECT_VITALES).toContain(c);
    }
    expect(SELECT_VITALES).not.toContain('hypnogram');
  });
});

describe('tendenciaEnTramo', () => {
  const abs = { tipo: 'absoluto' as const, valor: 2 };

  it('con menos de 4 puntos en el tramo no se calcula (no es estable)', () => {
    const t = tendenciaEnTramo([
      { fecha: dia(12), valor: 60, fuente: 'oura' },
      { fecha: dia(11), valor: 50, fuente: 'oura' },
      { fecha: dia(10), valor: 40, fuente: 'oura' },
    ], abs);
    expect(t.direccion).toBe('no_se_calcula');
    expect(t.puntos).toBe(3);
  });

  it('sube, baja o estable según el umbral (mitad reciente contra mitad vieja)', () => {
    const serie = (vals: number[]) => vals.map((v, i) => ({ fecha: dia(12 - i), valor: v, fuente: 'garmin' }));
    expect(tendenciaEnTramo(serie([60, 60, 56, 56]), abs).direccion).toBe('sube');
    expect(tendenciaEnTramo(serie([52, 52, 56, 56]), abs).direccion).toBe('baja');
    expect(tendenciaEnTramo(serie([57, 57, 56, 56]), abs).direccion).toBe('estable');
    // El umbral exacto cuenta como movimiento (igual que el sueño de ARGOS).
    expect(tendenciaEnTramo(serie([58, 58, 56, 56]), abs).direccion).toBe('sube');
  });

  it('umbral relativo: 5 % del promedio viejo', () => {
    const rel = { tipo: 'relativo' as const, valor: 0.05 };
    const serie = (vals: number[]) => vals.map((v, i) => ({ fecha: dia(12 - i), valor: v, fuente: 'oura' }));
    expect(tendenciaEnTramo(serie([104, 104, 100, 100]), rel).direccion).toBe('estable');
    expect(tendenciaEnTramo(serie([106, 106, 100, 100]), rel).direccion).toBe('sube');
  });

  it('solo usa el tramo de la misma fuente y dice dónde se cortó', () => {
    const t = tendenciaEnTramo([
      { fecha: dia(12), valor: 70, fuente: 'oura' },
      { fecha: dia(11), valor: 70, fuente: 'oura' },
      { fecha: dia(10), valor: 70, fuente: 'oura' },
      { fecha: dia(9), valor: 30, fuente: 'health_connect' },
      { fecha: dia(8), valor: 30, fuente: 'health_connect' },
    ], abs);
    expect(t).toEqual({
      direccion: 'no_se_calcula', puntos: 3, fuente: 'oura', cortada: true, desde: dia(10), fuenteAnterior: 'health_connect',
    });
  });

  it('los días sin valor se saltan y no cortan la línea', () => {
    const t = tendenciaEnTramo([
      { fecha: dia(12), valor: 60, fuente: 'oura' },
      { fecha: dia(11), valor: null, fuente: 'health_connect' },
      { fecha: dia(10), valor: 60, fuente: 'oura' },
      { fecha: dia(9), valor: 50, fuente: 'oura' },
      { fecha: dia(8), valor: 50, fuente: 'oura' },
    ], abs);
    expect(t.cortada).toBe(false);
    expect(t.puntos).toBe(4);
    expect(t.direccion).toBe('sube');
  });
});

describe('fuenteParaTramo', () => {
  it("'mixto' (el teléfono no dijo su fuente) cuenta como desconocida para la línea", () => {
    expect(fuenteParaTramo('mixto')).toBeNull();
    expect(fuenteParaTramo('')).toBeNull();
    expect(fuenteParaTramo(null)).toBeNull();
    expect(fuenteParaTramo('oura')).toBe('oura');
  });
});

describe('resumirVitales', () => {
  const filas: FilaVitales[] = [
    { date: dia(9), hrv_ms: 50, resting_hr: 58, source: 'oura', field_sources: { hrv_ms: 'oura', resting_hr: 'oura' } },
    { date: dia(12), hrv_ms: 62, resting_hr: 54, breath_rate: '14.5', temp_deviation_c: '-0.20', spo2_pct: 96, readiness_score: 81, source: 'oura',
      field_sources: { hrv_ms: 'oura', resting_hr: 'oura', breath_rate: 'oura', temp_deviation_c: 'oura', spo2_pct: 'oura', readiness_score: 'oura' } },
    { date: dia(11), hrv_ms: 60, resting_hr: 55, source: 'oura', field_sources: { hrv_ms: 'oura', resting_hr: 'oura' } },
    { date: dia(10), hrv_ms: 52, resting_hr: 57, source: 'oura', field_sources: { hrv_ms: 'oura', resting_hr: 'oura' } },
  ];

  it('último valor con su fecha y procedencia; ordena aunque las filas lleguen revueltas', () => {
    const r = resumirVitales(filas);
    const hrv = de(r, 'hrv_rmssd')!;
    expect(hrv).toMatchObject({ valor: 62, fecha: dia(12), fuente: 'oura', metodo: 'rmssd', aplicaRangoCasa: true });
    expect(hrv.tendencia).toMatchObject({ direccion: 'sube', puntos: 4, cortada: false, fuente: 'oura' });
    const fc = de(r, 'fc_reposo')!;
    // Lista blanca: la FC en reposo no tiene rango de la casa escrito.
    expect(fc).toMatchObject({ valor: 54, metodo: null, aplicaRangoCasa: false });
    expect(fc.tendencia.direccion).toBe('baja');
  });

  it('respiración y temperatura llegan como texto y salen como número; temperatura y SpO2 sin rango de la casa', () => {
    const r = resumirVitales(filas);
    expect(de(r, 'respiracion')!.valor).toBe(14.5);
    expect(de(r, 'temp_desviacion')).toMatchObject({ valor: -0.2, aplicaRangoCasa: false });
    expect(de(r, 'spo2')).toMatchObject({ valor: 96, aplicaRangoCasa: false });
    expect(de(r, 'readiness')).toMatchObject({ valor: 81, fuente: 'oura', aplicaRangoCasa: false });
    // Un solo día de dato: no hay tendencia que calcular.
    expect(de(r, 'respiracion')!.tendencia.direccion).toBe('no_se_calcula');
  });

  it('solo salen las métricas con algún valor', () => {
    const r = resumirVitales(filas);
    expect(de(r, 'hrv_sdnn')).toBeUndefined();
    expect(resumirVitales([])).toEqual([]);
    expect(resumirVitales([{ date: dia(12), source: 'healthkit' }])).toEqual([]);
  });

  it('HRV SDNN (Salud de Apple) es su propia métrica y nunca se mezcla con RMSSD', () => {
    const r = resumirVitales([
      { date: dia(12), hrv_ms: 48, hrv_sdnn_ms: 40, source: 'mixto', field_sources: { hrv_ms: 'oura', hrv_sdnn_ms: 'healthkit' } },
      { date: dia(11), hrv_sdnn_ms: 42, source: 'healthkit' },
    ]);
    expect(de(r, 'hrv_rmssd')).toMatchObject({ valor: 48, fuente: 'oura', metodo: 'rmssd', aplicaRangoCasa: true });
    expect(de(r, 'hrv_sdnn')).toMatchObject({ valor: 40, fuente: 'healthkit', metodo: 'sdnn', aplicaRangoCasa: false });
    // El RMSSD no tomó el número de SDNN del día anterior.
    expect(de(r, 'hrv_rmssd')!.tendencia.puntos).toBe(1);
  });

  it('HRV de ventana parcial (Polar, WHOOP) o de fuente mixto: valor real, sin rango de la casa', () => {
    expect(de(resumirVitales([{ date: dia(12), hrv_ms: 70, source: 'polar' }]), 'hrv_rmssd')!.aplicaRangoCasa).toBe(false);
    expect(de(resumirVitales([{ date: dia(12), hrv_ms: 70, source: 'whoop' }]), 'hrv_rmssd')!.aplicaRangoCasa).toBe(false);
    expect(de(resumirVitales([{ date: dia(12), hrv_ms: 70, source: 'mixto', field_sources: { hrv_ms: 'mixto' } }]), 'hrv_rmssd'))
      .toMatchObject({ fuente: 'mixto', aplicaRangoCasa: false });
  });

  it('si la fuente cambió, la tendencia es solo del tramo nuevo y dice qué había antes', () => {
    const r = resumirVitales([
      { date: dia(12), hrv_ms: 60, source: 'oura' },
      { date: dia(11), hrv_ms: 61, source: 'oura' },
      { date: dia(10), hrv_ms: 30, source: 'health_connect' },
      { date: dia(9), hrv_ms: 31, source: 'health_connect' },
      { date: dia(8), hrv_ms: 29, source: 'health_connect' },
    ]);
    expect(de(r, 'hrv_rmssd')!.tendencia).toEqual({
      direccion: 'no_se_calcula', puntos: 2, fuente: 'oura', cortada: true, desde: dia(11), fuenteAnterior: 'health_connect',
    });
  });

  it('una fecha repetida se toma una sola vez', () => {
    const r = resumirVitales([
      { date: dia(12), resting_hr: 50, source: 'garmin' },
      { date: dia(12), resting_hr: 90, source: 'garmin' },
    ]);
    expect(de(r, 'fc_reposo')!.valor).toBe(50);
  });
});
