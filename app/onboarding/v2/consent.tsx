/**
 * Onboarding v2 — Paso 8: Consentimiento médico + disclaimers.
 * (Decía "Paso 6": el número real lo manda V2_STEPS, no este comentario.)
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
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.consent;

export default function V2ConsentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const th = useOnboardingTheme();
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
          <EliteText style={[s.title, th.titulo]}>{COPY.title}</EliteText>
          <EliteText style={[s.subtitle, th.subTenue]}>{COPY.subtitle}</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(400)} style={{ marginTop: Spacing.lg, gap: 10 }}>
          {COPY.points.map((p, i) => (
            <View key={i} style={[s.pointCard, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
              <Ionicons name={p.icon as any} size={18} color="#fbbf24" style={{ marginTop: 2 }} />
              <EliteText style={[s.pointText, th.dark ? null : th.sub]}>{p.text}</EliteText>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(400)}>
          <Pressable onPress={() => { haptic.light(); setAccepted(a => !a); }} style={s.checkRow}>
            <View style={[s.checkbox, { borderColor: th.tokens.bordeMarcado }, accepted && s.checkboxOn]}>
              {accepted && <Ionicons name="checkmark" size={14} color={TEXT_COLORS.onAccent} />}
            </View>
            <EliteText style={[s.checkText, th.dark ? null : th.titulo]}>{COPY.checkbox}</EliteText>
          </Pressable>
          {/* QW-5: el checkbox menciona los documentos; aquí se pueden leer sin salir del flujo. */}
          <View style={s.legalLinks}>
            <Pressable onPress={() => { haptic.light(); router.push('/legal/terminos'); }} hitSlop={8}>
              <EliteText style={[s.legalLink, th.dark ? null : th.sub]}>Términos y condiciones</EliteText>
            </Pressable>
            <Pressable onPress={() => { haptic.light(); router.push('/legal/aviso'); }} hitSlop={8}>
              <EliteText style={[s.legalLink, th.dark ? null : th.sub]}>Aviso de privacidad</EliteText>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* BLOQ-2: la barra NO flota sobre el scroll (es hermana del ScrollView,
          que en RN lleva flexShrink:1 y se encoge), asi que nunca tapo nada.
          Lo que si pasaba es que el contenido se cortaba a ras del boton lima,
          sin ninguna linea que dijera "aqui termina lo scrolleable": en una
          captura eso se lee identico a un texto legal tapado. El filo hace
          visible el borde y el aire evita que la ultima tarjeta quede pegada. */}
      <View style={[s.bottomBar, { borderTopColor: th.tokens.borde }]}>
        <AnimatedPressable
          style={[s.continueBtn, !accepted && th.ctaDisabled]}
          onPress={handleContinue}
          disabled={!accepted || loading}
        >
          <EliteText style={[s.continueBtnText, !accepted && { opacity: 0.4 }]}>
            {loading ? ONBOARDING_COPY.common.saving : COPY.cta}
          </EliteText>
          {!loading && <Ionicons name="arrow-forward" size={18} color={accepted ? TEXT_COLORS.onAccent : th.arrowOff} />}
        </AnimatedPressable>
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl + Spacing.md },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: 24 },
  subtitle: {
    fontSize: FontSizes.md, fontFamily: Fonts.regular,
    marginTop: 8, lineHeight: 21,
  },
  pointCard: {
    flexDirection: 'row', gap: 12,
    borderWidth: 1, borderRadius: Radius.card, padding: Spacing.md,
  },
  pointText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.73)', lineHeight: 19 },
  checkRow: { flexDirection: 'row', gap: 12, marginTop: Spacing.lg, alignItems: 'flex-start' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxOn: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  checkText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  legalLinks: { flexDirection: 'row', gap: 20, marginTop: 12, marginLeft: 36 },
  legalLink: {
    fontSize: FontSizes.xs, fontFamily: Fonts.semiBold,
    color: 'rgba(255,255,255,0.8)', textDecorationLine: 'underline',
  },
  bottomBar: {
    paddingHorizontal: Spacing.md, paddingBottom: 40,
    paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
});
