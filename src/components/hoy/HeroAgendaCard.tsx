/**
 * HeroAgendaCard (#hoy-redesign, Parte 3) — card hero del próximo evento del día. Variante del
 * EditorialCard con countdown grande (lima) + 2 botones ("Ver mi agenda →" / "✓ Listo"). El
 * mensaje contextual llega ya resuelto (generateLocalRecommendation, gratis). Imagen B/N opcional
 * → placeholder de gradient sólido si falta.
 */
import { View, StyleSheet, Image, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';

export interface HeroAgendaCardProps {
  icon: string;
  title: string;
  timeLabel: string;          // "07:00"
  countdownLabel?: string;    // "EN 1H 22 MIN" (o "AHORA")
  message: string;            // mensaje local contextual
  gradient: [string, string] | [string, string, string];
  imageBn?: ImageSourcePropType;
  onTapAgenda: () => void;
  onComplete: () => void;
}

export function HeroAgendaCard({
  icon, title, timeLabel, countdownLabel, message, gradient, imageBn, onTapAgenda, onComplete,
}: HeroAgendaCardProps) {
  return (
    <View style={styles.card}>
      {imageBn ? (
        <Image source={imageBn} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: gradient[0], opacity: 0.25 }]} />
      )}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: imageBn ? 0.82 : 0.9 }]}
      />

      <View style={styles.content}>
        {countdownLabel ? <EliteText style={styles.countdown}>{countdownLabel}</EliteText> : null}
        <View style={styles.titleRow}>
          <EliteText style={styles.icon}>{icon}</EliteText>
          <EliteText style={styles.title} numberOfLines={1}>{title}</EliteText>
        </View>
        <EliteText style={styles.time}>{timeLabel}</EliteText>
        <EliteText style={styles.message} numberOfLines={3}>{message}</EliteText>

        <View style={styles.buttons}>
          <AnimatedPressable onPress={() => { haptic.light(); onTapAgenda(); }} style={styles.btnSecondary}>
            <EliteText style={styles.btnSecondaryText}>Ver mi agenda →</EliteText>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => { haptic.success(); onComplete(); }} style={styles.btnPrimary}>
            <EliteText style={styles.btnPrimaryText}>✓ Listo</EliteText>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', minHeight: 220, borderRadius: Radius.card, overflow: 'hidden', marginBottom: Spacing.md, backgroundColor: '#000' },
  content: { flex: 1, padding: Spacing.lg, justifyContent: 'flex-end', gap: 4, minHeight: 220 },
  countdown: { color: ATP_BRAND.lime, fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, letterSpacing: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  icon: { fontSize: 24 },
  title: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xl, letterSpacing: 1, flexShrink: 1 },
  time: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  message: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.sm, marginTop: 4, lineHeight: 18 },
  buttons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btnSecondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: ATP_BRAND.teal },
  btnSecondaryText: { color: ATP_BRAND.teal, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  btnPrimary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: 999, backgroundColor: ATP_BRAND.lime },
  btnPrimaryText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.sm },
});
