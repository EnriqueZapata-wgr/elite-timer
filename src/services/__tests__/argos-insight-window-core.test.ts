import { describe, it, expect } from 'vitest';
import {
  INSIGHT_VENTANA_HORAS,
  indiceVentana,
  decidirRegeneracionInsight,
} from '../argos-insight-window-core';

const H = 3_600_000;

describe('indiceVentana', () => {
  it('agrupa instantes de la misma ventana en el mismo índice', () => {
    const base = 1_760_000_000_000;
    const inicio = indiceVentana(base) * INSIGHT_VENTANA_HORAS * H;
    expect(indiceVentana(inicio)).toBe(indiceVentana(inicio + 3 * H));
    expect(indiceVentana(inicio)).toBe(indiceVentana(inicio + 4 * H - 1));
  });

  it('cambia de índice al cruzar el corte', () => {
    const inicio = indiceVentana(1_760_000_000_000) * INSIGHT_VENTANA_HORAS * H;
    expect(indiceVentana(inicio + 4 * H)).toBe(indiceVentana(inicio) + 1);
  });

  it('da 6 ventanas por día', () => {
    const t = 1_760_000_000_000;
    expect(indiceVentana(t + 24 * H) - indiceVentana(t)).toBe(6);
  });
});

describe('decidirRegeneracionInsight', () => {
  // Anclado al INICIO de una ventana. Un timestamp arbitrario cae a mitad de la
  // suya, y entonces "hace una hora" puede pertenecer a la ventana anterior: las
  // aserciones dirían lo contrario de lo que quieren decir.
  const inicioVentana = indiceVentana(1_760_000_000_000) * INSIGHT_VENTANA_HORAS * H;
  const ahora = inicioVentana + 3 * H; // dentro de la ventana, cerca del final

  it('sin insight de hoy SIEMPRE genera (garantía diaria de lo que se paga)', () => {
    expect(decidirRegeneracionInsight({ hayInsight: false, createdAtMs: null, stale: false, ahoraMs: ahora }))
      .toEqual({ regenerar: true, motivo: 'sin_insight' });
  });

  it('created_at ilegible se trata como sin insight, no como fresco', () => {
    for (const malo of [null, NaN, Infinity]) {
      expect(decidirRegeneracionInsight({
        hayInsight: true, createdAtMs: malo as number, stale: false, ahoraMs: ahora,
      }).regenerar).toBe(true);
    }
  });

  it('dentro de la misma ventana NO regenera aunque esté marcado stale', () => {
    // Este es el caso que hoy dispara llamadas sin techo: N invalidaciones
    // (comida, ayuno, journal) dentro de la misma ventana → UNA generación.
    expect(decidirRegeneracionInsight({
      hayInsight: true, createdAtMs: inicioVentana, stale: true, ahoraMs: ahora,
    })).toEqual({ regenerar: false, motivo: 'misma_ventana' });
  });

  it('ventana nueva CON cambios regenera', () => {
    expect(decidirRegeneracionInsight({
      hayInsight: true, createdAtMs: ahora - 5 * H, stale: true, ahoraMs: ahora,
    })).toEqual({ regenerar: true, motivo: 'ventana_nueva' });
  });

  it('ventana nueva SIN cambios no regenera (el texto saldría igual)', () => {
    expect(decidirRegeneracionInsight({
      hayInsight: true, createdAtMs: ahora - 5 * H, stale: false, ahoraMs: ahora,
    })).toEqual({ regenerar: false, motivo: 'sin_cambios' });
  });

  it('techo real: 24h de invalidaciones constantes producen 6 generaciones, no 100', () => {
    const inicio = inicioVentana;
    let createdAt: number | null = null;
    let hayInsight = false;
    let generaciones = 0;

    // Simula 96 aperturas de app (una cada 15 min) con el día siempre cambiando.
    for (let i = 0; i < 96; i++) {
      const t = inicio + i * 15 * 60_000;
      const d = decidirRegeneracionInsight({ hayInsight, createdAtMs: createdAt, stale: true, ahoraMs: t });
      if (d.regenerar) {
        generaciones++;
        createdAt = t;
        hayInsight = true;
      }
    }
    expect(generaciones).toBe(6);
  });

  it('un día tranquilo cuesta exactamente una generación', () => {
    const inicio = inicioVentana;
    let createdAt: number | null = null;
    let hayInsight = false;
    let generaciones = 0;
    for (let i = 0; i < 96; i++) {
      const t = inicio + i * 15 * 60_000;
      const d = decidirRegeneracionInsight({ hayInsight, createdAtMs: createdAt, stale: false, ahoraMs: t });
      if (d.regenerar) { generaciones++; createdAt = t; hayInsight = true; }
    }
    expect(generaciones).toBe(1);
  });
});
