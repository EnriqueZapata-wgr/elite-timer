import { useMemo } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

/**
 * Variantes de texto predefinidas.
 * Cada una mapea a un tamaño de fuente, peso y color específico
 * para mantener consistencia visual en toda la app.
 *
 * MB-31A: los colores salen de los tokens del SCOPE (useSurfaceTokens):
 * en pantallas sin migrar siguen siendo los oscuros de siempre; dentro de
 * <ThemeReady> siguen el tema. Regla 1 del claro: el lima jamás es texto —
 * los roles que en oscuro son lima (title, timer) usan el teal calibrado.
 */
function buildVariants(t: AppThemeTokens) {
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  return {
    // Títulos de pantalla — grande, extra bold, acento
    title: {
      fontSize: FontSizes.xl,
      fontFamily: Fonts.extraBold,
      color: acento,
      letterSpacing: 4,
    },
    // Subtítulos — mediano, bold, texto principal
    subtitle: {
      fontSize: FontSizes.lg,
      fontFamily: Fonts.bold,
      color: t.texto,
    },
    // Texto de cuerpo — tamaño base, regular, texto principal
    body: {
      fontSize: FontSizes.md,
      fontFamily: Fonts.regular,
      color: t.texto,
    },
    // Labels, chips, texto pequeño — semi bold, secundario
    label: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.semiBold,
      color: t.textoSecundario,
    },
    // Captions, badges — el más pequeño
    caption: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.regular,
      color: t.textoSecundario,
    },
    // Números del timer — el más grande, extra bold, acento
    timer: {
      fontSize: FontSizes.timer,
      fontFamily: Fonts.extraBold,
      color: acento,
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
      letterSpacing: 2,
    },
  } as const satisfies Record<string, TextStyle>;
}

type Variant = keyof ReturnType<typeof buildVariants>;

interface EliteTextProps extends TextProps {
  /** Variante visual predefinida (default: 'body') */
  variant?: Variant;
}

/**
 * EliteText — Componente de texto con Poppins aplicado por defecto.
 *
 * Usa variantes para mantener tipografía consistente en toda la app.
 * El style prop permite sobreescribir cualquier propiedad si es necesario.
 *
 * Ejemplo:
 *   <EliteText variant="title">ELITE TIMER</EliteText>
 *   <EliteText variant="label" style={{ color: Colors.neonGreen }}>Activo</EliteText>
 */
export function EliteText({ variant = 'body', style, ...props }: EliteTextProps) {
  const tokens = useSurfaceTokens();
  const variants = useMemo(() => buildVariants(tokens), [tokens]);
  return <Text style={[variants[variant], style]} {...props} />;
}
