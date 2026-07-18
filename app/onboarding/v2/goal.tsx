/**
 * Onboarding v2 — Paso 3: Objetivo principal (5 opciones del spec:
 * longevidad / composición / energía / deporte / preparación).
 */
import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { OptionCard } from '@/src/components/onboarding/OptionCard';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { completeV2Step } from '@/src/services/onboarding-v2-service';
import { v2StepNumber, v2Route, V2_STEPS, GOAL_OPTIONS } from '@/src/services/onboarding-v2-core';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.goal;

export default function V2GoalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [goal, setGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!user?.id || !goal || loading) return;
    setLoading(true);
    try {
      await supabase.from('client_profiles').update({ primary_goal: goal }).eq('user_id', user.id);
      haptic.success();
      const next = await completeV2Step(user.id, 'goal');
      router.replace(next);
    } finally {
      setLoading(false);
    }
  }

  /** Skip con advertencia leve (T3): avanza sin guardar objetivo. */
  function handleSkip() {
    if (!user?.id || loading) return;
    const c = ONBOARDING_COPY.common;
    Alert.alert(c.skipTitle, c.skipBody, [
      { text: c.skipCancel, style: 'cancel' },
      {
        text: c.skipConfirm,
        onPress: async () => {
          setLoading(true);
          try {
            const next = await completeV2Step(user.id!, 'goal');
            router.replace(next);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <OnboardingShell
      step={v2StepNumber('goal')}
      totalSteps={V2_STEPS.length}
      onBack={() => router.replace(v2Route('profile'))}
      onSkip={handleSkip}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={s.title}>{COPY.title}</EliteText>
          <EliteText style={s.subtitle}>{COPY.subtitle}</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(400)} style={{ marginTop: Spacing.lg }}>
          {GOAL_OPTIONS.map(opt => (
            <OptionCard
              key={opt.id}
              text={opt.text}
              icon={opt.icon}
              selected={goal === opt.id}
              onPress={() => setGoal(opt.id)}
            />
          ))}
        </Animated.View>
      </ScrollView>

      <View style={s.bottomBar}>
        <AnimatedPressable
          style={[s.continueBtn, !goal && s.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!goal || loading}
        >
          <EliteText style={[s.continueBtnText, !goal && { opacity: 0.4 }]}>
            {loading ? ONBOARDING_COPY.common.saving : ONBOARDING_COPY.common.continue}
          </EliteText>
          {!loading && <Ionicons name="arrow-forward" size={18} color={goal ? '#000' : '#666'} />}
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
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnDisabled: { backgroundColor: '#1a1a1a' },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
