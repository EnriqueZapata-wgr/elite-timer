/**
 * EmptyState — Estado vacío premium con ícono, texto y acción opcional.
 *
 * MB-31A: colores del scope. En claro el subtítulo usa secundario (el
 * tenue con 3.19 no llega a AA en este tamaño; en oscuro sigue el muted
 * de siempre).
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, Fonts } from '@/constants/theme';

interface Props {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, color }: Props) {
  const t = useSurfaceTokens();
  const iconColor = color ?? t.textoTenue;
  const subtitleColor = t.kind === 'dark' ? t.textoTenue : t.textoSecundario;
  return (
    <Animated.View entering={FadeInUp.springify()} style={styles.container}>
      <Ionicons name={icon as any} size={48} color={iconColor} style={{ opacity: 0.5 }} />
      <EliteText style={[styles.title, { color: t.texto }]}>{title}</EliteText>
      <EliteText variant="caption" style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</EliteText>
      {actionLabel && onAction && (
        <AnimatedPressable onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: withOpacity(iconColor, 0.12) }]}>
          <EliteText style={[styles.actionText, { color: iconColor }]}>{actionLabel}</EliteText>
        </AnimatedPressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
});
