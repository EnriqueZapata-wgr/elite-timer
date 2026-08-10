/**
 * theme-mode-core — resolución PURA del tema (MB-31A · Pieza 3).
 *
 * Los cuatro modos del manual 3.7b:
 *   claro      → siempre acero.
 *   oscuro     → siempre oscuro. DEFAULT de quien no elige.
 *   adaptativo → ATP decide con TU horario: claro al despertar, oscuro al
 *                acercarse tu corte de pantallas. NO mira el ajuste del
 *                sistema: para un cronotipo lobo, el del teléfono lo manda
 *                a oscuro cuatro horas antes de tiempo.
 *   sistema    → sigue el ajuste día/noche del teléfono (useColorScheme).
 *
 * Sin RN y sin reloj propio: recibe minutos y scheme como datos, para que
 * el candado de pruebas ejercite cada rama sin mocks.
 */

export type ThemeModeSetting = 'claro' | 'oscuro' | 'adaptativo' | 'sistema';
export type ThemeKind = 'light' | 'dark';

export const THEME_MODE_DEFAULT: ThemeModeSetting = 'oscuro';

/** Lo guardado en AsyncStorage → un modo válido. Sin preferencia: oscuro. */
export function parseStoredMode(raw: unknown): ThemeModeSetting {
  return raw === 'claro' || raw === 'oscuro' || raw === 'adaptativo' || raw === 'sistema'
    ? raw
    : THEME_MODE_DEFAULT;
}

/**
 * Adaptativo: claro desde despertar hasta el corte de pantallas, oscuro el
 * resto. La ventana puede cruzar medianoche (lobo: despierta 11:00, corta
 * 01:30 → claro de 11:00 a 01:30). Ventana degenerada (despertar == corte)
 * → oscuro, el default honesto.
 */
export function adaptiveKindAt(
  nowMinutes: number,
  despertarMinutes: number,
  corteMinutes: number,
): ThemeKind {
  if (despertarMinutes === corteMinutes) return 'dark';
  const now = ((nowMinutes % 1440) + 1440) % 1440;
  const enVentana = despertarMinutes < corteMinutes
    ? now >= despertarMinutes && now < corteMinutes
    : now >= despertarMinutes || now < corteMinutes;
  return enVentana ? 'light' : 'dark';
}

export interface ThemeResolveCtx {
  /** Minutos del día (0-1439) del momento a resolver. */
  nowMinutes: number;
  /** El horario REAL del usuario (habit-times: goals → cronotipo → default). */
  despertarMinutes: number;
  /** screen_time_cutoff resuelto, el mismo ancla del filtro nocturno. */
  corteMinutes: number;
  /** useColorScheme() del sistema — SOLO lo mira el modo 'sistema'. */
  systemScheme: 'light' | 'dark' | null | undefined;
}

/** El tema efectivo para un modo dado. Cada modo mira SOLO lo suyo. */
export function resolveThemeKind(setting: ThemeModeSetting, ctx: ThemeResolveCtx): ThemeKind {
  switch (setting) {
    case 'claro':
      return 'light';
    case 'adaptativo':
      return adaptiveKindAt(ctx.nowMinutes, ctx.despertarMinutes, ctx.corteMinutes);
    case 'sistema':
      // Sin dato del sistema → oscuro (el canónico).
      return ctx.systemScheme === 'light' ? 'light' : 'dark';
    case 'oscuro':
    default:
      return 'dark';
  }
}

/** 'HH:MM' → minutos del día, o null si no parsea (fail-soft del caller). */
export function hhmmToMinutes(hhmm: string | null | undefined): number | null {
  if (typeof hhmm !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
