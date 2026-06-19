import { type ReactNode } from 'react';
import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EliteCardProps {
  /** Título principal */
  title: string;
  /** Texto secundario */
  subtitle?: string;
  /** Contenido a la derecha (ej: botón play) */
  rightContent?: ReactNode;
  /** Callback al presionar */
  onPress?: () => void;
  /** Estilos adicionales */
  style?: ViewStyle;
}

/**
 * EliteCard — Card genérica para listas (programas, rutinas, estándar).
 * Fondo surface, borde sutil, contenido izquierda + derecha opcional.
 */
export function EliteCard({ title, subtitle, rightContent, onPress, style }: EliteCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { if (onPress) scale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[animatedStyle, styles.card, style]}
    >
      <View style={styles.content}>
        <EliteText variant="subtitle" style={styles.title} numberOfLines={1}>
          {title}
        </EliteText>
        {subtitle && (
          <EliteText variant="caption" numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </EliteText>
        )}
      </View>
      {rightContent && <View style={styles.right}>{rightContent}</View>}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  right: {
    marginLeft: Spacing.md,
  },
});
