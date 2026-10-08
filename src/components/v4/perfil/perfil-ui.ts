/**
 * perfil-ui (8-oct-2026 (v4)): ayudas de color y estilo compartidas por las
 * piezas del PERFIL. Solo tokens del tema (claro y oscuro).
 *
 * 8-oct-2026 (v4, revision en frio): el lima de marca vive SOLO en el numero
 * de la Edad ATP del heroe (el dato heroico de la vista, maximo uno). Todo lo
 * demas que pide acento usa el teal calibrado del tema.
 */
import type { AppThemeTokens } from '@/src/constants/brand';
import { withOpacity } from '@/src/constants/brand';
import type { TokenEstado } from '@/src/services/elite/evaluacion-elite-core';

/** La tinta de un estado (att, sub, opt) en el tema; sin estado, la de "sin datos". */
export function colorEstado(t: AppThemeTokens, token: TokenEstado | null): string {
  return token ? t[token] : t.sinDatos;
}

/** El acento de texto y de borde: el teal calibrado del tema (nunca lima). */
export function acento(t: AppThemeTokens): string {
  return t.tealTexto;
}

/** Un relleno suave del color (para pildoras y bandas). Solo hex de 7 caracteres; si no, el color tal cual. */
export function suave(color: string, opacidad: number): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? withOpacity(color, opacidad) : color;
}

/** Alto minimo de cualquier cosa tocable (accesibilidad). */
export const TOQUE_MIN = 44;
