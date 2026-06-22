/**
 * RankBadge — tarjeta de rank con barra de progreso al siguiente. Bloom verde + tokens.
 * Usa rankProgress() (puro) para floor/ceil/progress del lifetime de electrones.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { rankProgress } from '@/src/services/economy/rank';
import { formatFull } from '@/src/services/economy/format';
import { ATP_BRAND, PILLAR_GRADIENTS, TEXT, ELEVATION } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';

interface Props {
  lifetimeElectrons: number;
  /** Etiqueta del rank (ej. "ATLETA"). Opcional. */
  rankLabel?: string;
}

export function RankBadge({ lifetimeElectrons, rankLabel }: Props) {
  const { rank, nextRank, floor, ceil, progress } = rankProgress(lifetimeElectrons);
  const pct = Math.round(progress * 100);

  return (
    <GradientCard gradient={PILLAR_GRADIENTS.fitness} accentColor={ATP_BRAND.lime} accentPosition="top">
      <EliteText variant="caption" style={styles.label}>⚡ TU RANK</EliteText>
      <View style={styles.rankRow}>
        <EliteText style={styles.rankNum}>{rank}</EliteText>
        {rankLabel ? <EliteText style={styles.rankLabel}>{rankLabel}</EliteText> : null}
      </View>

      {rank < 99 ? (
        <>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.barMeta}>
            <EliteText variant="caption" style={styles.metaText}>
              {formatFull(Math.max(0, lifetimeElectrons - floor))} / {formatFull(ceil - floor)} E- al rank {nextRank}
            </EliteText>
            <EliteText variant="caption" style={[styles.metaText, { color: ATP_BRAND.lime }]}>{pct}%</EliteText>
          </View>
        </>
      ) : (
        <EliteText variant="caption" style={[styles.metaText, { color: ATP_BRAND.lime }]}>Rank máximo alcanzado 🏆</EliteText>
      )}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  label: { color: TEXT.secondary, letterSpacing: 2, marginBottom: Spacing.xs },
  rankRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: Spacing.sm },
  rankNum: { fontSize: FontSizes.mega, fontFamily: Fonts.extraBold, color: ATP_BRAND.lime },
  rankLabel: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: TEXT.primary, letterSpacing: 1 },
  barTrack: {
    height: 12, borderRadius: 6, backgroundColor: ELEVATION[0].bg, overflow: 'hidden',
    borderWidth: 0.5, borderColor: ELEVATION[2].border,
  },
  barFill: { height: '100%', borderRadius: 6, backgroundColor: ATP_BRAND.lime },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  metaText: { color: TEXT.secondary, fontSize: FontSizes.xs },
});
