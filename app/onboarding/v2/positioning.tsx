/**
 * Onboarding v2 — Paso 2: Posicionamiento (Sprint Compliance 4).
 *
 * Versión PRECISA del posicionamiento (POSICIONAMIENTO_MASTER §2, citada en
 * BRIEF_DEV_POSICIONAMIENTO): ATP optimiza sanos, no trata enfermos. Va ANTES
 * del muro de consentimiento — el usuario entiende qué es ATP (y qué NO es)
 * antes de otorgar nada. El texto central es copy legal: NO parafrasear.
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
import { completeV2Step } from '@/src/services/onboarding-v2-service';
import { v2StepNumber, v2Route, V2_STEPS } from '@/src/services/onboarding-v2-core';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, withOpacity } from '@/src/constants/brand';

/** §2 versión precisa — copy legal, no editar sin actualizar el master. */
const POSITIONING_STATEMENT =
  'ATP no es medicina para enfermos. Es una herramienta para entender y optimizar tu cuerpo, y llegar mejor preparado a tu médico. No diagnostica ni trata enfermedades. Si tienes una condición de salud, ATP trabaja junto a tu médico, no en su lugar.';

const PILLARS = [
  { icon: 'trending-up-outline' as const, text: 'Optimiza: energía, hábitos, rendimiento y longevidad.' },
  { icon: 'school-outline' as const, text: 'Educa: entiende tu cuerpo con estimaciones educativas, no diagnósticos.' },
  { icon: 'people-outline' as const, text: 'Acompaña: llegas a tu médico con mejores datos, nunca lo sustituye.' },
];

export default function V2PositioningScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!user?.id || loading) return;
    setLoading(true);
    try {
      haptic.success();
      const next = await completeV2Step(user.id, 'positioning');
      router.replace(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell
      step={v2StepNumber('positioning')}
      totalSteps={V2_STEPS.length}
      onBack={() => router.replace(v2Route('welcome'))}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={s.kicker}>ANTES DE EMPEZAR</EliteText>
          <EliteText style={s.title}>Qué es ATP{'\n'}(y qué no es)</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(400)} style={s.statementCard}>
          <EliteText style={s.statement}>{POSITIONING_STATEMENT}</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(400)} style={{ gap: 10, marginTop: Spacing.lg }}>
          {PILLARS.map((p, i) => (
            <View key={i} style={s.pillarRow}>
              <View style={s.pillarIcon}>
                <Ionicons name={p.icon} size={18} color={ATP_BRAND.teal} />
              </View>
              <EliteText style={s.pillarText}>{p.text}</EliteText>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={s.bottomBar}>
        <AnimatedPressable
          style={s.continueBtn}
          onPress={handleContinue}
          disabled={loading}
        >
          <EliteText style={s.continueBtnText}>
            {loading ? 'Un momento…' : 'ENTENDIDO, VAMOS'}
          </EliteText>
          {!loading && <Ionicons name="arrow-forward" size={18} color="#000" />}
        </AnimatedPressable>
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  kicker: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: ATP_BRAND.teal,
    letterSpacing: 2, marginTop: 24,
  },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: '#fff', marginTop: 8, lineHeight: 36 },
  statementCard: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: withOpacity(ATP_BRAND.teal, 0.35),
    borderRadius: Radius.card, padding: Spacing.lg, marginTop: Spacing.lg,
  },
  statement: {
    fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#eee', lineHeight: 25,
  },
  pillarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1a1a1a',
    borderRadius: Radius.card, padding: Spacing.md,
  },
  pillarIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: withOpacity(ATP_BRAND.teal, 0.12),
    alignItems: 'center', justifyContent: 'center',
  },
  pillarText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#bbb', lineHeight: 20 },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
