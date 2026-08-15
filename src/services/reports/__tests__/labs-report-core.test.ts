import { describe, it, expect } from 'vitest';
import {
  construirHistorias, resumirLabs, fraseResumenLabs, distanciaAVentana, rumboDe,
  ordenarHistorias, RUMBO_LABEL,
  type MedicionLab, type HistoriaLab,
} from '../labs-report-core';
import { findMatrizParam, functionalBand } from '@/src/constants/edad-atp-matriz-lookup';

const m = (parameter_key: string, value: number, measured_at: string): MedicionLab =>
  ({ parameter_key, value, measured_at, source: 'lab_pdf' });

describe('distancia a la ventana', () => {
  const v = { lo: 50, hi: 80 };

  it('dentro de la ventana es cero', () => {
    expect(distanciaAVentana(60, v)).toBe(0);
    expect(distanciaAVentana(50, v)).toBe(0);
    expect(distanciaAVentana(80, v)).toBe(0);
  });

  it('mide al borde más cercano por abajo y por arriba', () => {
    expect(distanciaAVentana(40, v)).toBe(10);
    expect(distanciaAVentana(95, v)).toBe(15);
  });

  it('sin ventana NO se inventa una distancia', () => {
    expect(distanciaAVentana(60, null)).toBeNull();
  });
});

describe('rumbo', () => {
  const v = { lo: 50, hi: 80 };

  it('acercarse a la ventana es acercarse aunque el número baje', () => {
    expect(rumboDe(85, 95, v)).toBe('acerca');
    expect(rumboDe(45, 30, v)).toBe('acerca');
  });

  it('alejarse es alejarse aunque el número suba', () => {
    expect(rumboDe(95, 85, v)).toBe('aleja');
  });

  it('moverse DENTRO de la ventana no es acercarse ni alejarse', () => {
    expect(rumboDe(75, 55, v)).toBe('sostiene');
  });

  it('sin anterior o sin ventana no hay rumbo inventado', () => {
    expect(rumboDe(60, null, v)).toBe('sin_comparacion');
    expect(rumboDe(60, 70, null)).toBe('sin_comparacion');
  });

  it('cada rumbo tiene copy y ninguno lleva em dash', () => {
    for (const k of Object.keys(RUMBO_LABEL) as (keyof typeof RUMBO_LABEL)[]) {
      expect(RUMBO_LABEL[k].length).toBeGreaterThan(5);
      expect(RUMBO_LABEL[k]).not.toContain('—');
    }
  });
});

describe('historias', () => {
  it('agrupa por parámetro y ordena cada serie cronológicamente', () => {
    const h = construirHistorias([
      m('vitamina_d', 60, '2026-05-01'),
      m('vitamina_d', 35, '2026-01-01'),
    ], 'male', null);
    expect(h).toHaveLength(1);
    expect(h[0].puntos.map((p) => p.value)).toEqual([35, 60]);
    expect(h[0].ultimo.value).toBe(60);
    expect(h[0].anterior?.value).toBe(35);
    expect(h[0].delta).toBe(25);
  });

  it('la ventana funcional sale de la matriz de la casa, NUNCA de este archivo', () => {
    const h = construirHistorias([m('vitamina_d', 60, '2026-05-01')], 'male', null);
    const param = findMatrizParam('male', 'vitamina_d');
    expect(h[0].ventana).toEqual(functionalBand(param!));
  });

  it('un parámetro sin banda se declara pendiente en vez de fingir un rango', () => {
    const h = construirHistorias([m('parametro_que_no_existe', 42, '2026-05-01')], 'male', null);
    expect(h[0].ventana).toBeNull();
    expect(h[0].ultimo.estado).toBe('sin_banda');
  });

  it('el mismo valor se lee distinto según la matriz de cada sexo', () => {
    const hM = construirHistorias([m('ferritina', 100, '2026-05-01')], 'male', null);
    const hF = construirHistorias([m('ferritina', 100, '2026-05-01')], 'female', null);
    expect(hM[0].ventana).not.toEqual(hF[0].ventana);
  });

  it('un valor no numérico no genera fila fantasma', () => {
    const h = construirHistorias(
      [{ parameter_key: 'vitamina_d', value: NaN, measured_at: '2026-05-01', source: 'manual' }],
      'male', null,
    );
    expect(h).toEqual([]);
  });

  it('la primera medición no finge un delta', () => {
    const h = construirHistorias([m('vitamina_d', 60, '2026-05-01')], 'male', null);
    expect(h[0].delta).toBeNull();
    expect(h[0].rumbo).toBe('sin_comparacion');
  });
});

describe('contexto de ciclo', () => {
  it('un marcador hormonal de mujer SIN fase se declara explícitamente', () => {
    const h = construirHistorias([m('estradiol', 200, '2026-05-01')], 'female', null);
    expect(h[0].ciclo.show).toBe(true);
    expect(h[0].ciclo.phaseKnown).toBe(false);
    expect(h[0].ciclo.note.length).toBeGreaterThan(10);
  });

  it('con la fase conocida la nota cambia y ya no advierte', () => {
    const h = construirHistorias([m('estradiol', 200, '2026-05-01')], 'female', 'luteal');
    expect(h[0].ciclo.phaseKnown).toBe(true);
  });

  it('un marcador no hormonal no arrastra nota de ciclo', () => {
    const h = construirHistorias([m('vitamina_d', 60, '2026-05-01')], 'female', null);
    expect(h[0].ciclo.show).toBe(false);
  });

  it('a un hombre no se le pinta nota de ciclo aunque el marcador sea hormonal', () => {
    const h = construirHistorias([m('estradiol', 30, '2026-05-01')], 'male', null);
    expect(h[0].ciclo.show).toBe(false);
  });
});

describe('orden y resumen', () => {
  const fake = (nombre: string, estado: HistoriaLab['ultimo']['estado'], puntos = 1): HistoriaLab => ({
    key: nombre, nombre, unidad: null, ventana: null,
    puntos: Array.from({ length: puntos }, () => ({ value: 1, measured_at: '2026-01-01', source: 'manual', estado })),
    ultimo: { value: 1, measured_at: '2026-01-01', source: 'manual', estado },
    anterior: null, delta: null, rumbo: 'sin_comparacion', estadoLabel: '',
    ciclo: { show: false, phaseKnown: false, note: '' },
  });

  it('lo que pide atención va primero y lo pendiente de rango hasta abajo', () => {
    const orden = ordenarHistorias([
      fake('C', 'sin_banda'), fake('A', 'optimo'), fake('B', 'atencion'),
    ]);
    expect(orden.map((h) => h.nombre)).toEqual(['B', 'A', 'C']);
  });

  it('el resumen cuenta parámetros, mediciones y los que ya tienen con qué compararse', () => {
    const r = resumirLabs([fake('A', 'optimo', 3), fake('B', 'atencion', 1)]);
    expect(r).toMatchObject({ parametros: 2, mediciones: 4, conHistoria: 1, atencion: 1 });
  });

  it('sin nada la frase lo dice y no adorna', () => {
    expect(fraseResumenLabs(resumirLabs([]))).toBe('Sin biomarcadores en este rango.');
  });

  it('con un solo estudio la frase admite que no hay con qué comparar', () => {
    const frase = fraseResumenLabs(resumirLabs([fake('A', 'optimo', 1)]));
    expect(frase).toContain('segunda medición');
    expect(frase).not.toContain('—');
  });
});
