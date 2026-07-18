/**
 * Onboarding v2 — Paso 6: Consentimiento médico + disclaimers.
 * El usuario acepta explícitamente antes de recibir cualquier recomendación.
 * Persiste profiles.medical_consent_at (migración 153). Copy alineado con
 * Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md.
 */
import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useAuth } from '@/src/contexts/auth-context';
import { completeV2Step, saveMedicalConsent } from '@/src/services/onboarding-v2-service';
import { v2StepNumber, v2Route, V2_STEPS } from '@/src/services/onboarding-v2-core';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.consent;

export default function V2ConsentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!user?.id || !accepted || loading) return;
    setLoading(true);
    try {
      await saveMedicalConsent(user.id);
      haptic.success();
      const next = await completeV2Step(user.id, 'consent');
      router.replace(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell
      step={v2StepNumber('consent')}
      totalSteps={V2_STEPS.length}
      onBack={() => router.replace(v2Route('chronotype'))}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={s.title}>{COPY.title}</EliteText>
          <EliteText style={s.subtitle}>{COPY.subtitle}</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(400)} style={{ marginTop: Spacing.lg, gap: 10 }}>
          {COPY.points.map((p, i) => (
            <View key={i} style={s.pointCard}>
              <Ionicons name={p.icon as any} size={18} color="#fbbf24" style={{ marginTop: 2 }} />
              <EliteText style={s.pointText}>{p.text}</EliteText>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(400)}>
          <Pressable onPress={() => { haptic.light(); setAccepted(a => !a); }} style={s.checkRow}>
            <View style={[s.checkbox, accepted && s.checkboxOn]}>
              {accepted && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <EliteText style={s.checkText}>{COPY.checkbox}</EliteText>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <View style={s.bottomBar}>
        <AnimatedPressable
          style={[s.continueBtn, !accepted && s.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!accepted || loading}
        >
          <EliteText style={[s.continueBtnText, !accepted && { opacity: 0.4 }]}>
            {loading ? ONBOARDING_COPY.common.saving : COPY.cta}
          </EliteText>
          {!loading && <Ionicons name="arrow-forward" size={18} color={accepted ? '#000' : '#666'} />}
        </AnimatedPressable>
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: '#fff', marginTop: 24 },
  subtitle: {
    fontSize: FontSizes.md, fontFamily: Fonts.regular, color: '#666',
    marginTop: 8, lineHeight: 21,
  },
  pointCard: {
    flexDirection: 'row', gap: 12, backgroundColor: '#0a0a0a',
    borderWidth: 1, borderColor: '#1a1a1a', borderRadius: Radius.card, padding: Spacing.md,
  },
  pointText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#bbb', lineHeight: 19 },
  checkRow: { flexDirection: 'row', gap: 12, marginTop: Spacing.lg, alignItems: 'flex-start' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxOn: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  checkText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#ccc', lineHeight: 20 },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnDisabled: { backgroundColor: '#1a1a1a' },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
