import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { BlockColors, BlockTypeLabels, Radius, Spacing } from '@/constants/theme';
import type { BlockType } from '@/types/models';

interface BlockBadgeProps {
  /** Tipo de bloque */
  type: BlockType;
  /** Tamaño del badge */
  size?: 'sm' | 'md';
}

/**
 * BlockBadge — Chip de color que indica el tipo de bloque.
 * Ejercicio = verde, Descanso = azul, Transición = naranja, Final = rojo.
 */
export function BlockBadge({ type, size = 'sm' }: BlockBadgeProps) {
  const color = BlockColors[type];
  const label = BlockTypeLabels[type] ?? type;
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color },
      isSmall ? styles.small : styles.medium]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <EliteText
        variant="caption"
        style={[styles.label, { color }, !isSmall && styles.mediumLabel]}
      >
        {label}
      </EliteText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  small: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  mediumLabel: {
    fontSize: 12,
  },
});
