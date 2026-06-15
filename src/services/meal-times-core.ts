/**
 * Meal Times — núcleo PURO (sin imports nativos: testeable bajo vitest).
 *
 * Tipos, defaults y lógica de horarios de comida. La capa con I/O (DB + expo-localization)
 * vive en `meal-times-service.ts`, que reexporta estos símbolos.
 */
export const MEAL_IDS = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'] as const;
export type MealId = typeof MEAL_IDS[number];
export type MealWindow = { start: string; end: string };
export type MealTimes = Record<MealId, MealWindow>;

export const MEAL_LABELS: Record<MealId, string> = {
  breakfast: 'Desayuno', snack_am: 'Snack AM', lunch: 'Comida', snack_pm: 'Snack PM', dinner: 'Cena',
};

export const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast: { start: '07:00', end: '09:00' },
  snack_am: { start: '10:00', end: '11:00' },
  lunch: { start: '13:00', end: '15:00' },
  snack_pm: { start: '16:00', end: '17:00' },
  dinner: { start: '19:00', end: '21:00' },
};

/** "07:00" → "7:00" (display). */
function pretty(hhmm: string): string {
  return hhmm.replace(/^0(\d:)/, '$1');
}

/** Ventana legible para la UI, ej. "7:00 – 9:00". */
export function formatMealWindow(w: MealWindow): string {
  return `${pretty(w.start)} – ${pretty(w.end)}`;
}

/** Asegura las 5 comidas con start/end válidos (merge sobre defaults). */
export function normalizeMealTimes(raw: any): MealTimes {
  const out: MealTimes = { ...DEFAULT_MEAL_TIMES };
  if (raw && typeof raw === 'object') {
    for (const id of MEAL_IDS) {
      const w = raw[id];
      if (w && typeof w.start === 'string' && typeof w.end === 'string') {
        out[id] = { start: w.start, end: w.end };
      }
    }
  }
  return out;
}

/** Parsea el formato legacy device-local ("7:00 – 9:00") a { start, end } "HH:MM". */
export function parseLegacyWindow(s: string): MealWindow | null {
  const parts = String(s).split(/[–-]/).map((x) => x.trim());
  if (parts.length !== 2) return null;
  const pad = (t: string) => {
    const [h, m] = t.split(':');
    if (h == null || m == null) return null;
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  };
  const start = pad(parts[0]);
  const end = pad(parts[1]);
  return start && end ? { start, end } : null;
}

/** ¿En qué comida estamos AHORA según los horarios del usuario y su timezone real (IANA)? */
export function getCurrentMeal(mealTimes: MealTimes, timezone: string): MealId | null {
  let h = 0, m = 0;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
    [h, m] = fmt.format(new Date()).split(':').map(Number);
  } catch {
    const d = new Date();
    h = d.getHours(); m = d.getMinutes();
  }
  const current = h * 60 + m;
  for (const id of MEAL_IDS) {
    const { start, end } = mealTimes[id];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (current >= sh * 60 + sm && current <= eh * 60 + em) return id;
  }
  return null;
}
