/**
 * display-labels — guard del legibilizador snake_case → español (Mega-Sprint A B1.2).
 */
import { describe, it, expect } from 'vitest';
import { displayLabel, displayLabels } from '../display-labels';

describe('displayLabel (mapa curado)', () => {
  it('legibiliza los términos del brief', () => {
    expect(displayLabel('cortisol_ritmo')).toBe('ritmo de cortisol');
    expect(displayLabel('presion_arterial_matutina')).toBe('presión arterial matutina');
    expect(displayLabel('25-OH-vitamina_D')).toBe('vitamina D (25-OH)');
    expect(displayLabel('HRV_RMSSD')).toBe('HRV (RMSSD)');
    expect(displayLabel('digestion_estres_autonomico')).toBe('digestión por estrés');
    expect(displayLabel('insulin_resistance')).toBe('resistencia a la insulina');
    expect(displayLabel('no_sun_exposure')).toBe('baja exposición solar');
  });

  it('conserva la nota entre paréntesis intacta', () => {
    expect(displayLabel('cortisol_ritmo (amplifica CAR matutino)'))
      .toBe('ritmo de cortisol (amplifica CAR matutino)');
    expect(displayLabel('25-OH-vitamina_D (target funcional 50-80 ng/mL)'))
      .toBe('vitamina D (25-OH) (target funcional 50-80 ng/mL)');
  });

  it('condiciones Fx en inglés → español (B1.3)', () => {
    expect(displayLabel('hypertension')).toBe('hipertensión');
    expect(displayLabel('knee_injury')).toBe('lesión de rodilla');
    expect(displayLabel('adhd')).toBe('TDAH');
    expect(displayLabel('chronic_stress')).toBe('estrés crónico');
  });

  it('beautify de cola: key desconocida con guiones bajos → espacios', () => {
    expect(displayLabel('EEG_alpha_power_frontal')).toBe('EEG alpha power frontal');
    expect(displayLabel('sueño_profundo_horas')).toBe('horas de sueño profundo'); // mapeado
  });

  it('no rompe lo ya legible (sin guiones bajos)', () => {
    expect(displayLabel('HbA1c')).toBe('HbA1c');
    expect(displayLabel('insulina')).toBe('insulina');
    expect(displayLabel('')).toBe('');
  });

  it('displayLabels mapea una lista', () => {
    expect(displayLabels(['HRV_RMSSD', 'cortisol_ritmo'])).toEqual(['HRV (RMSSD)', 'ritmo de cortisol']);
  });
});
