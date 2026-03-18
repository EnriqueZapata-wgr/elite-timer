import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

/**
 * Variantes visuales del botón:
 * - primary:  fondo verde neón, texto negro — acción principal
 * - outline:  sin fondo, borde verde — acción secundaria
 * - ghost:    sin fondo ni borde — acción terciaria, links
 */
type ButtonVariant = 'primary' | 'outline' | 'ghost';

interface EliteButtonProps {
  /** Texto del botón */
  label: string;
  /** Callback al presionar */
  onPress: () => void;
  /** Variante visual (default: 'primary') */
  variant?: ButtonVariant;
  /** Deshabilita el botón */
  disabled?: boolean;
  /** Estilos adicionales para el contenedor */
  style?: ViewStyle;
}

/**
 * EliteButton — Botón pill con estilo ELITE.
 *
 * Tres variantes para jerarquía visual clara:
 *   <EliteButton label="START" onPress={start} />
 *   <EliteButton label="RESET" onPress={reset} variant="outline" />
 *   <EliteButton label="Saltar" onPress={skip} variant="ghost" />
 */
export function EliteButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: EliteButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.textBase, textVariantStyles[variant]]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Forma base compartida por todas las variantes
  base: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    paddingHorizontal: 64,
    minWidth: 220,
    alignItems: 'center',
  },
  // Texto base compartido
  textBase: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.extraBold,
    letterSpacing: 3,
  },
  // Opacidad reducida cuando está deshabilitado
  disabled: {
    opacity: 0.3,
  },
  // Feedback táctil al presionar
  pressed: {
    opacity: 0.7,
  },
});

// Estilos específicos del contenedor por variante
const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.neonGreen,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.neonGreen,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});

// Estilos específicos del texto por variante
const textVariantStyles = StyleSheet.create({
  primary: {
    color: Colors.textOnGreen,
  },
  outline: {
    color: Colors.neonGreen,
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
  },
  ghost: {
    color: Colors.neonGreen,
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
  },
});
