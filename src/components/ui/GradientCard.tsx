/**
 * GradientCard — Card premium unificada.
 *
 * Dos modos:
 *   1. gradient={{ start, end }} + accentColor → gradiente estático
 *   2. color="#hex" + onPress → gradiente desde color, pressable con spring
 *
 * Uso:
 *   <GradientCard gradient={PILLAR_GRADIENTS.fitness}>...</GradientCard>
 *   <GradientCard color="#c084fc" onPress={() => {}}>...</GradientCard>
 */
import type { ReactNode } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { CARD } from '@/src/constants/brand';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GradientCardProps {
  children: ReactNode;
  /** Modo 1: gradiente explícito */
  gradient?: { start: string; end: string };
  accentColor?: string;
  accentPosition?: 'left' | 'top';
  /** Modo 2: color base (genera gradiente automático) */
  color?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}

export function GradientCard({
  children, gradient, accentColor, accentPosition = 'left',
  color, onPress, onLongPress, disabled,
  style, padding = 16,
}: GradientCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const accent: ViewStyle = accentColor
    ? accentPosition === 'top'
      ? { borderTopWidth: 3, borderTopColor: accentColor }
      : { borderLeftWidth: 3, borderLeftColor: accentColor }
    : {};

  // Resolver colores del gradiente
  let colors: [string, string, ...string[]];
  if (gradient) {
    colors = [gradient.start, gradient.end];
  } else if (color) {
    colors = [`${color}25`, `${color}0A`, 'transparent'];
  } else {
    // Fallback: fondo plano
    return (
      <View style={[styles.flat, accent, { padding }, style]}>
        {children}
      </View>
    );
  }

  const cardStyle = [
    styles.card,
    accent,
    color ? { borderWidth: 1, borderColor: `${color}28` } : undefined,
    { padding },
    style,
  ];

  // Si es pressable → animar
  if (onPress || onLongPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 300 }); }}
        style={[animStyle, disabled && { opacity: 0.4 }]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cardStyle}
        >
          {children}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyle}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  flat: {
    backgroundColor: CARD.bg,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
