/**
 * EmptyState — Estado vacío premium con ícono, texto y acción opcional.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SURFACES, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { Spacing, Fonts } from '@/constants/theme';

interface Props {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, color = TEXT_COLORS.muted }: Props) {
  return (
    <Animated.View entering={FadeInUp.springify()} style={styles.container}>
      <Ionicons name={icon as any} size={48} color={color} style={{ opacity: 0.5 }} />
      <EliteText style={[styles.title, { color: TEXT_COLORS.primary }]}>{title}</EliteText>
      <EliteText variant="caption" style={styles.subtitle}>{subtitle}</EliteText>
      {actionLabel && onAction && (
        <AnimatedPressable onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: withOpacity(color, 0.12) }]}>
          <EliteText style={[styles.actionText, { color }]}>{actionLabel}</EliteText>
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
    color: TEXT_COLORS.muted,
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
