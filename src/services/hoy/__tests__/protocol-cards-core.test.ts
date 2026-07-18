import { describe, expect, it } from 'vitest';

import {
  HOY_BASELINE_CARDS,
  cardKeyForIntervention,
  deriveProtocolDrivenVisible,
} from '../protocol-cards-core';

describe('cardKeyForIntervention (#3b bridge Mi Protocolo → cards HOY)', () => {
  it('mapea por familia canónica (cross-vocabulario)', () => {
    expect(cardKeyForIntervention('Exposición solar matutina (Fitzpatrick)')).toBe('luz_solar');
    expect(cardKeyForIntervention('Hidratación al despertar')).toBe('agua');
    expect(cardKeyForIntervention('Suplementos matutinos')).toBe('suplementos');
    expect(cardKeyForIntervention('Lentes rojos en la noche')).toBe('lentes_rojos');
    expect(cardKeyForIntervention('Corte de pantallas antes de dormir')).toBe('screen_time_cutoff');
    expect(cardKeyForIntervention('Grounding descalzo')).toBe('grounding');
    expect(cardKeyForIntervention('Romper ayuno 16h')).toBe('ayuno');
  });

  it('mapea conceptos sin familia por nombre normalizado', () => {
    expect(cardKeyForIntervention('Meditación matutina')).toBe('meditacion');
    expect(cardKeyForIntervention('Respiración de coherencia cardiaca')).toBe('breathwork');
    expect(cardKeyForIntervention('Baño frío')).toBe('bano_frio');
    expect(cardKeyForIntervention('Journal de gratitud')).toBe('journal');
    expect(cardKeyForIntervention('Entrenamiento de fuerza')).toBe('fuerza');
    expect(cardKeyForIntervention('Cardio zona 2')).toBe('cardio');
    expect(cardKeyForIntervention('Día sin alcohol')).toBe('no_alcohol');
    expect(cardKeyForIntervention('Evitar ultraprocesados')).toBe('no_processed_foods');
  });

  it('intervención sin card editorial → null (vive solo en agenda, no inventa card)', () => {
    expect(cardKeyForIntervention('Oil pulling')).toBeNull();
    expect(cardKeyForIntervention('Ayuno de sardinas')).not.toBe('meditacion');
  });
});

describe('deriveProtocolDrivenVisible', () => {
  it('protocolo vacío → null (caller cae a config manual, HOY nunca vacío)', () => {
    expect(deriveProtocolDrivenVisible([])).toBeNull();
  });

  it('visible = baseline ∪ prescritas', () => {
    const visible = deriveProtocolDrivenVisible(['Meditación matutina', 'Oil pulling'])!;
    for (const k of HOY_BASELINE_CARDS) expect(visible.has(k), k).toBe(true);
    expect(visible.has('meditacion')).toBe(true);
    // no prescrita y fuera del baseline → oculta
    expect(visible.has('grounding')).toBe(false);
    expect(visible.has('lentes_rojos')).toBe(false);
  });

  it('HOY-1 (MB-1): meditación y journal son baseline — visibles SIN protocolo que los prescriba', () => {
    // Regresión del P0: batch-1 los dejó fuera del baseline y desaparecían del HOY.
    expect(HOY_BASELINE_CARDS).toContain('meditacion');
    expect(HOY_BASELINE_CARDS).toContain('journal');
    const visible = deriveProtocolDrivenVisible(['Oil pulling'])!;
    expect(visible.has('meditacion')).toBe(true);
    expect(visible.has('journal')).toBe(true);
  });
});
