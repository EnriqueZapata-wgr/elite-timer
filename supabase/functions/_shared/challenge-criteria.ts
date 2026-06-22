// challenge-criteria — lógica PURA de progreso/criterio de retos (sin Deno/Node).
// La importan: el writer cliente, la Edge Function settle-challenge y los tests → una verdad.

export type CriteriaType =
  | "daily_steps" | "sleep_quality" | "days_streak_habit" | "food_logged"
  | "lab_uploaded" | "cardio_minutes" | "meditation_minutes";

export interface Criteria {
  type: CriteriaType;
  target?: number;        // umbral por evento (steps/min) o total objetivo (count/min acumulado)
  days_required?: number; // días/ocurrencias requeridas
}

export interface Progress {
  days_completed?: number;
  total_minutes?: number;
  count?: number;
  streak?: number;
  last_date?: string;     // anti doble-conteo del mismo día
  [k: string]: unknown;
}

export interface ProgressEvent {
  type: CriteriaType;
  value: number;
  date: string; // YYYY-MM-DD local
}

/** Día siguiente (UTC calendar) de un YYYY-MM-DD. */
function nextDay(date: string): string {
  return new Date(Date.parse(date + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
}

/** Actualiza el progress dado un evento. PURO. No muta `current`. */
export function updateProgress(criteria: Criteria, current: Progress | null | undefined, event: ProgressEvent): Progress {
  const p: Progress = { ...(current ?? {}) };
  if (criteria.type !== event.type) return p;
  const target = Number(criteria.target ?? 0);

  switch (criteria.type) {
    case "daily_steps":
    case "sleep_quality": {
      // Un día cuenta UNA vez y solo si supera el umbral.
      if (event.value >= target && p.last_date !== event.date) {
        p.days_completed = (p.days_completed ?? 0) + 1;
        p.last_date = event.date;
      }
      return p;
    }
    case "days_streak_habit": {
      if (p.last_date === event.date) return p; // mismo día, no recontar
      if (p.last_date && nextDay(p.last_date) === event.date) {
        p.streak = (p.streak ?? 0) + 1; // día consecutivo
      } else {
        p.streak = 1; // reinicia racha
      }
      p.last_date = event.date;
      return p;
    }
    case "cardio_minutes":
    case "meditation_minutes":
      p.total_minutes = (p.total_minutes ?? 0) + event.value;
      return p;
    case "food_logged":
    case "lab_uploaded":
      p.count = (p.count ?? 0) + 1;
      return p;
    default:
      return p;
  }
}

/** ¿El criterio está cumplido dado el progress? PURO. */
export function isCompleted(criteria: Criteria, progress: Progress | null | undefined): boolean {
  const p = progress ?? {};
  switch (criteria.type) {
    case "daily_steps":
    case "sleep_quality":
      return (p.days_completed ?? 0) >= Number(criteria.days_required ?? 0) && Number(criteria.days_required ?? 0) > 0;
    case "days_streak_habit":
      return (p.streak ?? 0) >= Number(criteria.days_required ?? 0) && Number(criteria.days_required ?? 0) > 0;
    case "cardio_minutes":
    case "meditation_minutes":
      return (p.total_minutes ?? 0) >= Number(criteria.target ?? 0) && Number(criteria.target ?? 0) > 0;
    case "food_logged":
    case "lab_uploaded":
      return (p.count ?? 0) >= Number(criteria.days_required ?? criteria.target ?? 0) && Number(criteria.days_required ?? criteria.target ?? 0) > 0;
    default:
      return false;
  }
}
