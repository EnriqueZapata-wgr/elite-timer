/**
 * Builders puros de items de agenda "informativos" (comidas + sueño) para revivir la agenda
 * de HOY. Sin imports nativos (importa de meal-times-core, no del service con expo-localization)
 * → testeable bajo vitest. day-compiler los usa dentro de buildAgenda.
 */
import { MEAL_IDS, MEAL_LABELS, type MealTimes } from '@/src/services/meal-times-core';
import type { AgendaItem } from '@/src/services/day-compiler';

/** Un item por ventana de comida configurada (informativo, no toggleable). */
export function mealAgendaItems(mealTimes: MealTimes): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const id of MEAL_IDS) {
    const w = mealTimes[id];
    if (!w?.start) continue;
    out.push({
      id: `meal-${id}`,
      time: w.start,
      name: MEAL_LABELS[id],
      category: 'nutrition',
      completed: false, isNext: false, isSmart: false, informational: true,
    });
  }
  return out;
}

/**
 * MB-6: ventana de foco pico del cronotipo → item informativo de agenda.
 * user_chronotype YA tenía peak_focus_start/end sin usar; esto la conecta con
 * la agenda para que lo cognitivamente pesado se agende dentro de la ventana.
 * Acepta "10:00" o "10:00:00". null si no hay dato (no inventar ventanas).
 */
export function focusWindowAgendaItem(
  focusStartRaw: string | null | undefined,
  focusEndRaw: string | null | undefined,
): AgendaItem | null {
  if (!focusStartRaw) return null;
  const start = String(focusStartRaw).slice(0, 5);
  if (!/^\d{1,2}:\d{2}$/.test(start)) return null;
  const end = focusEndRaw ? String(focusEndRaw).slice(0, 5) : null;
  const endOk = end && /^\d{1,2}:\d{2}$/.test(end) ? end : null;
  return {
    id: 'focus-window',
    time: start,
    name: 'Ventana de foco profundo',
    subtitle: endOk ? `Hasta ${endOk} — agenda aquí lo pesado` : 'Agenda aquí lo pesado',
    category: 'mind',
    completed: false, isNext: false, isSmart: false, informational: true,
  };
}

/** Item de objetivo de sueño desde el cronotipo (acepta "23:00" o "23:00:00"). null si no hay. */
export function sleepAgendaItem(sleepRaw: string | null | undefined): AgendaItem | null {
  if (!sleepRaw) return null;
  const time = String(sleepRaw).slice(0, 5);
  if (!/^\d{1,2}:\d{2}$/.test(time)) return null;
  return {
    id: 'sleep-target',
    time,
    name: 'Dormir',
    subtitle: 'Objetivo de sueño',
    category: 'rest',
    completed: false, isNext: false, isSmart: false, informational: true,
  };
}
