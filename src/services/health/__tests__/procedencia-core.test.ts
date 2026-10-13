/**
 * Wearables bloque A — procedencia de cada dato: fuente por campo, método de
 * HRV, rango de la casa y tendencias que no mezclan fuentes.
 */
import { describe, expect, it } from 'vitest';

import {
  FUENTES_DE_MAQUINA,
  HRV_VENTANA_PARCIAL,
  esFuenteDeMaquinaConocida,
  esFuenteDeMarca,
  fuenteDelCampo,
  RANGO_DE_LA_CASA,
  esColumna344Faltante,
  nombreDeFuente,
  procedenciaDe,
  procedenciaDelCampo,
  tramoMismaFuente,
} from '../procedencia-core';

describe('fuenteDelCampo: field_sources manda; sin él, el source de la fila', () => {
  it('lee la fuente del campo aunque la fila diga mixto', () => {
    expect(fuenteDelCampo({ hrv_ms: 'oura', steps: 'health_connect' }, 'hrv_ms', 'mixto')).toBe('oura');
    expect(fuenteDelCampo({ hrv_ms: 'oura', steps: 'health_connect' }, 'steps', 'mixto')).toBe('health_connect');
  });
  it('fila de antes de la 344 (sin field_sources): usa el source de la fila', () => {
    expect(fuenteDelCampo(undefined, 'steps', 'healthkit')).toBe('healthkit');
    expect(fuenteDelCampo({}, 'steps', 'health_connect')).toBe('health_connect');
    expect(fuenteDelCampo(null, 'steps', null)).toBeNull();
  });
  it('no adivina con basura', () => {
    expect(fuenteDelCampo(['oura'], 'steps', 'healthkit')).toBe('healthkit');
    expect(fuenteDelCampo({ steps: 3 }, 'steps', 'healthkit')).toBe('healthkit');
    expect(fuenteDelCampo({ steps: '' }, 'steps', '')).toBeNull();
  });
  it("'mixto' marcado por la base se devuelve tal cual (no se inventa marca)", () => {
    expect(fuenteDelCampo({ steps: 'mixto' }, 'steps', 'oura')).toBe('mixto');
  });
});

describe('procedenciaDe: método y rango de la casa como DATO', () => {
  it('RMSSD de una fuente que promedia toda la noche: aplica el rango', () => {
    for (const f of ['oura', 'health_connect', 'garmin']) {
      expect(procedenciaDe('hrv_ms', f)).toEqual({ fuente: f, metodo: 'rmssd', aplicaRangoCasa: true });
    }
  });
  it('RMSSD de ventana parcial (Polar, WHOOP): no aplica', () => {
    expect(HRV_VENTANA_PARCIAL).toContain('polar');
    expect(procedenciaDe('hrv_ms', 'polar').aplicaRangoCasa).toBe(false);
    expect(procedenciaDe('hrv_ms', 'whoop').aplicaRangoCasa).toBe(false);
    expect(procedenciaDe('hrv_ms', 'polar').metodo).toBe('rmssd');
  });
  it('RMSSD de fuente desconocida o mixto: no aplica', () => {
    expect(procedenciaDe('hrv_ms', 'mixto').aplicaRangoCasa).toBe(false);
    expect(procedenciaDe('hrv_ms', null).aplicaRangoCasa).toBe(false);
    expect(procedenciaDe('hrv_ms', 'samsung').aplicaRangoCasa).toBe(false);
  });
  it('SDNN nunca aplica, venga de donde venga', () => {
    expect(procedenciaDe('hrv_sdnn_ms', 'healthkit')).toEqual({ fuente: 'healthkit', metodo: 'sdnn', aplicaRangoCasa: false });
    expect(procedenciaDe('hrv_sdnn_ms', 'oura').aplicaRangoCasa).toBe(false);
  });
  it('scores de marca, temperatura y SpO2 no se comparan contra la casa', () => {
    for (const c of ['readiness_score', 'score', 'temp_deviation_c', 'spo2_pct', 'stress_high_min', 'recovery_high_min', 'sedentary_min'] as const) {
      expect(procedenciaDe(c, 'oura').aplicaRangoCasa).toBe(false);
      expect(procedenciaDe(c, 'oura').metodo).toBeNull();
    }
  });
  it('lista blanca: lo que no tiene rango de la casa escrito sale sin rango (pasos, FC, respiración, etapas)', () => {
    for (const c of ['steps', 'sleep_minutes', 'resting_hr', 'breath_rate', 'duration_minutes', 'deep_min'] as const) {
      expect(procedenciaDe(c, 'oura')).toEqual({ fuente: 'oura', metodo: null, aplicaRangoCasa: false });
    }
    expect(Object.keys(RANGO_DE_LA_CASA)).toEqual(['hrv_ms']);
  });
  it('procedenciaDelCampo junta las dos cosas', () => {
    expect(procedenciaDelCampo('hrv_ms', { hrv_ms: 'polar' }, 'mixto')).toEqual({ fuente: 'polar', metodo: 'rmssd', aplicaRangoCasa: false });
  });
});

