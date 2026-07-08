/**
 * RankBadge — tarjeta de rank con barra de progreso al siguiente. Bloom verde + tokens.
 * Usa rankProgress() (puro) para floor/ceil/progress del lifetime de electrones.
 * #100 v2: nombres de tier nuevos (Explorer→God) + comparación + reveal al subir.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { rankProgress } from '@/src/services/economy/rank';
import {
  tierComparisonLabel,
  tierFromLifetime,
  tierIndex,
  type RankTier,
} from '@/src/services/economy/rank-tiers';
import { formatFull } from '@/src/services/economy/format';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, PILLAR_GRADIENTS, TEXT, ELEVATION, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const TIER_SEEN_KEY = '@atp/rank_tier_seen';

interface Props {
  lifetimeElectrons: number;
  /** Etiqueta del rank (ej. "ATLETA"). Opcional. */
  rankLabel?: string;
}

export function RankBadge({ lifetimeElectrons, rankLabel }: Props) {
  const { rank, nextRank, floor, ceil, progress } = rankProgress(lifetimeElectrons);
  const pct = Math.round(progress * 100);
  const tier = tierFromLifetime(lifetimeElectrons);
  const label = rankLabel ?? `${tier.emoji} ${tier.name.toUpperCase()}`;
  const [reveal, setReveal] = useState<RankTier | null>(null);

  // #100: reveal al subir de tier (comparación contra el último visto)
  useEffect(() => {
    if (lifetimeElectrons <= 0) return; // aún cargando / usuario nuevo
    AsyncStorage.getItem(TIER_SEEN_KEY).then((seenKey) => {
      if (!seenKey) {
        AsyncStorage.setItem(TIER_SEEN_KEY, tier.key).catch(() => {});
        return; // primera vez: establece baseline sin celebrar
      }
      if (tierIndex(tier.key) > tierIndex(seenKey)) {
        haptic.success();
        setReveal(tier);
        AsyncStorage.setItem(TIER_SEEN_KEY, tier.key).catch(() => {});
      }
    }).catch(() => {});
  }, [tier.key, lifetimeElectrons, tier]);

  return (
    <GradientCard gradient={PILLAR_GRADIENTS.fitness} accentColor={ATP_BRAND.lime} accentPosition="top">
      <EliteText variant="caption" style={styles.label}>⚡ TU RANK</EliteText>
      <View style={styles.rankRow}>
        <EliteText style={styles.rankNum}>{rank}</EliteText>
        <EliteText style={styles.rankLabel}>{label}</EliteText>
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

      {/* #100: comparación de tier — "Eres Longevo · faltan 234 E- para Master" */}
      <EliteText variant="caption" style={styles.tierComparison}>
        {tierComparisonLabel(lifetimeElectrons)}
      </EliteText>

      {/* #100: reveal al subir de tier (fade + escala) */}
      <Modal visible={reveal !== null} transparent animationType="none" onRequestClose={() => setReveal(null)}>
        <Pressable style={styles.revealOverlay} onPress={() => setReveal(null)}>
          <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill} />
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.revealCard}>
            <EliteText style={styles.revealEmoji}>{reveal?.emoji}</EliteText>
            <EliteText style={styles.revealKicker}>NUEVO RANGO</EliteText>
            <EliteText style={styles.revealName}>{reveal?.name}</EliteText>
            <EliteText style={styles.revealHint}>
              {reveal?.key === 'god'
                ? 'Nadie más sabe que esto existe.'
                : reveal?.key === 'brian_johnson'
                  ? "Don't die. 🫀"
                  : 'Ganado electrón por electrón. Toca para seguir.'}
            </EliteText>
          </Animated.View>
        </Pressable>
      </Modal>
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
  tierComparison: {
    color: TEXT.secondary,
    fontSize: FontSizes.xs,
    marginTop: Spacing.sm,
    fontFamily: Fonts.semiBold,
  },
  revealOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  revealCard: {
    alignItems: 'center',
    backgroundColor: ELEVATION[2].bg,
    borderColor: withOpacity(ATP_BRAND.lime, 0.4),
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xs,
  },
  revealEmoji: { fontSize: 56 },
  revealKicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: TEXT.secondary,
    letterSpacing: 3,
    marginTop: Spacing.sm,
  },
  revealName: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.display,
    color: ATP_BRAND.lime,
  },
  revealHint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
