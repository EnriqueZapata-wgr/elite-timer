/**
 * BalanceCard — H+ disponibles (número grande) + ProtonOrb + CTA a la tienda.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ProtonOrb } from './ProtonOrb';
import { formatFull } from '@/src/services/economy/format';
import { ATP_BRAND, TEXT, ELEVATION } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

interface Props {
  protons: number;
  onPressShop?: () => void;
}

export function BalanceCard({ protons, onPressShop }: Props) {
  return (
    <GradientCard color={ATP_BRAND.lime}>
      <View style={styles.header}>
        <ProtonOrb size={48} />
        <EliteText variant="caption" style={styles.label}>H+ DISPONIBLES</EliteText>
      </View>
      <EliteText style={styles.amount}>{formatFull(protons)}</EliteText>
      {onPressShop ? (
        <AnimatedPressable onPress={onPressShop} style={styles.cta}>
          <EliteText style={styles.ctaText}>Ir a la Tienda →</EliteText>
        </AnimatedPressable>
      ) : null}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.xs },
  label: { color: TEXT.secondary, letterSpacing: 2 },
  amount: { fontSize: FontSizes.mega, fontFamily: Fonts.extraBold, color: TEXT.primary, marginVertical: Spacing.xs },
  cta: {
    marginTop: Spacing.sm, backgroundColor: ELEVATION[0].bg, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', borderWidth: 0.5, borderColor: ATP_BRAND.lime,
  },
  ctaText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.md },
});
