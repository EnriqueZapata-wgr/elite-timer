/**
 * MB-12 · A-5 — Verificación obligatoria del tramo A (los cuatro casos).
 *
 * Corre los cuatro casos del brief contra el código REAL de decisión:
 * las mismas expresiones que evalúa checkin.tsx (crisisSelected /
 * hotlineVisible) y la rama que renderiza emotion-navigation.tsx
 * (buildNavigationPlan → crisis + TOOL_CRISIS). Lo que este harness no puede
 * cubrir (render nativo, insert real a Supabase) queda para el device test.
 */
import { describe, it, expect } from 'vitest';
import {
  buildNavigationPlan, isCrisisOrigin, isCrisisHotline, hasCrisisTrajectory,
  CRISIS_TRAJECTORY_COUNT, CRISIS_TRAJECTORY_WINDOW_DAYS,
} from '../emotion-navigation-core';
import { TOOL_CRISIS } from '../../data/emotion-navigation';
import { EMOTIONS } from '../../data/emotions-library';

const TODAY = '2026-07-28';

/** Réplica exacta de las dos expresiones de checkin.tsx. */
function checkinCrisisView(
  selectedEmotions: string[],
  pastCheckins: { created_at: string; emotions: string[] }[],
) {
  const crisisSelected = selectedEmotions.some(isCrisisOrigin);
  const hotlineVisible = crisisSelected && (
    selectedEmotions.some(isCrisisHotline) ||
    hasCrisisTrajectory(
      [
        { created_at: `${TODAY}T12:00:00`, emotions: selectedEmotions },
        ...pastCheckins,
      ],
      TODAY,
    )
  );
  return { crisisSelected, hotlineVisible };
}

const level1Checkin = (localDate: string) =>
  ({ created_at: `${localDate}T20:00:00`, emotions: ['numb'] });

describe('A-5 · caso 1 — check-in con "Sin esperanza" (hopeless)', () => {
  it('aterriza en acompañamiento, con banner, sin celebración', () => {
    const { crisisSelected, hotlineVisible } = checkinCrisisView(['hopeless'], []);
    // Rompe el flujo: sin racha, sin "Check-in registrado ✓" (gate de UI).
    expect(crisisSelected).toBe(true);
    // Nivel 2 por marcador directo → Línea de la Vida visible.
    expect(hotlineVisible).toBe(true);
    // El destino es /emotion-navigation y su rama es acompañamiento, no análisis.
    const plan = buildNavigationPlan('hopeless')!;
    expect(plan.crisis).toBe(true);
    expect(plan.moves).toHaveLength(0);
    expect(plan.crisisTool).toEqual(TOOL_CRISIS);
    // El registro no se bloquea: la selección es una emoción válida del catálogo
    // y el flujo de guardado no depende del nivel de crisis.
    expect(EMOTIONS.some((e) => e.id === 'hopeless')).toBe(true);
  });
});

describe('A-5 · caso 2 — check-in con "Sin sentir" (numb)', () => {
  it('acompañamiento SIN banner (nivel 1, no marcador, sin trayectoria)', () => {
    const { crisisSelected, hotlineVisible } = checkinCrisisView(['numb'], []);
    expect(crisisSelected).toBe(true);
    expect(hotlineVisible).toBe(false);
    const plan = buildNavigationPlan('numb')!;
    expect(plan.crisis).toBe(true);
    expect(plan.crisisTool).toEqual(TOOL_CRISIS);
  });
});

describe('A-5 · caso 3 — check-in con "Alegre" (joyful)', () => {
  it('flujo normal intacto: sin crisis, sin banner, con su racha', () => {
    const { crisisSelected, hotlineVisible } = checkinCrisisView(['joyful'], []);
    // !crisisSelected → la UI muestra racha + invitación a navegar como hoy.
    expect(crisisSelected).toBe(false);
    expect(hotlineVisible).toBe(false);
    const plan = buildNavigationPlan('joyful')!;
    expect(plan.crisis).toBe(false);
    expect(plan.moves.length).toBeGreaterThan(0);
  });
});

describe('A-5 · caso 4 — trayectoria: 3 check-ins nivel 1 en 7 días', () => {
  it('el cuarto muestra banner aunque sea "Sin sentir"', () => {
    const past = [level1Checkin('2026-07-25'), level1Checkin('2026-07-23'), level1Checkin('2026-07-22')];
    const { crisisSelected, hotlineVisible } = checkinCrisisView(['numb'], past);
    expect(crisisSelected).toBe(true);
    expect(hotlineVisible).toBe(true);
  });

  it('emotion-navigation también la ve (misma función sobre los últimos 7 días)', () => {
    const rows = [
      level1Checkin('2026-07-28'), // el check-in recién guardado
      level1Checkin('2026-07-25'), level1Checkin('2026-07-23'), level1Checkin('2026-07-22'),
    ];
    expect(hasCrisisTrajectory(rows, TODAY)).toBe(true);
  });

  it('check-ins fuera de la ventana de 7 días NO cuentan', () => {
    const past = [level1Checkin('2026-07-20'), level1Checkin('2026-07-18'), level1Checkin('2026-07-15')];
    const { hotlineVisible } = checkinCrisisView(['numb'], past);
    expect(hotlineVisible).toBe(false);
  });

  it('check-ins sin emociones de nivel 1 NO cuentan', () => {
    const past = [
      { created_at: '2026-07-25T20:00:00', emotions: ['sad'] },
      { created_at: '2026-07-24T20:00:00', emotions: ['tired'] },
      { created_at: '2026-07-23T20:00:00', emotions: ['joyful'] },
    ];
    const { hotlineVisible } = checkinCrisisView(['numb'], past);
    expect(hotlineVisible).toBe(false);
  });

  it('las constantes del brief quedan fijadas', () => {
    expect(CRISIS_TRAJECTORY_COUNT).toBe(3);
    expect(CRISIS_TRAJECTORY_WINDOW_DAYS).toBe(7);
    // Nivel 2 por marcador: exactamente los tres del brief.
    for (const id of ['hopeless', 'depressed', 'trapped']) expect(isCrisisHotline(id)).toBe(true);
    for (const id of ['empty', 'helpless', 'numb', 'abandoned', 'panicked']) expect(isCrisisHotline(id)).toBe(false);
    // Nivel 1: los ocho del brief, verificados contra el catálogo.
    for (const id of ['hopeless', 'depressed', 'trapped', 'empty', 'helpless', 'numb', 'abandoned', 'panicked']) {
      expect(isCrisisOrigin(id), id).toBe(true);
      expect(EMOTIONS.some((e) => e.id === id), id).toBe(true);
    }
  });
});
