/**
 * Onboarding v2 — Paso 7: Permiso de notificaciones (explicación clara ANTES
 * del prompt del sistema). Al terminar (con o sin permiso) el onboarding se
 * marca 'completed' → HOY, donde AppTour arranca solo la primera vez.
 */
import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
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
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.notifications;

export default function V2NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [loading, setLoading] = useState(false);

  async function finish(withPrompt: boolean) {
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
      router.replace(next);
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
            <Ionicons name="notifications-outline" size={36} color={ATP_BRAND.lime} />
          </View>
          <EliteText style={s.title}>{COPY.title}</EliteText>
          <EliteText style={s.subtitle}>{COPY.subtitle}</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(400)} style={{ marginTop: Spacing.lg, gap: 10 }}>
          {COPY.reasons.map(r => (
            <View key={r.title} style={s.reasonCard}>
              <View style={s.reasonIcon}>
                <Ionicons name={r.icon as any} size={18} color={ATP_BRAND.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.reasonTitle}>{r.title}</EliteText>
                <EliteText style={s.reasonDesc}>{r.desc}</EliteText>
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
          <EliteText style={s.skipText}>{COPY.skip}</EliteText>
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
  title: { fontSize: 28, fontFamily: Fonts.bold, color: '#fff', marginTop: 16 },
  subtitle: {
    fontSize: FontSizes.md, fontFamily: Fonts.regular, color: '#666',
    marginTop: 8, lineHeight: 21,
  },
  reasonCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1a1a1a',
    borderRadius: Radius.card, padding: Spacing.md,
  },
  reasonIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: withOpacity(ATP_BRAND.lime, 0.08),
    alignItems: 'center', justifyContent: 'center',
  },
  reasonTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#fff' },
  reasonDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#777', marginTop: 2 },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40, gap: 8 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#666' },
});
