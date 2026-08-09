/**
 * MB-30B Pieza 1 — núcleo PURO del filtro nocturno (sin RN, sin nativo).
 *
 * La rampa de color vive AQUÍ y solo aquí: es la fuente única. El servicio
 * Android (NightFilterService.kt) recibe estos stops serializados y solo
 * interpola; el fallback hardcodeado en Kotlin es un espejo de esta tabla y
 * hay un test que los compara (night-filter.test.ts).
 *
 * Doctrina de la progresión (brief MB-30B):
 *   - Anclada al corte de pantallas del usuario (screen_time_cutoff), no a
 *     una hora fija. 1h antes del corte entra el ámbar suave; al corte,
 *     naranja; 1h después, rojo — y ahí se sostiene hasta la mañana.
 *   - Opacidades moderadas: el teléfono sigue siendo 100% usable. Un filtro
 *     que no deja ver es una desinstalación, no un hábito.
 */

export interface RampStop {
  /** Minutos relativos al corte (negativo = antes del corte). */
  at: number;
  r: number;
  g: number;
  b: number;
  /** Opacidad 0..1. */
  a: number;
}

/** 05:00 — la mañana apaga el filtro aunque nadie lo toque. */
export const NIGHT_FILTER_END_MINUTES = 5 * 60;

/** Fallback si la hora del usuario no se puede leer (espejo de tareas-core). */
export const NIGHT_FILTER_FALLBACK_CUTOFF = 21 * 60 + 45; // '21:45'

export const NIGHT_FILTER_RAMP: RampStop[] = [
  { at: -60, r: 255, g: 191, b: 0, a: 0.1 }, // ámbar suave, 1h antes del corte
  { at: 0, r: 255, g: 140, b: 0, a: 0.22 }, // naranja al corte
  { at: 60, r: 255, g: 60, b: 0, a: 0.34 }, // rojo 1h después; se sostiene
];

/** ARGB de 32 bits CON SIGNO — el formato que espera el servicio Android. */
export function stopToArgb(s: RampStop): number {
  const a = Math.round(s.a * 255) & 0xff;
  return ((a << 24) | ((s.r & 0xff) << 16) | ((s.g & 0xff) << 8) | (s.b & 0xff)) | 0;
}

/** Serialización que viaja al servicio nativo: [{ at, argb }]. */
export function rampStopsJson(ramp: RampStop[] = NIGHT_FILTER_RAMP): string {
  return JSON.stringify(ramp.map((s) => ({ at: s.at, argb: stopToArgb(s) })));
}

/** Minutos relativos al corte, normalizados a (-720, 720]. */
export function relMinutes(nowMinutes: number, cutoffMinutes: number): number {
  let rel = (((nowMinutes - cutoffMinutes) % 1440) + 1440) % 1440;
  if (rel > 720) rel -= 1440;
  return rel;
}

export interface FilterColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FilterState {
  active: boolean;
  color: FilterColor | null;
}

/** Interpolación lineal por canal entre stops, con clamp en los extremos. */
export function colorAt(rel: number, ramp: RampStop[] = NIGHT_FILTER_RAMP): FilterColor {
  const first = ramp[0];
  const last = ramp[ramp.length - 1];
  if (rel <= first.at) return { r: first.r, g: first.g, b: first.b, a: first.a };
  if (rel >= last.at) return { r: last.r, g: last.g, b: last.b, a: last.a };
  for (let i = 1; i < ramp.length; i++) {
    if (rel <= ramp[i].at) {
      const prev = ramp[i - 1];
      const next = ramp[i];
      const span = Math.max(1, next.at - prev.at);
      const t = (rel - prev.at) / span;
      return {
        r: Math.round(prev.r + (next.r - prev.r) * t),
        g: Math.round(prev.g + (next.g - prev.g) * t),
        b: Math.round(prev.b + (next.b - prev.b) * t),
        a: prev.a + (next.a - prev.a) * t,
      };
    }
  }
  return { r: last.r, g: last.g, b: last.b, a: last.a };
}

/**
 * ¿El filtro está activo a esta hora, y de qué color? Espejo exacto de la
 * lógica del servicio Android (relMinutesNow / isActiveAt / colorAt).
 */
export function filterStateAt(
  nowMinutes: number,
  cutoffMinutes: number,
  ramp: RampStop[] = NIGHT_FILTER_RAMP,
  endMinutes: number = NIGHT_FILTER_END_MINUTES,
): FilterState {
  const rel = relMinutes(nowMinutes, cutoffMinutes);
  const endRel = (((endMinutes - cutoffMinutes) % 1440) + 1440) % 1440;
  if (rel < ramp[0].at || rel > endRel) return { active: false, color: null };
  return { active: true, color: colorAt(rel, ramp) };
}

/** 'HH:MM' para mostrar en UI (la hora en que arranca el ámbar, p. ej.). */
export function minutesToHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
