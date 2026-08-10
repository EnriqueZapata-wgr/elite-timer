/**
 * Onboarding v2 — Paso 2: Muro de consentimiento (Sprint Compliance 2).
 *
 * Aviso de Privacidad Simplificado (Parte 2) arriba + checkboxes de la
 * Parte 3: CB-2 (datos sensibles), CB-3 (transferencia internacional) y
 * CB-4 (mayoría de edad) OBLIGATORIOS — bloquean el onboarding. CB-5
 * (marketing) opcional. CB-1 se aceptó en register.tsx. CB-6/CB-7 son
 * contextuales (se muestran al activar voz / módulo Ciclo).
 *
 * Cada aceptación se loguea en user_consent_log (migración 209).
 * Patrón "privacidad como alivio": consentimiento = control, no letra chica.
 */
import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { ConsentCheckboxRow } from '@/src/components/legal/ConsentCheckboxRow';
import { useAuth } from '@/src/contexts/auth-context';
import { completeV2Step } from '@/src/services/onboarding-v2-service';
import { v2StepNumber, v2Route, V2_STEPS } from '@/src/services/onboarding-v2-core';
import { logConsent, flushPendingConsentLogs } from '@/src/services/consent-log-service';
import { CONSENT_BY_ID, AVISO_SIMPLIFICADO, type ConsentCheckboxId } from '@/src/constants/consent-copy';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';

const WALL_IDS: ConsentCheckboxId[] = ['CB-2', 'CB-3', 'CB-4', 'CB-5'];
const REQUIRED_IDS: ConsentCheckboxId[] = ['CB-2', 'CB-3', 'CB-4'];

export default function V2PrivacyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const th = useOnboardingTheme();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const allRequired = REQUIRED_IDS.every(id => checked[id]);

  async function handleContinue() {
    if (!user?.id || !allRequired || loading) return;
    setLoading(true);
    try {
      // Reintenta el CB-1 de register si quedó encolado (sesión tardía)
      await flushPendingConsentLogs(user.id);
      const accepted = WALL_IDS.filter(id => checked[id]);
      await logConsent(user.id, accepted, 'accepted');
      haptic.success();
      const next = await completeV2Step(user.id, 'privacy');
      router.replace(next);
    } catch {
      Alert.alert('Error', 'No pudimos guardar tu consentimiento. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell
      step={v2StepNumber('privacy')}
      totalSteps={V2_STEPS.length}
      onBack={() => router.replace(v2Route('positioning'))}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={[s.title, th.titulo]}>{AVISO_SIMPLIFICADO.title}</EliteText>
          <EliteText style={[s.subtitle, th.subTenue]}>
            Tú decides qué compartes. Esto es control sobre tus datos, no letra chica.
          </EliteText>
        </Animated.View>

        {/* Aviso Simplificado (Parte 2) */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          style={[s.noticeCard, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}
        >
          {AVISO_SIMPLIFICADO.paragraphs.map((p, i) => (
            <EliteText key={i} style={[s.noticeText, th.dark ? null : th.sub, i > 0 && { marginTop: 10 }]}>{p}</EliteText>
          ))}
          {/* MB-17: los documentos completos se leen en la web publicada —
              las pantallas /legal/* quedan de respaldo mientras el texto
              in-app tenga corchetes de razón social. */}
          <View style={s.linksRow}>
            <AnimatedPressable style={s.linkBtn} onPress={() => { haptic.light(); Linking.openURL('https://somosatp.com/privacidad').catch(() => {}); }}>
              <Ionicons name="document-text-outline" size={14} color={th.dark ? ATP_BRAND.teal : th.tokens.tealTexto} />
              <EliteText style={[s.linkText, th.acento != null && { color: th.acento }]}>Aviso completo</EliteText>
            </AnimatedPressable>
            <AnimatedPressable style={s.linkBtn} onPress={() => { haptic.light(); Linking.openURL('https://somosatp.com/terminos').catch(() => {}); }}>
              <Ionicons name="document-text-outline" size={14} color={th.dark ? ATP_BRAND.teal : th.tokens.tealTexto} />
              <EliteText style={[s.linkText, th.acento != null && { color: th.acento }]}>Términos y Condiciones</EliteText>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Checkboxes CB-2/3/4 obligatorios + CB-5 opcional. NUNCA pre-marcados. */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={{ gap: 16, marginTop: Spacing.lg }}>
          {WALL_IDS.map(id => (
            <ConsentCheckboxRow
              key={id}
              text={CONSENT_BY_ID[id].text}
              checked={!!checked[id]}
              onToggle={() => setChecked(c => ({ ...c, [id]: !c[id] }))}
              required={CONSENT_BY_ID[id].required}
            />
          ))}
          <EliteText style={[s.requiredHint, th.dark ? null : th.subTenue]}>* Necesarios para operar tu cuenta. Puedes revocarlos en Perfil → Privacidad.</EliteText>
        </Animated.View>
      </ScrollView>

      <View style={s.bottomBar}>
        <AnimatedPressable
          style={[s.continueBtn, !allRequired && th.ctaDisabled]}
          onPress={handleContinue}
          disabled={!allRequired || loading}
        >
          <EliteText style={[s.continueBtnText, !allRequired && { opacity: 0.4 }]}>
            {loading ? 'Guardando…' : 'ACEPTO Y CONTINÚO'}
          </EliteText>
          {!loading && <Ionicons name="arrow-forward" size={18} color={allRequired ? TEXT_COLORS.onAccent : th.arrowOff} />}
        </AnimatedPressable>
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: 24 },
  subtitle: {
    fontSize: FontSizes.md, fontFamily: Fonts.regular,
    marginTop: 8, lineHeight: 21,
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md, marginTop: Spacing.lg,
  },
  noticeText: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.73)', lineHeight: 20 },
  linksRow: { flexDirection: 'row', gap: 16, marginTop: 14, flexWrap: 'wrap' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: ATP_BRAND.teal },
  requiredHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: withOpacity(ATP_BRAND.white, 0.4), lineHeight: 17 },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
});
