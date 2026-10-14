/**
 * useTintaMarca (14-oct-2026) — de qué color va cada cosa en las pantallas
 * nuevas, en una sola regla.
 *
 * POR QUÉ EXISTE
 * Enrique vio "todo en Lima Brutalist" en Mi plan. La revisión de marca
 * (cuatro ojos) encontró siete copias locales de `useTinta` con la versión
 * vieja (borde lima, chip de ícono lima, ceja lima) y tres colores distintos
 * de micro-acento según la pestaña. La marca dice (docs/DESIGN_SYSTEM.md
 * 122-131; docs/MANUAL_DE_MARCA.md 79-90; brand.ts ACCENT_ROLES):
 *   · el LIMA es solo para la acción principal, el dato heroico (uno por
 *     pantalla) y el estado "hecho"; 1 o 2 por pantalla;
 *   · lo demás va en gris o en teal; los bordes son neutros.
 *
 * Uso: `acento` es el micro-acento (ceja, punto de "Hoy", enlaces
 * destacados): teal en los dos temas. `lima` solo para CTA, cifra heroica,
 * palomita de hecho y la barra del programa en el héroe.
 */
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export function useTintaMarca() {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  return {
    t,
    dark,
    /** Micro-acento: teal legible en los dos temas. */
    acento: t.tealTexto,
    /** Íconos de función: teal sobre t.hundido. */
    teal: t.tealTexto,
    /** Solo CTA, cifra heroica, "hecho" y barra del héroe. En claro el lima nunca es letra. */
    lima: dark ? ATP_BRAND.lime : t.tealTexto,
    /** Borde de tarjeta: casi invisible en oscuro, editorial en claro. Nunca lima. */
    borde: dark ? t.borde : t.bordeEditorial,
  };
}
