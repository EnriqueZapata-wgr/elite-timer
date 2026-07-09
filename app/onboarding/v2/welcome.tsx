/**
 * Onboarding v2 — Paso 1: Bienvenida (nombre; la foto se agrega después en
 * Perfil — decisión de criterio: no meter picker/upload en el primer paso).
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { completeV2Step } from '@/src/services/onboarding-v2-service';
import { v2StepNumber, V2_STEPS } from '@/src/services/onboarding-v2-core';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.welcome;

export default function V2WelcomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill si ya había nombre (usuario que venía de v1 o reintenta)
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.full_name && !name) setName(data.full_name); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isValid = name.trim().length >= 2;

  async function handleContinue() {
    if (!user?.id || !isValid || loading) return;
    setLoading(true);
    try {
      await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user.id);
      haptic.success();
      const next = await completeV2Step(user.id, 'welcome');
      router.replace(next as any);
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell step={v2StepNumber('welcome')} totalSteps={V2_STEPS.length}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText style={s.kicker}>{COPY.kicker}</EliteText>
            <EliteText style={s.title}>{COPY.title}</EliteText>
            <EliteText style={s.subtitle}>{COPY.subtitle}</EliteText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <EliteText style={s.inputLabel}>{COPY.nameLabel}</EliteText>
            <TextInput
              style={s.input}
              placeholder={COPY.namePlaceholder}
              placeholderTextColor="#444"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              autoFocus
            />
            <EliteText style={s.hint}>{COPY.photoHint}</EliteText>
          </Animated.View>
        </ScrollView>

        <View style={s.bottomBar}>
          <AnimatedPressable
            style={[s.continueBtn, !isValid && s.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!isValid || loading}
          >
            <EliteText style={[s.continueBtnText, !isValid && { opacity: 0.4 }]}>
              {loading ? ONBOARDING_COPY.common.saving : COPY.cta}
            </EliteText>
            {!loading && <Ionicons name="arrow-forward" size={18} color={isValid ? '#000' : '#666'} />}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  kicker: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime,
    letterSpacing: 2, marginTop: 32,
  },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: '#fff', marginTop: 8, lineHeight: 36 },
  subtitle: {
    fontSize: FontSizes.md, fontFamily: Fonts.regular, color: '#888',
    marginTop: 12, lineHeight: 22,
  },
  inputLabel: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: '#888',
    letterSpacing: 2, marginTop: 40, marginBottom: 8,
  },
  input: {
    backgroundColor: '#0a0a0a', borderRadius: Radius.lg, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: FontSizes.md, fontFamily: Fonts.regular,
    color: '#fff', borderWidth: 0.5, borderColor: '#222',
  },
  hint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#444', marginTop: 8 },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnDisabled: { backgroundColor: '#1a1a1a' },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
