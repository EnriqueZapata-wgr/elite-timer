/**
 * Onboarding v2 — Paso 4: Modalidad de Ciclo (task #111).
 * Opciones según sexo biológico (capturado en el paso 2):
 *   mujer: regular / embarazo / peri-menopausia / sin ciclo
 *   hombre: desactivar módulo (default) / vincular con pareja
 * También configurable después en Ajustes de Ciclo.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { completeV2Step, saveCycleModality } from '@/src/services/onboarding-v2-service';
import {
  v2StepNumber, v2Route, V2_STEPS,
  cycleModalityOptions, defaultCycleModality, type CycleModality,
} from '@/src/services/onboarding-v2-core';
import { ContextualConsentModal } from '@/src/components/legal/ContextualConsentModal';
import { logConsent } from '@/src/services/consent-log-service';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.cycle;

const CYCLE_PINK = '#D4537E'; // color de categoría ciclo (brand)

export default function V2CycleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [modality, setModality] = useState<CycleModality | null>(null);
  const [loading, setLoading] = useState(false);
  // CB-7 (Sprint Compliance 2): consentimiento contextual de datos de ciclo
  const [consentVisible, setConsentVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('client_profiles')
      .select('biological_sex, cycle_modality')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        const sx = data?.biological_sex === 'male' ? 'male' : 'female';
        setSex(sx);
        setModality((data?.cycle_modality as CycleModality) ?? defaultCycleModality(sx));
      });
  }, [user?.id]);

  const options = cycleModalityOptions(sex);

  /** Modalidades que tratan datos de ciclo/embarazo/lactancia → requieren CB-7. */
  const requiresCycleConsent = (m: CycleModality) =>
    m === 'regular' || m === 'pregnancy' || m === 'menopause' || m === 'no_cycle';

  async function handleContinue() {
    if (!user?.id || !modality || loading) return;
    // CB-7: al activar el módulo Ciclo, consentimiento contextual (Aviso Parte 3)
    if (requiresCycleConsent(modality) && !consentVisible) {
      setConsentVisible(true);
      return;
    }
    await persistAndContinue(false);
  }

  async function persistAndContinue(withConsent: boolean) {
    if (!user?.id || !modality) return;
    setLoading(true);
    try {
      if (withConsent) await logConsent(user.id, ['CB-7'], 'accepted');
      await saveCycleModality(user.id, modality);
      haptic.success();
      setConsentVisible(false);
      const next = await completeV2Step(user.id, 'cycle');
      router.replace(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell
      step={v2StepNumber('cycle')}
      totalSteps={V2_STEPS.length}
      onBack={() => router.replace(v2Route('goal'))}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={s.title}>
            {sex === 'female' ? COPY.titleFemale : COPY.titleMale}
          </EliteText>
          <EliteText style={s.subtitle}>
            {sex === 'female' ? COPY.subtitleFemale : COPY.subtitleMale}
          </EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(400)} style={{ marginTop: Spacing.lg }}>
          {options.map(opt => {
            const selected = modality === opt.value;
            return (
              <AnimatedPressable
                key={opt.value}
                onPress={() => { haptic.light(); setModality(opt.value); }}
                style={[s.card, selected && s.cardSelected]}
              >
                <View style={[s.iconWrap, selected && { backgroundColor: withOpacity(CYCLE_PINK, 0.15) }]}>
                  <Ionicons name={opt.icon as any} size={20} color={selected ? CYCLE_PINK : '#666'} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText style={[s.cardTitle, selected && { color: '#fff' }]}>{opt.label}</EliteText>
                  <EliteText style={s.cardDesc}>{opt.description}</EliteText>
                </View>
                <View style={[s.radio, selected && s.radioSelected]}>
                  {selected && <View style={s.radioDot} />}
                </View>
              </AnimatedPressable>
            );
          })}
          <EliteText style={s.hint}>{COPY.hint}</EliteText>
        </Animated.View>
      </ScrollView>

      <View style={s.bottomBar}>
        <AnimatedPressable
          style={[s.continueBtn, !modality && s.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!modality || loading}
        >
          <EliteText style={[s.continueBtnText, !modality && { opacity: 0.4 }]}>
            {loading ? ONBOARDING_COPY.common.saving : ONBOARDING_COPY.common.continue}
          </EliteText>
          {!loading && <Ionicons name="arrow-forward" size={18} color={modality ? '#000' : '#666'} />}
        </AnimatedPressable>
      </View>

      {/* CB-7 · consentimiento contextual del módulo Ciclo */}
      <ContextualConsentModal
        visible={consentVisible}
        checkboxId="CB-7"
        title="Tus datos de ciclo, bajo tu control"
        saving={loading}
        onAccept={() => persistAndContinue(true)}
        onDecline={() => setConsentVisible(false)}
      />
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
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1a1a1a',
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cardSelected: { borderColor: CYCLE_PINK, backgroundColor: withOpacity(CYCLE_PINK, 0.05) },
  iconWrap: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#ccc' },
  cardDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#666', marginTop: 2, lineHeight: 16 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: CYCLE_PINK },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: CYCLE_PINK },
  hint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#444', marginTop: 8 },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnDisabled: { backgroundColor: '#1a1a1a' },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
