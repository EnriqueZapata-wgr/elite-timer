/**
 * Onboarding v2 — Paso 5: Cronotipo rápido (5 preguntas, scoring portado
 * del quiz v1). Guarda lion/bear/wolf/dolphin + horarios en user_chronotype
 * y muestra un mini-insight antes de continuar.
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
import { completeV2Step, saveChronotype } from '@/src/services/onboarding-v2-service';
import {
  v2StepNumber, v2Route, V2_STEPS,
  CHRONO_QUESTIONS, computeChronotype, CHRONO_META, CHRONO_SCHEDULES,
  type Chronotype,
} from '@/src/services/onboarding-v2-core';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.chronotype;

const PURPLE = '#7c3aed';

export default function V2ChronotypeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Chronotype | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const question = CHRONO_QUESTIONS[currentQ];
  const isLast = currentQ === CHRONO_QUESTIONS.length - 1;

  function handleSelect(optionId: string) {
    const updated = { ...answers, [question.id]: optionId };
    setAnswers(updated);
    setTimeout(async () => {
      if (isLast) {
        const chrono = computeChronotype(updated);
        setResult(chrono);
        if (user?.id) await saveChronotype(user.id, chrono);
        haptic.success();
      } else {
        setCurrentQ(prev => prev + 1);
        setAnimKey(prev => prev + 1);
      }
    }, 250);
  }

  function handleBack() {
    if (result) { setResult(null); return; }
    if (currentQ > 0) {
      setCurrentQ(prev => prev - 1);
      setAnimKey(prev => prev + 1);
    } else {
      router.replace(v2Route('cycle') as any);
    }
  }

  async function handleContinue() {
    if (!user?.id || loading) return;
    setLoading(true);
    try {
      const next = await completeV2Step(user.id, 'chronotype');
      router.replace(next as any);
    } finally {
      setLoading(false);
    }
  }

  /** Skip con advertencia leve (T3): el quiz completo vive en /quiz/chronotype. */
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
            const next = await completeV2Step(user.id!, 'chronotype');
            router.replace(next as any);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  // ── Insight ──
  if (result) {
    const meta = CHRONO_META[result];
    const schedule = CHRONO_SCHEDULES[result];
    return (
      <OnboardingShell step={v2StepNumber('chronotype')} totalSteps={V2_STEPS.length} onBack={handleBack}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Animated.View entering={FadeInUp.duration(400)} style={s.insightCard}>
            <EliteText style={{ fontSize: 56, textAlign: 'center' }}>{meta.emoji}</EliteText>
            <EliteText style={s.insightKicker}>{COPY.resultKicker}</EliteText>
            <EliteText style={s.insightTitle}>{COPY.resultTitlePrefix} {meta.name}</EliteText>
            <EliteText style={s.insightBlurb}>{meta.blurb}</EliteText>
            <View style={s.scheduleBox}>
              {[
                { icon: 'sunny-outline', label: COPY.scheduleWake, time: schedule.wake },
                { icon: 'flash-outline', label: COPY.schedulePhysical, time: schedule.peak_physical },
                { icon: 'bulb-outline', label: COPY.scheduleFocus, time: `${schedule.peak_focus_start}–${schedule.peak_focus_end}` },
                { icon: 'bed-outline', label: COPY.scheduleSleep, time: schedule.sleep },
              ].map(row => (
                <View key={row.label} style={s.scheduleRow}>
                  <Ionicons name={row.icon as any} size={16} color={PURPLE} />
                  <EliteText style={s.scheduleLabel}>{row.label}</EliteText>
                  <EliteText style={s.scheduleTime}>{row.time}</EliteText>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
        <View style={s.bottomBar}>
          <AnimatedPressable style={s.continueBtn} onPress={handleContinue} disabled={loading}>
            <EliteText style={s.continueBtnText}>{loading ? ONBOARDING_COPY.common.saving : ONBOARDING_COPY.common.continue}</EliteText>
            {!loading && <Ionicons name="arrow-forward" size={18} color="#000" />}
          </AnimatedPressable>
        </View>
      </OnboardingShell>
    );
  }

  // ── Preguntas ──
  return (
    <OnboardingShell step={v2StepNumber('chronotype')} totalSteps={V2_STEPS.length} onBack={handleBack} onSkip={handleSkip}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Animated.View key={animKey} entering={FadeInUp.duration(300)}>
          <EliteText style={s.counter}>
            {COPY.counterKicker} · {currentQ + 1} DE {CHRONO_QUESTIONS.length}
          </EliteText>
          <EliteText style={s.title}>{question.text}</EliteText>
          <View style={{ marginTop: Spacing.lg }}>
            {question.options.map(opt => (
              <OptionCard
                key={opt.id}
                text={opt.text}
                selected={answers[question.id] === opt.id}
                onPress={() => handleSelect(opt.id)}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  counter: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: '#888',
    letterSpacing: 2, marginTop: 24,
  },
  title: { fontSize: 24, fontFamily: Fonts.bold, color: '#fff', marginTop: 8, lineHeight: 32 },
  insightCard: {
    backgroundColor: withOpacity(PURPLE, 0.06), borderRadius: 20, padding: Spacing.lg,
    borderWidth: 1, borderColor: withOpacity(PURPLE, 0.2), marginTop: 32,
  },
  insightKicker: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: PURPLE,
    letterSpacing: 2, textAlign: 'center', marginTop: 12,
  },
  insightTitle: { fontSize: 26, fontFamily: Fonts.bold, color: '#fff', textAlign: 'center', marginTop: 4 },
  insightBlurb: {
    fontSize: FontSizes.md, fontFamily: Fonts.regular, color: '#aaa',
    textAlign: 'center', marginTop: 8, lineHeight: 21,
  },
  scheduleBox: { marginTop: Spacing.lg, gap: 10 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleLabel: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#888' },
  scheduleTime: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#fff' },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
