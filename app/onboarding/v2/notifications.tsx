/**
 * Onboarding v2 — Paso 7: Permiso de notificaciones (explicación clara ANTES
 * del prompt del sistema). Al terminar (con o sin permiso) el onboarding se
 * marca 'completed' → HOY; el tour de la orbe (OrbTour, carcasa de tabs)
 * arranca solo la primera vez.
 */
import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useAuth } from '@/src/contexts/auth-context';
import { registerForPushNotificationsAsync } from '@/src/services/push-notification-service';
import { completeV2Step } from '@/src/services/onboarding-v2-service';
import { v2StepNumber, v2Route, V2_STEPS } from '@/src/services/onboarding-v2-core';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.notifications;

// MB-25 P3: el enlace de salida del onboarding hacia la entrada de tres
// preguntas. El onboarding NO se rehace: terminar sigue marcando
// 'completed'; solo cambia a dónde sales.
const ARMAR_ROUTE: Href = '/packs/armar?origen=onboarding';

export default function V2NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const th = useOnboardingTheme();
  const [loading, setLoading] = useState(false);

  async function finish(withPrompt: boolean, destino?: Href) {
    if (!user?.id || loading) return;
    setLoading(true);
    try {
      if (withPrompt) {
        await registerForPushNotificationsAsync(user.id, { prompt: true });
      }
      haptic.success();
      const next = await completeV2Step(user.id, 'notifications');
      // T5 HARDENING: último paso completado → funnel core. notifications es el
      // paso final del flow v2 (completeV2Step marcó 'completed' y enruta a meet).
      analytics.track(ATP_EVENTS.ONBOARDING_COMPLETED, { notifications_enabled: withPrompt });
      // MB-25 P3: el enlace de "ármala por mí" sale hacia las tres preguntas;
      // ese flujo regresa a /argos/meet al terminar (el destino de siempre).
      router.replace(destino ?? next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell
      step={v2StepNumber('notifications')}
      totalSteps={V2_STEPS.length}
      onBack={() => router.replace(v2Route('consent'))}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <View style={s.bellWrap}>
            <Ionicons name="notifications-outline" size={36} color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
          </View>
          <EliteText style={[s.title, th.titulo]}>{COPY.title}</EliteText>
          <EliteText style={[s.subtitle, th.subTenue]}>{COPY.subtitle}</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(400)} style={{ marginTop: Spacing.lg, gap: 10 }}>
          {COPY.reasons.map(r => (
            <View key={r.title} style={[s.reasonCard, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
              <View style={s.reasonIcon}>
                <Ionicons name={r.icon as any} size={18} color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.reasonTitle, th.titulo]}>{r.title}</EliteText>
                <EliteText style={[s.reasonDesc, th.dark ? null : th.sub]}>{r.desc}</EliteText>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={s.bottomBar}>
        <AnimatedPressable style={s.continueBtn} onPress={() => finish(true)} disabled={loading}>
          <EliteText style={s.continueBtnText}>
            {loading ? ONBOARDING_COPY.common.oneMoment : COPY.cta}
          </EliteText>
        </AnimatedPressable>
        <AnimatedPressable style={s.skipBtn} onPress={() => finish(false)} disabled={loading}>
          <EliteText style={[s.skipText, th.subTenue]}>{COPY.skip}</EliteText>
        </AnimatedPressable>
        <AnimatedPressable
          style={s.armarBtn}
          onPress={() => finish(false, ARMAR_ROUTE)}
          disabled={loading}
        >
          {/* El lima como texto solo en oscuro (regla 1). */}
          <EliteText style={[s.armarText, th.acento != null && { color: th.acento }]}>{COPY.armarLink}</EliteText>
        </AnimatedPressable>
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  bellWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    alignItems: 'center', justifyContent: 'center', marginTop: 32,
  },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: 16 },
  subtitle: {
    fontSize: FontSizes.md, fontFamily: Fonts.regular,
    marginTop: 8, lineHeight: 21,
  },
  reasonCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md,
  },
  reasonIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: withOpacity(ATP_BRAND.lime, 0.08),
    alignItems: 'center', justifyContent: 'center',
  },
  reasonTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  reasonDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.47)', marginTop: 2 },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40, gap: 8 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  armarBtn: { alignItems: 'center', paddingVertical: 4 },
  armarText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: withOpacity(ATP_BRAND.lime, 0.85) },
});
