/**
 * night-veil-core — el velo nocturno IN-APP, puro (MB-31A · Pieza 3).
 *
 * El filtro NO es un tema: es una capa encima de cualquiera de los cuatro
 * modos. Si alguien está en claro a las once de la noche, el velo entibia
 * el claro; no lo fuerza a oscuro. La progresión es LA curva única
 * (night-curve.ts, la misma del filtro de sistema y la pantalla del buró).
 *
 * Contrato duro del manual 3.7: el velo nunca puede tumbar el contraste por
 * debajo de AA. Si al componer la capa un par de texto deja de leerse, la
 * capa SE LIMITA (se recorta su alpha hasta que todos los pares pasen).
 * Legibilidad antes que estética — y con prueba.
 */
import { filterStateAt, type FilterColor } from '@/src/services/night-filter-core';
import type { AppThemeTokens } from '@/src/constants/brand';
import { compositeOver, contrastRatio, hexToRgb } from '@/src/utils/contrast';

/**
 * Los pares que el velo tiene prohibido romper, con su nivel. El tenue es
 * un rol de texto grande (3.19 en claro), así que su piso es 3.0; los demás
 * son AA de texto normal.
 */
export function parejasProtegidas(t: AppThemeTokens): { fg: string; bg: string; min: number }[] {
  return [
    { fg: t.texto, bg: t.card, min: 4.5 },
    { fg: t.texto, bg: t.fondo, min: 4.5 },
    { fg: t.textoSecundario, bg: t.card, min: 4.5 },
    { fg: t.textoSecundario, bg: t.fondo, min: 4.5 },
    { fg: t.textoTenue, bg: t.card, min: 3.0 },
  ];
}

/** ¿Este velo, compuesto sobre el tema, deja legibles todos los pares? */
export function veilPassesAA(color: FilterColor, t: AppThemeTokens): boolean {
  return parejasProtegidas(t).every(({ fg, bg, min }) => {
    const fgComp = compositeOver(color, hexToRgb(fg));
    const bgComp = compositeOver(color, hexToRgb(bg));
    return contrastRatio(fgComp, bgComp) >= min;
  });
}

/**
 * Limita el alpha del velo hasta que ningún par baje de su nivel (búsqueda
 * binaria; el contraste compuesto decrece con el alpha, así que el máximo
 * legible existe y es único).
 */
export function clampVeilForTheme(color: FilterColor, t: AppThemeTokens): FilterColor {
  if (veilPassesAA(color, t)) return color;
  let lo = 0;
  let hi = color.a;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (veilPassesAA({ ...color, a: mid }, t)) lo = mid;
    else hi = mid;
  }
  return { ...color, a: lo };
}

/**
 * El color FINAL del velo in-app a esta hora, sobre este tema. null = velo
 * apagado (fuera de ventana). El tono viene de la curva única; el alpha
 * llega recortado si hace falta para no romper AA.
 */
export function veilColorAt(
  nowMinutes: number,
  cutoffMinutes: number,
  t: AppThemeTokens,
): FilterColor | null {
  const s = filterStateAt(nowMinutes, cutoffMinutes);
  if (!s.active || !s.color) return null;
  return clampVeilForTheme(s.color, t);
}

/** rgba() listo para backgroundColor de RN. */
export function veilToRgba(c: FilterColor): string {
  return `rgba(${c.r},${c.g},${c.b},${Math.round(c.a * 1000) / 1000})`;
}
