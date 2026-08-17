import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { ATP_BRAND } from '@/src/constants/brand';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const t = useSurfaceTokens();

  /**
   * BLOQ-3: el lima como RELLENO es identidad y no se mueve — `textoSobreLima`
   * es negro en los dos temas, así que `primary` rinde igual en claro y oscuro.
   * Lo que sí se calibra es el lima como LETRA y como borde de contorno: sobre
   * acero claro tiene 1.34 de contraste y se lee como deshabilitado. Esa es la
   * regla 1 del manual 3.6, y ya estaba mal en el único consumidor no-auth vivo
   * (AssignRoutineModal, que pinta sobre `t.card`).
   */
  const acento = t.kind === 'light' ? t.tealTexto : ATP_BRAND.lime;

  const contenedorPorVariante: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: ATP_BRAND.lime },
    outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: acento },
    ghost: { backgroundColor: 'transparent' },
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { if (!disabled) scale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[
        animatedStyle,
        styles.base,
        contenedorPorVariante[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.textBase,
          textVariantStyles[variant],
          { color: variant === 'primary' ? t.textoSobreLima : acento },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
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
});

// Estilos específicos del texto por variante (el COLOR viaja inline: depende
// del scope de tema, ver `acento` arriba).
const textVariantStyles = StyleSheet.create({
  primary: {},
  outline: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
  },
  ghost: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
  },
});
