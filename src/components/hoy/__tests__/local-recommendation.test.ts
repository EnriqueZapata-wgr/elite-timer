import { describe, it, expect } from 'vitest';
import { generateLocalRecommendation } from '@/src/services/hoy/local-recommendation';

/**
 * #hoy-redesign Parte 3 — mensaje local del Hero (gratis, sin ARGOS). 10+ contextos.
 */
describe('generateLocalRecommendation', () => {
  it('desayuno con ayuno cumplido → romper ayuno', () => {
    const m = generateLocalRecommendation({ category: 'meal', name: 'Desayuno' }, { hour: 9, fastingHours: 16, fastingTarget: 16 });
    expect(m).toContain('romper tu ayuno');
    expect(m).toContain('16h');
  });

  it('desayuno con ayuno incompleto → falta', () => {
    const m = generateLocalRecommendation({ category: 'meal', name: 'Desayuno' }, { hour: 8, fastingHours: 12, fastingTarget: 16 });
    expect(m).toContain('Falta');
  });

  it('comida con déficit de proteína → asegura Xg', () => {
    const m = generateLocalRecommendation({ category: 'meal', name: 'Comida' }, { hour: 14, proteinConsumed: 40, proteinTarget: 150 });
    expect(m).toContain('110g');
  });

  it('comida con proteína cubierta → vas bien', () => {
    const m = generateLocalRecommendation({ category: 'meal', name: 'Comida' }, { hour: 14, proteinConsumed: 160, proteinTarget: 150 });
    expect(m.toLowerCase()).toContain('proteína');
  });

  it('agua con déficit → faltan ml', () => {
    const m = generateLocalRecommendation({ category: 'meal', name: 'Agua' }, { hour: 12, waterConsumed: 500, waterTarget: 2500 });
    expect(m).toContain('2000ml');
  });

  it('ejercicio fuerza no hecho → energía en pico', () => {
    const m = generateLocalRecommendation({ category: 'exercise', name: 'Fuerza push' }, { hour: 10, exerciseDoneToday: false });
    expect(m.toLowerCase()).toContain('pico');
  });

  it('ejercicio ya hecho → recupera', () => {
    const m = generateLocalRecommendation({ category: 'exercise', name: 'Cardio' }, { hour: 18, exerciseDoneToday: true });
    expect(m.toLowerCase()).toContain('recupera');
  });

  it('luz solar antes del amanecer → falta ventana', () => {
    const m = generateLocalRecommendation({ category: 'rhythm', name: 'Luz solar' }, { hour: 5, sunriseHour: 7, sunsetHour: 19 });
    expect(m.toLowerCase()).toContain('falta');
  });

  it('luz solar tras atardecer → mejor mañana', () => {
    const m = generateLocalRecommendation({ category: 'rhythm', name: 'Luz solar' }, { hour: 21, sunriseHour: 7, sunsetHour: 19 });
    expect(m.toLowerCase()).toContain('mañana');
  });

  it('luz solar en ventana → óptima', () => {
    const m = generateLocalRecommendation({ category: 'rhythm', name: 'Luz solar' }, { hour: 8, sunriseHour: 7, sunsetHour: 19 });
    expect(m).toContain('óptima');
  });

  it('breathwork → respira', () => {
    const m = generateLocalRecommendation({ category: 'mind', name: 'Breathwork' }, { hour: 15 });
    expect(m.toLowerCase()).toContain('respira');
  });

  it('baño frío → 1-3 min', () => {
    const m = generateLocalRecommendation({ category: 'recovery', name: 'Baño frío' }, { hour: 7 });
    expect(m.toLowerCase()).toContain('frío');
  });

  it('fallback por hora de la tarde', () => {
    const m = generateLocalRecommendation({ category: 'unknown', name: 'Algo' }, { hour: 15 });
    expect(m.length).toBeGreaterThan(0);
  });

  it('usa defaultMessage si no hay regla', () => {
    const m = generateLocalRecommendation({ category: 'unknown', name: 'X', defaultMessage: 'Sigue tu plan' }, { hour: 15 });
    expect(m).toBe('Sigue tu plan');
  });
});
