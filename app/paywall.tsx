/**
 * PAYWALL — editorial ATP (negro + lima).
 *
 * 2 planes (Base con 14 días trial · Pro sin trial, RECOMENDADO) con toggle
 * mensual/anual. Los precios vienen de RevenueCat offerings; si el binario
 * aún no trae el SDK nativo (pre-build) los CTAs quedan deshabilitados con
 * copy honesto — nunca placeholder roto.
 *
 * Disciplina de lima: CTA Pro + badge RECOMENDADO. Glow: solo card Pro.
 */
import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useSubscription } from '@/src/hooks/useSubscription';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, GLOW, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

type Period = 'monthly' | 'yearly';
type PlanKey = 'base' | 'pro';

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  base: [
    'Los 7 pilares completos: HOY, Fitness, Nutrición, Mente, Salud, Ciclo y Tests',
    'ARGOS, tu IA de rendimiento (límite mensual)',
    'Economía H+ · retos y recompensas',
    'Registro de nutrición, ayuno e hidratación',
  ],
  pro: [
    'Todo lo de ATP Base',
    'ARGOS proactivo y sin límites',
    'Análisis de comida por foto',
    'Protocolos y biomarcadores avanzados',
    'Acceso anticipado a nuevas funciones',
  ],
};

const LEGAL_LINKS = [
  { label: 'Privacidad', url: 'https://somosatp.com/privacidad' },
  { label: 'Términos', url: 'https://somosatp.com/terminos' },
  { label: 'Reembolsos', url: 'https://somosatp.com/reembolsos' },
];

