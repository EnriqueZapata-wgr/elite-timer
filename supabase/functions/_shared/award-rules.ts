// award-rules — lógica PURA del award de electrones (sin Deno/Node/URLs).
// La importan la Edge Function award-electrons (Deno) y los tests (vitest) → una sola verdad.

export type EvidenceTier = "wearable" | "evidence" | "self" | "elite";

export interface HabitRule {
  requiredEvidence: EvidenceTier;
  amount: number;
  dailyCap: number;
  decay: boolean;
}

export const HABIT_RULES: Record<string, HabitRule> = {
  sleep_wearable:     { requiredEvidence: "wearable", amount: 30,  dailyCap: 1,  decay: false },
  steps_wearable:     { requiredEvidence: "wearable", amount: 20,  dailyCap: 1,  decay: false },
  cardio_hr_wearable: { requiredEvidence: "wearable", amount: 25,  dailyCap: 3,  decay: false },
  meditation_in_app:  { requiredEvidence: "evidence", amount: 15,  dailyCap: 3,  decay: false },
  food_photo:         { requiredEvidence: "evidence", amount: 8,   dailyCap: 4,  decay: false },
  food_text:          { requiredEvidence: "evidence", amount: 5,   dailyCap: 4,  decay: false },
  checkin_emotional:  { requiredEvidence: "evidence", amount: 10,  dailyCap: 1,  decay: false },
  hydration_tap:      { requiredEvidence: "self",     amount: 2,   dailyCap: 10, decay: true  },
  supplement_check:   { requiredEvidence: "self",     amount: 3,   dailyCap: 8,  decay: true  },
  lab_uploaded:       { requiredEvidence: "elite",    amount: 200, dailyCap: 5,  decay: false },
  test_completed:     { requiredEvidence: "elite",    amount: 100, dailyCap: 1,  decay: false },
};

/** Curva decreciente: 1er = base, baja con cada repetición, mínimo 1. */
export function applyDecay(baseAmount: number, occurrenceIndex: number, dailyCap: number): number {
  if (occurrenceIndex <= 0) return baseAmount;
  const factor = Math.max(0, 1 - occurrenceIndex / dailyCap);
  return Math.max(1, Math.round(baseAmount * factor));
}

/** Monto a otorgar dado el índice de ocurrencia del día (aplica decay si la regla lo pide). */
export function amountForOccurrence(rule: HabitRule, occurrenceIndex: number): number {
  return rule.decay ? applyDecay(rule.amount, occurrenceIndex, rule.dailyCap) : rule.amount;
}

export type Validation =
  | { ok: true; rule: HabitRule }
  | { ok: false; status: 422; type: "invalid_habit"; message: string };

/** Valida habit_type conocido + evidence_tier correcto. */
export function validateHabit(habitType: string, evidenceTier: string): Validation {
  const rule = HABIT_RULES[habitType];
  if (!rule) return { ok: false, status: 422, type: "invalid_habit", message: `habit_type desconocido: ${habitType}` };
  if (evidenceTier !== rule.requiredEvidence) {
    return { ok: false, status: 422, type: "invalid_habit", message: `evidence_tier '${evidenceTier}' != '${rule.requiredEvidence}' para ${habitType}` };
  }
  return { ok: true, rule };
}

/**
 * Ventana del día [00:00Z, +24h) a partir de local_date. Anti-abuso: si local_date está a más
 * de 1 día de hoy UTC (gaming de caps con fechas lejanas), usa hoy UTC. `nowIso` se inyecta
 * para test determinista.
 */
export function resolveDayWindow(localDate: string | undefined, nowIso: string): { start: string; end: string; date: string } {
  const todayUtc = nowIso.slice(0, 10);
  let date = todayUtc;
  if (typeof localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    const diff = Math.abs((Date.parse(localDate + "T00:00:00Z") - Date.parse(todayUtc + "T00:00:00Z")) / 86_400_000);
    if (diff <= 1) date = localDate;
  }
  const start = `${date}T00:00:00.000Z`;
  const end = new Date(Date.parse(start) + 86_400_000).toISOString();
  return { start, end, date };
}
