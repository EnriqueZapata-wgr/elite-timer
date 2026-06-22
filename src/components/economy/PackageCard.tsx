/**
 * PackageCard — paquete H+ estilo Clash Royale. Gradient por tier (gold/silver/bronze),
 * ProtonOrb, bonus badge, precio, botón COMPRAR. Tap → spring + haptic (lo maneja el padre).
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { ProtonOrb } from './ProtonOrb';
import { formatFull } from '@/src/services/economy/format';
import type { ProtonPackage } from '@/src/services/economy/shop-service';
import { TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

/** Color de tier por orden de display (1 chico → 3 grande). */
const TIER = {
  1: { accent: '#cd7f32', grad: { start: 'rgba(205,127,50,0.22)', end: 'rgba(10,10,10,0.95)' } },   // bronce
  2: { accent: '#c0c0c0', grad: { start: 'rgba(192,192,192,0.20)', end: 'rgba(10,10,10,0.95)' } },   // plata
  3: { accent: '#ffd700', grad: { start: 'rgba(255,215,0,0.22)', end: 'rgba(10,10,10,0.95)' } },      // oro
} as const;

interface Props {
  pkg: ProtonPackage;
  popular?: boolean;
  onBuy: () => void;
}

export function PackageCard({ pkg, popular, onBuy }: Props) {
  const tier = TIER[(pkg.display_order as 1 | 2 | 3)] ?? TIER[1];
  return (
    <GradientCard gradient={tier.grad} accentColor={tier.accent} accentPosition="top" onPress={onBuy}>
      {popular ? (
        <View style={[styles.ribbon, { backgroundColor: tier.accent }]}>
          <EliteText style={styles.ribbonText}>MÁS POPULAR</EliteText>
        </View>
      ) : null}
      <View style={styles.header}>
        <ProtonOrb size={44} color={tier.accent} />
        <View style={{ flex: 1 }}>
          <EliteText style={styles.name}>{pkg.name}</EliteText>
          <EliteText style={[styles.protons, { color: tier.accent }]}>{formatFull(pkg.protons)} H+</EliteText>
        </View>
      </View>
      {pkg.bonus_percent > 0 ? (
        <View style={[styles.bonus, { borderColor: tier.accent }]}>
          <EliteText style={[styles.bonusText, { color: tier.accent }]}>+{pkg.bonus_percent}% BONUS</EliteText>
        </View>
      ) : null}
      <View style={[styles.buy, { backgroundColor: tier.accent }]}>
        <EliteText style={styles.buyText}>COMPRAR · ${formatFull(pkg.price_mxn)} MXN</EliteText>
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  ribbon: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: Spacing.sm },
  ribbonText: { fontSize: 9, fontFamily: Fonts.extraBold, color: '#000', letterSpacing: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  protons: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, marginTop: 2 },
  bonus: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginTop: Spacing.sm },
  bonusText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1 },
  buy: { marginTop: Spacing.md, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  buyText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 0.5 },
});
