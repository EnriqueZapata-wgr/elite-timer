/**
 * Breath timer — lógica pura (T2 Sprint MENTE Ecosystem).
 *
 * Máquina de estados del timer de respiración + color por fase. Separada de
 * app/breathing.tsx para testear las transiciones sin renderizar RN.
 *
 * COLORES espejo de brand.ts (no se importa — arrastra require() de
 * imágenes y rompe el harness node):
 *   inhala  → verde lima (SEMANTIC.success)
 *   retén   → azul (SEMANTIC.info)
 *   exhala  → naranja (SEMANTIC.warning)
 *   vacío   → azul profundo (variante de retención sin aire)
 */
import type { BreathingPhase, BreathingTemplate } from '@/src/data/breathing-library';

export interface BreathStep {
  cycleIdx: number;
  phaseIdx: number;
  secondsInPhase: number;
}

export type BreathTickEvent = 'tick' | 'phase_advanced' | 'cycle_advanced' | 'completed';

export const INITIAL_STEP: BreathStep = { cycleIdx: 0, phaseIdx: 0, secondsInPhase: 0 };

/**
 * Avanza un segundo del timer. Devuelve el siguiente estado + el evento que
 * ocurrió (para haptics/sonido). Cuando `event === 'completed'`, `next` queda
 * congelado en el último instante válido.
 */
export function advanceBreathSecond(
  step: BreathStep,
  template: Pick<BreathingTemplate, 'cycles' | 'phases'>,
): { next: BreathStep; event: BreathTickEvent } {
  const phase = template.phases[step.phaseIdx];
  if (!phase) return { next: step, event: 'completed' };

  const seconds = step.secondsInPhase + 1;
  if (seconds < phase.seconds) {
    return { next: { ...step, secondsInPhase: seconds }, event: 'tick' };
  }

  // Fase terminada → siguiente fase o siguiente ciclo
  const nextPhaseIdx = step.phaseIdx + 1;
  if (nextPhaseIdx < template.phases.length) {
    return {
      next: { ...step, phaseIdx: nextPhaseIdx, secondsInPhase: 0 },
      event: 'phase_advanced',
    };
  }

  const nextCycle = step.cycleIdx + 1;
  if (nextCycle < template.cycles) {
    return {
      next: { cycleIdx: nextCycle, phaseIdx: 0, secondsInPhase: 0 },
      event: 'cycle_advanced',
    };
  }

  return { next: step, event: 'completed' };
}

/** Color por acción de fase (requisito Enrique: cambio de color visible). */
export function phaseColor(action: BreathingPhase['action']): string {
  switch (action) {
    case 'inhale': return '#A8E02A';     // verde lima — energía entrando
    case 'hold': return '#5B9BD5';       // azul — retención con aire
    case 'hold_empty': return '#3B6E9E'; // azul profundo — retención sin aire
    case 'exhale': return '#EF9F27';     // naranja — soltar
    default: return '#7F77DD';
  }
}

/** Escala objetivo del anillo por acción: crece al inhalar, decrece al exhalar. */
export function phaseTargetScale(action: BreathingPhase['action']): number | null {
  switch (action) {
    case 'inhale': return 1.5;
    case 'exhale': return 1.0;
    default: return null; // hold / hold_empty: el anillo se mantiene
  }
}

/** Segundos totales de una sesión completa. */
export function templateTotalSeconds(template: Pick<BreathingTemplate, 'cycles' | 'phases'>): number {
  const cycleSeconds = template.phases.reduce((sum, p) => sum + p.seconds, 0);
  return template.cycles * cycleSeconds;
}

/**
 * Validación estructural de un template (guard para datos de la biblioteca
 * y para el custom box config): ciclos > 0, fases no vacías, segundos > 0.
 */
export function validateBreathingTemplate(t: Pick<BreathingTemplate, 'cycles' | 'phases'>): boolean {
  if (!Number.isInteger(t.cycles) || t.cycles <= 0) return false;
  if (!Array.isArray(t.phases) || t.phases.length === 0) return false;
  return t.phases.every((p) => Number.isFinite(p.seconds) && p.seconds > 0 && p.label.length > 0);
}
