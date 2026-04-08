/**
 * GradientCard — Card premium con gradiente sutil de color.
 *
 * Reemplaza AppCard cuando quieres dar identidad de pilar a una card
 * (gradient sutil del color del pilar -> negro). Si no se pasa gradient,
 * cae a un fondo plano CARD.bg.
 *
 * Uso:
 *   <GradientCard gradient={PILLAR_GRADIENTS.fitness}>...</GradientCard>
 *   <GradientCard accentColor="#a8e02a" accentPosition="left">...</GradientCard>
 */
import type { ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CARD } from '@/src/constants/brand';

interface GradientCardProps {
  children: ReactNode;
  gradient?: { start: string; end: string };
  accentColor?: string;
  accentPosition?: 'left' | 'top';
  style?: StyleProp<ViewStyle>;
  padding?: number;
}

export function GradientCard({
  children,
  gradient,
  accentColor,
  accentPosition = 'left',
  style,
  padding = 16,
}: GradientCardProps) {
  const accent: ViewStyle = accentColor
    ? accentPosition === 'top'
      ? { borderTopWidth: 3, borderTopColor: accentColor }
      : { borderLeftWidth: 3, borderLeftColor: accentColor }
    : {};

  if (gradient) {
    return (
      <LinearGradient
        colors={[gradient.start, gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, accent, { padding }, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.flat, accent, { padding }, style]}>
      {children}
    </View>
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
