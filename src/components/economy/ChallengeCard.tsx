/**
 * ChallengeCard — reto estilo Clash Royale: entrada, premio, multiplier, CTA.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { formatFull } from '@/src/services/economy/format';
import type { Challenge } from '@/src/services/economy/economy-types';
import { PILLAR_GRADIENTS, ATP_BRAND, TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

const CAT_GRAD: Record<string, { start: string; end: string }> = {
  habits: PILLAR_GRADIENTS.activity, fitness: PILLAR_GRADIENTS.fitness,
  mind: PILLAR_GRADIENTS.mind, labs: PILLAR_GRADIENTS.health, community: PILLAR_GRADIENTS.nutrition,
};

interface Props {
  challenge: Challenge;
  cta?: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function ChallengeCard({ challenge, cta, onPress, disabled }: Props) {
  return (
    <GradientCard gradient={CAT_GRAD[challenge.category] ?? PILLAR_GRADIENTS.fitness} accentColor={ATP_BRAND.lime}>
      <EliteText style={styles.name}>{challenge.name}</EliteText>
      <EliteText variant="caption" style={styles.desc}>{challenge.description}</EliteText>
      <View style={styles.rows}>
        <Row icon="diamond-outline" text={`Entrada: ${formatFull(challenge.entry_cost_protons)} H+`} />
        <Row icon="trophy-outline" text={`Premio: ${formatFull(challenge.prize_protons)} H+`} color={ATP_BRAND.lime} />
        {challenge.electron_multiplier > 1 ? (
          <Row icon="flash" text={`E- valen ×${challenge.electron_multiplier} durante el reto`} color="#fbbf24" />
        ) : null}
      </View>
      {cta ? (
        <AnimatedPressable onPress={onPress} disabled={disabled} style={[styles.cta, disabled && { opacity: 0.4 }]}>
          <EliteText style={styles.ctaText}>{cta}</EliteText>
        </AnimatedPressable>
      ) : null}
    </GradientCard>
  );
}

function Row({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={14} color={color ?? TEXT.secondary} />
      <EliteText variant="caption" style={[styles.rowText, color ? { color } : null]}>{text}</EliteText>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: TEXT.primary },
  desc: { color: TEXT.secondary, marginTop: 2 },
  rows: { gap: 4, marginTop: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowText: { color: TEXT.secondary },
  cta: { marginTop: Spacing.md, backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1 },
});
