/**
 * MB-30B Pieza 1 — núcleo PURO del filtro nocturno (sin RN, sin nativo).
 *
 * MB-31A: la rampa de color ya NO vive aquí — vive en night-curve.ts (la
 * curva única del manual 3.7: velo in-app + filtro de sistema + pantalla
 * del buró). Este módulo la re-exporta con la misma API y conserva la
 * matemática que el servicio Android espeja. El fallback hardcodeado en
 * Kotlin sigue siendo espejo byte a byte de la rampa y hay un test que los
 * compara (night-filter-core.test.ts).
 *
 * Doctrina de la progresión (brief MB-30B):
 *   - Anclada al corte de pantallas del usuario (screen_time_cutoff), no a
 *     una hora fija. 1h antes del corte entra el ámbar suave; al corte,
 *     naranja; 1h después, rojo — y ahí se sostiene hasta la mañana.
 *   - Opacidades moderadas: el teléfono sigue siendo 100% usable. Un filtro
 *     que no deja ver es una desinstalación, no un hábito.
 */
import {
  NIGHT_FILTER_RAMP,
  NIGHT_FILTER_END_MINUTES,
  NIGHT_FILTER_FALLBACK_CUTOFF,
  type RampStop,
} from '@/src/constants/night-curve';

export {
  NIGHT_FILTER_RAMP,
  NIGHT_FILTER_END_MINUTES,
  NIGHT_FILTER_FALLBACK_CUTOFF,
  type RampStop,
};

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
