/**
 * onboarding-theme (MB-31B) — fragmentos de tema compartidos por las
 * pantallas del onboarding v2 y voice-config.
 *
 * Las diez pantallas repetían el mismo vocabulario de hex neutros (#fff,
 * #888, #666, #444, #0a0a0a, #1a1a1a…). Aquí ese vocabulario se dice UNA
 * vez en tokens: el oscuro conserva los valores de siempre (vía tokens o
 * los grises canónicos del DS) y el claro llega solo. Las pantallas usan
 * useAppTheme (global) porque ellas mismas declaran su migración — el
 * <ThemeReady> lo abre OnboardingShell para el kit de adentro.
 */
import { useAppTheme } from '@/src/contexts/theme-context';
import { PILL } from '@/src/constants/brand';

export function useOnboardingTheme() {
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  return {
    dark,
    tokens,
    /** Título grande (era #fff). */
    titulo: { color: tokens.texto } as const,
    /** Subtítulo/cuerpo (era #888). */
    sub: { color: tokens.textoSecundario } as const,
    /** Texto apagado (era #666: el gris canónico de PILL). */
    subTenue: { color: dark ? PILL.textColor : tokens.textoSecundario } as const,
    /** Hint mínimo (era #444). */
    hint: { color: tokens.sinDatos } as const,
    /** Campo de captura (era #0a0a0a / #222 / #fff). */
    input: { backgroundColor: tokens.hundido, borderColor: tokens.borde, color: tokens.texto } as const,
    placeholder: tokens.sinDatos,
    /** CTA deshabilitado (era #1a1a1a = PILL.borderColor). */
    ctaDisabled: { backgroundColor: dark ? PILL.borderColor : tokens.hundido } as const,
    /** Flecha del CTA deshabilitado (era #666). */
    arrowOff: dark ? PILL.textColor : tokens.textoTenue,
    /** Acento de texto: lima solo en oscuro (regla 1 del manual 3.6). */
    acento: dark ? undefined : tokens.tealTexto,
  };
}
