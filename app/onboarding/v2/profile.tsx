/**
 * Onboarding v2 — Paso 2: Perfil base (sexo biológico, fecha de nacimiento,
 * altura y peso). Los 4 son obligatorios: alimentan Edad ATP desde el día 1.
 * Peso/altura van a health_measurements (tabla canónica de composición).
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { ensureClientProfile } from '@/src/services/health-score-service';
import { saveHealthMeasurement } from '@/src/services/edad-atp/capture-service';
import { completeV2Step } from '@/src/services/onboarding-v2-service';
import { v2StepNumber, v2Route, V2_STEPS } from '@/src/services/onboarding-v2-core';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { haptic } from '@/src/utils/haptics';
import { AgeGateModal } from '@/src/components/onboarding/AgeGateModal';
import { ageFromDob, ageGateTier } from '@/src/utils/age-gate';
import { getLocalToday } from '@/src/utils/date-helpers';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.profile;

export default function V2ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const analytics = useAnalytics();
  const th = useOnboardingTheme();

  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  // Age gate (Sprint Compliance 2): <18 bloquea duro al submitir
  const [gateBlocked, setGateBlocked] = useState(false);

  // Prefill (usuario que venía de v1 con datos ya capturados)
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('client_profiles')
      .select('biological_sex, date_of_birth, height_cm')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.biological_sex === 'male' || data.biological_sex === 'female') setSex(data.biological_sex);
        if (data.date_of_birth) {
          const [y, m, d] = String(data.date_of_birth).split('-');
          if (y && m && d) { setYear(y); setMonth(m); setDay(d); }
        }
        if (data.height_cm) setHeight(String(data.height_cm));
      });
  }, [user?.id]);

  const heightNum = parseDecimalInput(height);
  const weightNum = parseDecimalInput(weight);
  const isValid = !!sex && !!day && !!month && !!year
    && heightNum != null && heightNum >= 100 && heightNum <= 250
    && weightNum != null && weightNum >= 25 && weightNum <= 300;

  function validateDate(): string | null {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return null;
    const date = new Date(y, m - 1, d);
    if (date.getDate() !== d || date.getMonth() !== m - 1) return null;
    // Age gate (#41): edades <13 SÍ pasan la validación de formato — el gate
    // decide (modal blocked), no un alert genérico de "fecha inválida".
    const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 0 || age > 120) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  async function handleContinue() {
    if (!user?.id || !isValid || loading) return;
    const dateStr = validateDate();
    if (!dateStr) {
      Alert.alert(COPY.invalidDateTitle, COPY.invalidDateBody);
      return;
    }
    // Age gate (Sprint Compliance 2): <18 bloquea duro — DOB obligatoria + CB-4
    const age = ageFromDob(dateStr, getLocalToday());
    const tier = ageGateTier(age);
    analytics.track(ATP_EVENTS.AGE_GATE_TRIGGERED, { tier, age });
    if (tier === 'blocked') {
      haptic.error();
      setGateBlocked(true);
      return;
    }
    await persistAndContinue(dateStr);
  }

  /** Guarda perfil + verificación de edad. */
  async function persistAndContinue(dateStr: string) {
    if (!user?.id) return;
    setLoading(true);
    try {
      await ensureClientProfile(user.id, dateStr, sex!);
      await supabase.from('client_profiles').update({ height_cm: heightNum }).eq('user_id', user.id);
      await saveHealthMeasurement(user.id, { weight_kg: weightNum!, height_cm: heightNum! });
      await supabase.from('profiles').update({
        age_verified_at: new Date().toISOString(),
      }).eq('id', user.id);
      haptic.success();
      const next = await completeV2Step(user.id, 'profile');
      router.replace(next);
    } catch {
      Alert.alert(COPY.errorTitle, COPY.errorBody);
    } finally {
      setLoading(false);
    }
  }

  /** <18: salir de la app — cierra sesión y regresa a login. */
  async function handleBlockedExit() {
    setGateBlocked(false);
    try { await signOut(); } catch { /* igual navegamos */ }
    router.replace('/login');
  }

  return (
    <OnboardingShell
      step={v2StepNumber('profile')}
      totalSteps={V2_STEPS.length}
      onBack={() => router.replace(v2Route('privacy'))}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText style={[s.title, th.titulo]}>{COPY.title}</EliteText>
            <EliteText style={[s.subtitle, th.subTenue]}>{COPY.subtitle}</EliteText>
          </Animated.View>

          {/* Sexo biológico */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <EliteText style={[s.inputLabel, th.sub]}>{COPY.sexLabel}</EliteText>
            <View style={s.sexRow}>
              {(['male', 'female'] as const).map(v => (
                <AnimatedPressable
                  key={v}
                  style={[s.sexBtn, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }, sex === v && s.sexBtnActive]}
                  onPress={() => { haptic.light(); setSex(v); }}
                >
                  <Ionicons name={v === 'male' ? 'man-outline' : 'woman-outline'} size={24} color={sex === v ? TEXT_COLORS.onAccent : th.subTenue.color} />
                  <EliteText style={[s.sexBtnText, th.subTenue, sex === v && { color: TEXT_COLORS.onAccent }]}>
                    {v === 'male' ? COPY.sexMale : COPY.sexFemale}
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
          </Animated.View>

          {/* Fecha de nacimiento */}
          <Animated.View entering={FadeInUp.delay(180).duration(400)}>
            <EliteText style={[s.inputLabel, th.sub]}>{COPY.dobLabel}</EliteText>
            <View style={s.dateRow}>
              <TextInput
                style={[s.input, th.input, s.dateInput]} placeholder="DD" placeholderTextColor={th.placeholder}
                value={day} onChangeText={(t) => setDay(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad" maxLength={2}
              />
              <EliteText style={[s.dateSep, th.hint]}>/</EliteText>
              <TextInput
                style={[s.input, th.input, s.dateInput]} placeholder="MM" placeholderTextColor={th.placeholder}
                value={month} onChangeText={(t) => setMonth(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad" maxLength={2}
              />
              <EliteText style={[s.dateSep, th.hint]}>/</EliteText>
              <TextInput
                style={[s.input, th.input, s.dateInputYear]} placeholder="AAAA" placeholderTextColor={th.placeholder}
                value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad" maxLength={4}
              />
            </View>
          </Animated.View>

          {/* Altura + peso */}
          <Animated.View entering={FadeInUp.delay(260).duration(400)}>
            <View style={s.hwRow}>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.inputLabel, th.sub]}>{COPY.heightLabel}</EliteText>
                <TextInput
                  style={[s.input, th.input]} placeholder="170" placeholderTextColor={th.placeholder}
                  value={height} onChangeText={(t) => setHeight(t.replace(/[^\d.,]/g, '').slice(0, 5))}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.inputLabel, th.sub]}>{COPY.weightLabel}</EliteText>
                <TextInput
                  style={[s.input, th.input]} placeholder="70" placeholderTextColor={th.placeholder}
                  value={weight} onChangeText={(t) => setWeight(t.replace(/[^\d.,]/g, '').slice(0, 5))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <EliteText style={[s.hint, th.hint]}>{COPY.hint}</EliteText>
          </Animated.View>
        </ScrollView>

        <View style={s.bottomBar}>
          <AnimatedPressable
            style={[s.continueBtn, !isValid && th.ctaDisabled]}
            onPress={handleContinue}
            disabled={!isValid || loading}
          >
            <EliteText style={[s.continueBtnText, !isValid && { opacity: 0.4 }]}>
              {loading ? ONBOARDING_COPY.common.saving : ONBOARDING_COPY.common.continue}
            </EliteText>
            {!loading && <Ionicons name="arrow-forward" size={18} color={isValid ? TEXT_COLORS.onAccent : th.arrowOff} />}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>

      {/* Age gate (Sprint Compliance 2): <18 bloquea duro */}
      {gateBlocked && (
        <AgeGateModal
          visible
          onExit={handleBlockedExit}
          onDismiss={() => setGateBlocked(false)}
        />
      )}
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
  inputLabel: {
    fontSize: 10, fontFamily: Fonts.semiBold,
    letterSpacing: 2, marginTop: 24, marginBottom: 8,
  },
  input: {
    borderRadius: Radius.lg, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: FontSizes.md, fontFamily: Fonts.regular,
    borderWidth: 0.5,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, textAlign: 'center' },
  dateInputYear: { flex: 1.5, textAlign: 'center' },
  dateSep: { fontSize: FontSizes.lg, fontFamily: Fonts.regular },
  hwRow: { flexDirection: 'row', gap: 12 },
  hint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 10 },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Radius.lg, paddingVertical: 16,
    borderWidth: 1,
  },
  sexBtnActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  sexBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
});
