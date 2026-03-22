/**
 * StatsBar — Barra compacta de estadísticas de rutina.
 *
 * Muestra tiempo total, trabajo/descanso, steps y ratio.
 * Se recalcula cada vez que cambia la rutina.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import type { RoutineCalcStats } from '@/src/engine/helpers';

interface StatsBarProps {
  stats: RoutineCalcStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const workPercent = Math.round(stats.workRatio * 100);
  const restPercent = Math.round(stats.restRatio * 100);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.stat}>
          <EliteText variant="caption" style={styles.label}>TOTAL</EliteText>
          <EliteText variant="body" style={styles.value}>{stats.formattedTotal}</EliteText>
        </View>
        <View style={styles.stat}>
          <EliteText variant="caption" style={styles.label}>TRABAJO</EliteText>
          <EliteText variant="body" style={[styles.value, { color: '#a8e02a' }]}>
            {stats.formattedWork}
          </EliteText>
        </View>
        <View style={styles.stat}>
          <EliteText variant="caption" style={styles.label}>DESCANSO</EliteText>
          <EliteText variant="body" style={[styles.value, { color: '#5B9BD5' }]}>
            {stats.formattedRest}
          </EliteText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    minWidth: 70,
  },
  label: {
    letterSpacing: 1,
    fontSize: 9,
    color: Colors.textSecondary,
  },
  value: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  ratio: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
