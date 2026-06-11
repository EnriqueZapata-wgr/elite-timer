/**
 * Fase A (sprint captura unificada) — normalización de bandas en motor-v2-view.
 * Regresión de los bugs del smoke 2026-06-11:
 *  B1: PhenoAge core "pendiente" con valor presente → ahora "capturado".
 *  B2: Vit D 51.8 / cortisol 11.2 / Go-No-Go 237ms etiquetados "bajo" siendo ÓPTIMOS.
 *  B3: ratio TG/HDL mostraba el valor de triglicéridos (65.0) en vez del ratio (~1.08).
 */
import { describe, it, expect } from 'vitest';
import { computeMotorV2 } from '../motor-v2-service';
import { motorResultToView, bandFromScore } from '../motor-v2-view';
import type { MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const INPUT: MotorV2Input = {
  chronological_age: 40,
  sex: 'male',
  // Labs: 2 PhenoAge core presentes + 2 modificadores ÓPTIMOS (evidencia B2).
  albumin_g_dl: 4.5,
  glucose_mg_dl: 90,
  vit_d: 51.8,
  cortisol: 11.2,
  // Riesgos: ratio TG/HDL (evidencia B3) + presión.
  triglycerides: 65,
  hdl: 60,
  systolic_bp: 110,
  // Cognición: Go/No-Go excelente (evidencia B2) + RT simple.
  go_no_go_rt_hits_ms: 237,
  go_no_go_error_pct: 3,
  rt_simple_ms: 240,
  // Composición: FFMI derivado.
  weight_kg: 79,
  height_cm: 175,
  body_fat_pct: 11,
};

const view = motorResultToView(computeMotorV2(INPUT));

describe('motor-v2-view — bandas honestas por componente', () => {
  it('B1: PhenoAge core con valor = "capturado" (no "pendiente"); sin valor = pendiente', () => {
    const labs = view.sub_edades.labs.components;
    expect(labs.albumin_g_dl.missing).toBe(false);
    expect(labs.albumin_g_dl.band).toBe('capturado');
    expect(labs.glucose_mg_dl.band).toBe('capturado');
    expect(labs.creatinine_mg_dl.missing).toBe(true);
    expect(labs.creatinine_mg_dl.band).toBe('pendiente');
  });

  it('B2: Vit D 51.8 y cortisol 11.2 (labs) = óptimo, nunca "bajo"', () => {
    const labs = view.sub_edades.labs.components;
    expect(labs.vit_d.band).toBe('optimo'); // delta −1 = mejor posible
    expect(labs.cortisol.band).toBe('optimo'); // delta 0 = mejor posible para cortisol
  });

  it('B2: Go/No-Go 237ms (edad parcial ~22) = óptimo vs cronológica 40', () => {
    const cog = view.sub_edades.cognicion.components;
    expect(cog.go_no_go.value).toBe(237);
    expect(cog.go_no_go.band).toBe('optimo');
    expect(cog.rt_simple.band).toBe('optimo');
    expect(cog.rt_choice.band).toBe('pendiente'); // sin captura
  });

  it('B3: ratio TG/HDL muestra el ratio derivado (~1.08), no los triglicéridos', () => {
    const riesgos = view.sub_edades.riesgos.components;
    expect(riesgos.ratio_tg_hdl.display_value).toBeCloseTo(65 / 60, 2);
    expect(riesgos.ratio_tg_hdl.band).toBe('optimo'); // r ≤ 2 → score 100
    expect(riesgos.trigliceridos.display_value ?? null).toBeNull();
  });

  it('FFMI expone su valor derivado con 2 decimales', () => {
    const ffmi = view.sub_edades.composicion.components.ffmi;
    const expected = (79 * (1 - 0.11)) / Math.pow(1.75, 2);
    expect(ffmi.display_value).toBeCloseTo(expected, 1);
    expect(ffmi.band).toBe('optimo');
  });

  it('score_0_100 de la UI siempre 0-100 y banda coherente (≥80/≥50/<50)', () => {
    for (const sub of Object.values(view.sub_edades)) {
      for (const c of Object.values(sub.components)) {
        expect(c.score_0_100).toBeGreaterThanOrEqual(0);
        expect(c.score_0_100).toBeLessThanOrEqual(100);
        if (c.band === 'optimo') expect(c.score_0_100).toBeGreaterThanOrEqual(80);
        if (c.band === 'atencion') expect(c.score_0_100).toBeLessThan(50);
      }
    }
  });

  it('CE por sub-edad = ce del área del motor (única definición)', () => {
    const motor = computeMotorV2(INPUT);
    for (const k of ['labs', 'composicion', 'fitness', 'cognicion', 'riesgos'] as const) {
      expect(view.sub_edades[k].ce_percent).toBeCloseTo(motor.areas[k].ce * 100, 6);
    }
  });

  it('bandFromScore: umbrales 80/50 y null = pendiente', () => {
    expect(bandFromScore(null)).toBe('pendiente');
    expect(bandFromScore(80)).toBe('optimo');
    expect(bandFromScore(79)).toBe('aceptable');
    expect(bandFromScore(50)).toBe('aceptable');
    expect(bandFromScore(49)).toBe('atencion');
  });
});
