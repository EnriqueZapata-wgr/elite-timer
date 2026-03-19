import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { BlockBadge } from '@/components/block-badge';
import { Colors, Spacing } from '@/constants/theme';
import type { Block } from '@/types/models';

interface NextBlockPreviewProps {
  /** El bloque que viene después del actual (null si es el último) */
  block: Block | null;
}

/**
 * NextBlockPreview — Muestra info del siguiente bloque.
 * "SIGUIENTE: [Badge] Descanso · 00:15"
 */
export function NextBlockPreview({ block }: NextBlockPreviewProps) {
  if (!block) {
    return (
      <View style={styles.container}>
        <EliteText variant="caption" style={styles.label}>ÚLTIMO BLOQUE</EliteText>
      </View>
    );
  }

  const minutes = Math.floor(block.durationSeconds / 60);
  const seconds = block.durationSeconds % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <EliteText variant="caption" style={styles.label}>SIGUIENTE</EliteText>
      <View style={styles.row}>
        <BlockBadge type={block.type} size="sm" />
        <EliteText variant="body" style={styles.time}>{timeStr}</EliteText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  label: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  time: {
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