export default function PaywallScreen() {
  const { offerings, purchase, restore, sdkReady, tier } = useSubscription();
  const [period, setPeriod] = useState<Period>('yearly');
  const [busy, setBusy] = useState<PlanKey | 'restore' | null>(null);

  const packages = useMemo(
    () => offerings?.current?.availablePackages ?? [],
    [offerings],
  );

  function findPackage(plan: PlanKey, p: Period): PurchasesPackage | null {
    const wantedType = p === 'monthly' ? 'MONTHLY' : 'ANNUAL';
    return (
      packages.find((pkg) => {
        const haystack = `${pkg.identifier} ${pkg.product.identifier}`.toLowerCase();
        return haystack.includes(plan) && pkg.packageType === wantedType;
      }) ?? null
    );
  }

  async function onSubscribe(plan: PlanKey) {
    const pkg = findPackage(plan, period);
    if (!pkg || busy) return;
    haptic.medium();
    setBusy(plan);
    const result = await purchase(pkg);
    setBusy(null);
    if (result.success) {
      haptic.success();
      Alert.alert(
        plan === 'pro' ? 'Bienvenido a ATP Pro' : 'Bienvenido a ATP Base',
        'Tu suscripción está activa. A romperla. 🚀',
        [{ text: 'Vamos', onPress: () => router.back() }],
      );
    } else if (result.error !== 'cancelled') {
      haptic.error();
      Alert.alert('Algo no salió', result.error ?? 'Intenta de nuevo en unos minutos.');
    }
  }

  async function onRestore() {
    if (busy) return;
    haptic.medium();
    setBusy('restore');
    const result = await restore();
    setBusy(null);
    if (result.success) {
      haptic.success();
      Alert.alert('Compras restauradas', 'Tu suscripción quedó sincronizada.');
    } else {
      Alert.alert('Restaurar compras', result.error ?? 'No encontramos compras en esta cuenta.');
    }
  }

  function renderPlanCard(plan: PlanKey, delay: number) {
    const pkg = findPackage(plan, period);
    const isPro = plan === 'pro';
    const priceLabel = pkg
      ? `${pkg.product.priceString} / ${period === 'monthly' ? 'mes' : 'año'}`
      : 'Disponible pronto';
    const ctaDisabled = !pkg || busy !== null;

    return (
      <Animated.View
        entering={FadeInDown.delay(delay).springify()}
        style={[styles.planCard, isPro && styles.planCardPro]}
      >
        {isPro && (
          <View style={styles.recommendedBadge}>
            <EliteText style={styles.recommendedText}>RECOMENDADO</EliteText>
          </View>
        )}
        <EliteText style={styles.planName}>{isPro ? 'ATP Pro' : 'ATP Base'}</EliteText>
        <EliteText style={[styles.planPrice, isPro && { color: ATP_BRAND.lime }]}>
          {priceLabel}
        </EliteText>
        <EliteText style={styles.trialNote}>
          {isPro ? 'Sin trial · empieza ya' : '14 días de prueba gratis'}
        </EliteText>

        <View style={styles.featureList}>
          {PLAN_FEATURES[plan].map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={isPro ? ATP_BRAND.lime : TEXT.secondary}
                style={{ marginTop: 2 }}
              />
              <EliteText style={styles.featureText}>{feature}</EliteText>
            </View>
          ))}
        </View>

        <AnimatedPressable
          onPress={() => onSubscribe(plan)}
          disabled={ctaDisabled}
          style={[styles.cta, isPro ? styles.ctaPro : styles.ctaBase]}
        >
          <EliteText style={[styles.ctaText, isPro ? styles.ctaTextPro : styles.ctaTextBase]}>
            {busy === plan ? 'Procesando…' : pkg ? 'Suscribirme' : 'Muy pronto'}
          </EliteText>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Suscripción" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <EliteText style={styles.heroTitle}>Desbloquea tu potencial</EliteText>
          <EliteText style={styles.heroSubtitle}>
            Un solo sistema para tu rendimiento: cuerpo, mente y datos trabajando juntos.
          </EliteText>
        </Animated.View>

        {/* Toggle mensual / anual */}
        <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.toggleRow}>
          {(['monthly', 'yearly'] as Period[]).map((p) => {
            const active = period === p;
            return (
              <AnimatedPressable
                key={p}
                onPress={() => { haptic.light(); setPeriod(p); }}
                style={[styles.toggleOption, active && styles.toggleOptionActive]}
              >
                <EliteText style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {p === 'monthly' ? 'Mensual' : 'Anual'}
                </EliteText>
                {p === 'yearly' && (
                  <View style={styles.savingsBadge}>
                    <EliteText style={styles.savingsText}>AHORRAS 33%</EliteText>
                  </View>
                )}
              </AnimatedPressable>
            );
          })}
        </Animated.View>

        {renderPlanCard('pro', 140)}
        {renderPlanCard('base', 190)}

        {!sdkReady && (
          <EliteText style={styles.sdkNote}>
            Las compras se habilitan con la próxima actualización de la app.
          </EliteText>
        )}
        {tier !== 'free' && (
          <EliteText style={styles.sdkNote}>
            Ya tienes un plan activo ({tier}). Puedes gestionarlo en Ajustes → Suscripción.
          </EliteText>
        )}

        <AnimatedPressable onPress={onRestore} disabled={busy !== null} style={styles.restoreBtn}>
          <EliteText style={styles.restoreText}>
            {busy === 'restore' ? 'Restaurando…' : '¿Ya eres suscriptor? Restaurar compras'}
          </EliteText>
        </AnimatedPressable>

        <View style={styles.legalRow}>
          {LEGAL_LINKS.map((link, i) => (
            <View key={link.label} style={styles.legalItem}>
              {i > 0 && <EliteText style={styles.legalDot}>·</EliteText>}
              <AnimatedPressable onPress={() => Linking.openURL(link.url)}>
                <EliteText style={styles.legalText}>{link.label}</EliteText>
              </AnimatedPressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 80, gap: Spacing.md },
  heroTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.hero,
    color: TEXT.primary,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: TEXT.secondary,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.pill,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  toggleOptionActive: { backgroundColor: ELEVATION[3].bg },
  toggleText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.secondary },
  toggleTextActive: { color: TEXT.primary },
  savingsBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingsText: { fontFamily: Fonts.bold, fontSize: 9, color: ATP_BRAND.lime, letterSpacing: 0.5 },
  planCard: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  planCardPro: {
    borderColor: withOpacity(ATP_BRAND.lime, 0.5),
    borderWidth: 1,
    ...GLOW.accent,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: Spacing.sm,
  },
  recommendedText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#000',
    letterSpacing: 1,
  },
  planName: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, color: TEXT.primary },
  planPrice: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: TEXT.primary,
    marginTop: Spacing.xs,
  },
  trialNote: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
  featureList: { marginTop: Spacing.md, gap: Spacing.sm },
  featureRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  featureText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  cta: {
    marginTop: Spacing.lg,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaPro: { backgroundColor: ATP_BRAND.lime },
  ctaBase: { borderWidth: 1, borderColor: ATP_BRAND.lime },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },
  ctaTextPro: { color: '#000' },
  ctaTextBase: { color: ATP_BRAND.lime },
  sdkNote: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  restoreBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  restoreText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.secondary },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legalItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legalDot: { color: TEXT.muted },
  legalText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary },
});