describe('vocabulario', () => {
  it('máquinas y marcas', () => {
    expect(FUENTES_DE_MAQUINA).toEqual(['health_connect', 'healthkit', 'oura', 'whoop', 'garmin', 'polar']);
    expect(esFuenteDeMaquinaConocida('oura')).toBe(true);
    expect(esFuenteDeMaquinaConocida('mixto')).toBe(false);
    expect(esFuenteDeMaquinaConocida('sleep_cycle')).toBe(false);
    expect(esFuenteDeMarca('whoop')).toBe(true);
    expect(esFuenteDeMarca('healthkit')).toBe(false);
  });
});

describe('tramoMismaFuente: la línea no mezcla fuentes', () => {
  it('una sola fuente: no se corta', () => {
    const t = tramoMismaFuente([
      { fecha: '2026-10-12', valor: 50, fuente: 'oura' },
      { fecha: '2026-10-11', valor: 48, fuente: 'oura' },
    ]);
    expect(t).toEqual({
      puntos: [{ fecha: '2026-10-12', valor: 50 }, { fecha: '2026-10-11', valor: 48 }],
      fuente: 'oura', cortada: false, fuenteAnterior: null, desde: '2026-10-11',
    });
  });
  it('si la fuente cambia, se corta en el cambio y dice cuál había', () => {
    const t = tramoMismaFuente([
      { fecha: '2026-10-12', valor: 50, fuente: 'oura' },
      { fecha: '2026-10-11', valor: 48, fuente: 'oura' },
      { fecha: '2026-10-10', valor: 70, fuente: 'health_connect' },
      { fecha: '2026-10-09', valor: 52, fuente: 'oura' },
    ]);
    expect(t.puntos.map((p) => p.fecha)).toEqual(['2026-10-12', '2026-10-11']);
    expect(t.cortada).toBe(true);
    expect(t.fuenteAnterior).toBe('health_connect');
    expect(t.desde).toBe('2026-10-11');
  });
  it('los días sin valor se saltan y no cortan', () => {
    const t = tramoMismaFuente([
      { fecha: '2026-10-12', valor: null, fuente: 'health_connect' },
      { fecha: '2026-10-11', valor: 48, fuente: 'oura' },
      { fecha: '2026-10-10', valor: undefined, fuente: 'polar' },
      { fecha: '2026-10-09', valor: 47, fuente: 'oura' },
    ]);
    expect(t.cortada).toBe(false);
    expect(t.puntos).toHaveLength(2);
  });
  it('fuente desconocida no se junta con nada, ni con otra desconocida', () => {
    const t = tramoMismaFuente([
      { fecha: '2026-10-12', valor: 50, fuente: null },
      { fecha: '2026-10-11', valor: 48, fuente: null },
    ]);
    expect(t.puntos).toHaveLength(1);
    expect(t.cortada).toBe(true);
  });
  it('serie vacía', () => {
    expect(tramoMismaFuente([])).toEqual({ puntos: [], fuente: null, cortada: false, fuenteAnterior: null, desde: null });
  });
});

describe('nombreDeFuente: como lo diría una persona', () => {
  it('marcas, teléfono y Sueño de ATP', () => {
    expect(nombreDeFuente('sleep_cycle')).toBe('Sueño de ATP');
    expect(nombreDeFuente('whoop')).toBe('WHOOP');
    expect(nombreDeFuente('healthkit')).toBe('Salud de Apple');
    expect(nombreDeFuente('health_connect')).toBe('Health Connect');
  });
  it("'mixto', null o desconocida: fuente sin identificar", () => {
    expect(nombreDeFuente('mixto')).toBe('fuente sin identificar');
    expect(nombreDeFuente(null)).toBe('fuente sin identificar');
    expect(nombreDeFuente('fitbit')).toBe('fuente sin identificar');
  });
});

describe('esColumna344Faltante: solo "la base no tiene la 344"', () => {
  it('columna de la 344 faltante, por código o por texto', () => {
    expect(esColumna344Faltante({ code: '42703', message: 'column health_os_daily.hrv_ms does not exist' })).toBe(true);
    expect(esColumna344Faltante({ code: 'PGRST204', message: "Could not find the 'field_sources' column of 'sleep_nights' in the schema cache" })).toBe(true);
    expect(esColumna344Faltante({ code: '42703', message: '' })).toBe(true);
  });
  it('otra columna, tabla faltante, permiso o nada: no', () => {
    expect(esColumna344Faltante({ code: '42703', message: 'column health_os_daily.hrv_mss does not exist' })).toBe(false);
    expect(esColumna344Faltante({ code: '42703', message: 'column x.efficiency_old does not exist' })).toBe(false);
    expect(esColumna344Faltante({ code: '42P01', message: 'relation "health_os_daily" does not exist' })).toBe(false);
    expect(esColumna344Faltante({ code: '42501', message: 'permission denied for table health_os_daily' })).toBe(false);
    expect(esColumna344Faltante(null)).toBe(false);
    expect(esColumna344Faltante('42703')).toBe(false);
  });
});
