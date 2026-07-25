/**
 * Tests del núcleo de movilidad (MB-3.6 Bloque 2) — normalización 0-10,
 * overall, asimetrías y comparación contra evaluación anterior.
 */
import { describe, it, expect } from 'vitest';
import {
  MOBILITY_TESTS,
  EMPTY_MOBILITY_INPUT,
  scoreToeTouch,
  scoreAnkle,
  scoresPorTest,
  overallMobilityScore,
  lecturaDe,
  compararEvaluaciones,
  type MobilityInput,
} from '../mobility-core';

describe('mobility-core', () => {
  it('define los 7 tests que persiste mobility_assessments', () => {
    expect(MOBILITY_TESTS).toHaveLength(7);
    // Todos con guía completa (doctrina: guiar con ejemplos)
    for (const t of MOBILITY_TESTS) {
      expect(t.comoSeHace.length).toBeGreaterThanOrEqual(3);
      expect(t.porQue.length).toBeGreaterThan(20);
      if (t.medida === 'escala') expect(t.anclas?.length).toBeGreaterThanOrEqual(3);
      if (t.medida === 'cm') expect(t.unidadHint).toBeTruthy();
    }
  });

  it('toe touch: llegar justo = 8, +5cm = 10, −20cm = 0 (lineal, acotado)', () => {
    expect(scoreToeTouch(0)).toBe(8);
    expect(scoreToeTouch(5)).toBe(10);
    expect(scoreToeTouch(12)).toBe(10); // cap superior
    expect(scoreToeTouch(-10)).toBe(4);
    expect(scoreToeTouch(-20)).toBe(0);
    expect(scoreToeTouch(-35)).toBe(0); // cap inferior
  });

  it('knee-to-wall: 12cm = 10, 6cm = 5, 0 = 0', () => {
    expect(scoreAnkle(12)).toBe(10);
    expect(scoreAnkle(6)).toBe(5);
    expect(scoreAnkle(0)).toBe(0);
    expect(scoreAnkle(20)).toBe(10); // cap
  });

  it('bilaterales promedian lados y flaggean asimetría ≥2', () => {
    const input: MobilityInput = {
      ...EMPTY_MOBILITY_INPUT,
      shoulder_rotation_l: 8,
      shoulder_rotation_r: 4, // |8-4| = 4 ≥ 2 → asimetría
      hip_flexion_l: 7,
      hip_flexion_r: 6, // |7-6| = 1 < 2 → sin flag
    };
    const scores = new Map(scoresPorTest(input).map((t) => [t.key, t]));
    expect(scores.get('shoulder_rotation')!.score).toBe(6);
    expect(scores.get('shoulder_rotation')!.asimetria).toBe(true);
    expect(scores.get('hip_flexion')!.score).toBe(6.5);
    expect(scores.get('hip_flexion')!.asimetria).toBe(false);
  });

  it('un solo lado capturado cuenta sin inventar el otro', () => {
    const input: MobilityInput = { ...EMPTY_MOBILITY_INPUT, ankle_dorsiflexion_l_cm: 12 };
    const ankle = scoresPorTest(input).find((t) => t.key === 'ankle_dorsiflexion')!;
    expect(ankle.score).toBe(10);
    expect(ankle.asimetria).toBe(false);
  });

  it('overall promedia SOLO lo capturado; vacío = null', () => {
    expect(overallMobilityScore(EMPTY_MOBILITY_INPUT)).toBeNull();
    const input: MobilityInput = {
      ...EMPTY_MOBILITY_INPUT,
      deep_squat: 8,
      overhead_squat: 6,
      toe_touch_cm: 0, // → 8
    };
    expect(overallMobilityScore(input)).toBe(7.3); // (8+6+8)/3 = 7.33 → 7.3
  });

  it('lectura por bandas honesta', () => {
    expect(lecturaDe(9)).toBe('excelente');
    expect(lecturaDe(7.5)).toBe('buena');
    expect(lecturaDe(5.5)).toBe('funcional');
    expect(lecturaDe(3)).toBe('limitada');
  });

  it('comparación: delta por test y overall, null donde falte historial', () => {
    const anterior: MobilityInput = { ...EMPTY_MOBILITY_INPUT, deep_squat: 5, overhead_squat: 4 };
    const actual: MobilityInput = { ...EMPTY_MOBILITY_INPUT, deep_squat: 7, toe_touch_cm: 0 };
    const cmp = compararEvaluaciones(actual, anterior);
    const porTest = new Map(cmp.porTest.map((t) => [t.key, t.delta]));
    expect(porTest.get('deep_squat')).toBe(2);
    expect(porTest.get('overhead_squat')).toBeNull(); // no capturado hoy
    expect(porTest.get('toe_touch')).toBeNull(); // sin historial
    // overall actual (7+8)/2=7.5 vs anterior (5+4)/2=4.5 → +3
    expect(cmp.deltaOverall).toBe(3);
  });
});
