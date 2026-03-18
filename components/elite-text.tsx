import { Text, type TextProps, type TextStyle } from 'react-native';
import { Colors, Fonts, FontSizes } from '@/constants/theme';

/**
 * Variantes de texto predefinidas.
 * Cada una mapea a un tamaño de fuente, peso y color específico
 * para mantener consistencia visual en toda la app.
 */
const variants = {
  // Títulos de pantalla — grande, extra bold, verde neón
  title: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.extraBold,
    color: Colors.neonGreen,
    letterSpacing: 4,
  },
  // Subtítulos — mediano, bold, blanco
  subtitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  // Texto de cuerpo — tamaño base, regular, blanco
  body: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
  },
  // Labels, chips, texto pequeño — semi bold, blanco
  label: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },
  // Captions, badges — el más pequeño
  caption: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },
  // Números del timer — el más grande, extra bold, verde neón
  timer: {
    fontSize: FontSizes.timer,
    fontFamily: Fonts.extraBold,
    color: Colors.neonGreen,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    letterSpacing: 2,
  },
} as const satisfies Record<string, TextStyle>;

type Variant = keyof typeof variants;

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
  return <Text style={[variants[variant], style]} {...props} />;
}
