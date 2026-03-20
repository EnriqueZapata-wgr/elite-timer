/**
 * Helpers del motor — formateo de tiempo y cálculo de estadísticas.
 */
import type { ExecutionStep } from './types';

// === FORMATEO DE TIEMPO ===

/** Formatea segundos a "MM:SS" o "H:MM:SS" si ≥ 1 hora */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Formatea segundos a texto legible: "1h 09m", "4:00", "30s" */
export function formatTimeHuman(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0 && m > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (h > 0) return `${h}h`;
  if (m > 0 && sec > 0) return `${m}:${String(sec).padStart(2, '0')}`;
  if (m > 0) return `${m}:00`;
  return `${sec}s`;
}

// === ESTADÍSTICAS DE RUTINA ===

export interface RoutineCalcStats {
  totalSeconds: number;
  workSeconds: number;
  restSeconds: number;
  prepSeconds: number;
  workRatio: number;
  restRatio: number;
  formattedTotal: string;
  formattedWork: string;
  formattedRest: string;
  totalSteps: number;
  workSteps: number;
  restSteps: number;
}

/** Calcula estadísticas a partir de los steps compilados */
export function calcRoutineStats(steps: ExecutionStep[]): RoutineCalcStats {
  let workSeconds = 0;
  let restSeconds = 0;
  let prepSeconds = 0;
  let workSteps = 0;
  let restSteps = 0;

  for (const step of steps) {
    switch (step.type) {
      case 'work':
        workSeconds += step.durationSeconds;
        workSteps++;
        break;
      case 'rest':
        restSeconds += step.durationSeconds;
        restSteps++;
        break;
      case 'prep':
        prepSeconds += step.durationSeconds;
        break;
    }
  }

  const totalSeconds = workSeconds + restSeconds + prepSeconds;

  return {
    totalSeconds,
    workSeconds,
    restSeconds,
    prepSeconds,
    workRatio: totalSeconds > 0 ? workSeconds / totalSeconds : 0,
    restRatio: totalSeconds > 0 ? restSeconds / totalSeconds : 0,
    formattedTotal: formatTimeHuman(totalSeconds),
    formattedWork: formatTimeHuman(workSeconds),
    formattedRest: formatTimeHuman(restSeconds),
    totalSteps: steps.length,
    workSteps,
    restSteps,
  };
}
