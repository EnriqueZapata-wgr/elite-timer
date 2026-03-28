/**
 * StatsBar — Bento grid de estadísticas: TOTAL | TRABAJO | DESCANSO.
 *
 * Cada card tiene borde izquierdo de color y fondo oscuro premium.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import type { RoutineCalcStats } from '@/src/engine/helpers';

interface StatsBarProps {
  stats: RoutineCalcStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <View style={styles.row}>
      <StatCard label="TOTAL" value={stats.formattedTotal} accentColor={Colors.textSecondary} />
      <StatCard label="TRABAJO" value={stats.formattedWork} accentColor={Colors.neonGreen} />
      <StatCard label="DESCANSO" value={stats.formattedRest} accentColor={Colors.info} />
    </View>
  );
}

function StatCard({ label, value, accentColor }: {
  label: string; value: string; accentColor: string;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      <EliteText variant="caption" style={styles.label}>{label}</EliteText>
      <EliteText variant="body" style={[styles.value, { color: accentColor === Colors.textSecondary ? Colors.textPrimary : accentColor }]}>
        {value}
      </EliteText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    paddingLeft: Spacing.sm + 6,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.sm,
    borderBottomLeftRadius: Radius.sm,
  },
  label: {
    letterSpacing: 2,
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  value: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
