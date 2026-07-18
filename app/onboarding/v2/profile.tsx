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
import { ATP_BRAND } from '@/src/constants/brand';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

const COPY = ONBOARDING_COPY.profile;

export default function V2ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const analytics = useAnalytics();

  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  // Age gate (#41): modal según edad calculada al submitir
  const [gate, setGate] = useState<{ variant: 'blocked' | 'parental'; age: number; dateStr: string } | null>(null);

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
    // Age gate (#41): <13 bloquea, 13-17 requiere consentimiento parental
    const age = ageFromDob(dateStr, getLocalToday());
    const tier = ageGateTier(age);
    analytics.track(ATP_EVENTS.AGE_GATE_TRIGGERED, { tier, age });
    if (tier === 'blocked') {
      haptic.error();
      setGate({ variant: 'blocked', age, dateStr });
      return;
    }
    if (tier === 'parental') {
      haptic.warning();
      setGate({ variant: 'parental', age, dateStr });
      return;
    }
    await persistAndContinue(dateStr, null);
  }

  /** Guarda perfil + verificación de edad (y consentimiento parental si aplica). */
  async function persistAndContinue(dateStr: string, parentEmail: string | null) {
    if (!user?.id) return;
    setLoading(true);
    try {
      await ensureClientProfile(user.id, dateStr, sex!);
      await supabase.from('client_profiles').update({ height_cm: heightNum }).eq('user_id', user.id);
      await saveHealthMeasurement(user.id, { weight_kg: weightNum!, height_cm: heightNum! });
      const now = new Date().toISOString();
      await supabase.from('profiles').update({
        age_verified_at: now,
        ...(parentEmail ? { parental_consent_email: parentEmail, parental_consent_at: now } : {}),
      }).eq('id', user.id);
      haptic.success();
      setGate(null);
      const next = await completeV2Step(user.id, 'profile');
      router.replace(next);
    } catch {
      Alert.alert(COPY.errorTitle, COPY.errorBody);
    } finally {
      setLoading(false);
    }
  }

  /** <13: salir de la app — cierra sesión y regresa a login. */
  async function handleBlockedExit() {
    setGate(null);
    try { await signOut(); } catch { /* igual navegamos */ }
    router.replace('/login');
  }

  return (
    <OnboardingShell
      step={v2StepNumber('profile')}
      totalSteps={V2_STEPS.length}
      onBack={() => router.replace(v2Route('welcome'))}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText style={s.title}>{COPY.title}</EliteText>
            <EliteText style={s.subtitle}>{COPY.subtitle}</EliteText>
          </Animated.View>

          {/* Sexo biológico */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <EliteText style={s.inputLabel}>{COPY.sexLabel}</EliteText>
            <View style={s.sexRow}>
              {(['male', 'female'] as const).map(v => (
                <AnimatedPressable
                  key={v}
                  style={[s.sexBtn, sex === v && s.sexBtnActive]}
                  onPress={() => { haptic.light(); setSex(v); }}
                >
                  <Ionicons name={v === 'male' ? 'man-outline' : 'woman-outline'} size={24} color={sex === v ? '#000' : '#666'} />
                  <EliteText style={[s.sexBtnText, sex === v && s.sexBtnTextActive]}>
                    {v === 'male' ? COPY.sexMale : COPY.sexFemale}
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
          </Animated.View>

          {/* Fecha de nacimiento */}
          <Animated.View entering={FadeInUp.delay(180).duration(400)}>
            <EliteText style={s.inputLabel}>{COPY.dobLabel}</EliteText>
            <View style={s.dateRow}>
              <TextInput
                style={[s.input, s.dateInput]} placeholder="DD" placeholderTextColor="#444"
                value={day} onChangeText={(t) => setDay(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad" maxLength={2}
              />
              <EliteText style={s.dateSep}>/</EliteText>
              <TextInput
                style={[s.input, s.dateInput]} placeholder="MM" placeholderTextColor="#444"
                value={month} onChangeText={(t) => setMonth(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad" maxLength={2}
              />
              <EliteText style={s.dateSep}>/</EliteText>
              <TextInput
                style={[s.input, s.dateInputYear]} placeholder="AAAA" placeholderTextColor="#444"
                value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad" maxLength={4}
              />
            </View>
          </Animated.View>

          {/* Altura + peso */}
          <Animated.View entering={FadeInUp.delay(260).duration(400)}>
            <View style={s.hwRow}>
              <View style={{ flex: 1 }}>
                <EliteText style={s.inputLabel}>{COPY.heightLabel}</EliteText>
                <TextInput
                  style={s.input} placeholder="170" placeholderTextColor="#444"
                  value={height} onChangeText={(t) => setHeight(t.replace(/[^\d.,]/g, '').slice(0, 5))}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.inputLabel}>{COPY.weightLabel}</EliteText>
                <TextInput
                  style={s.input} placeholder="70" placeholderTextColor="#444"
                  value={weight} onChangeText={(t) => setWeight(t.replace(/[^\d.,]/g, '').slice(0, 5))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <EliteText style={s.hint}>{COPY.hint}</EliteText>
          </Animated.View>
        </ScrollView>

        <View style={s.bottomBar}>
          <AnimatedPressable
            style={[s.continueBtn, !isValid && s.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!isValid || loading}
          >
            <EliteText style={[s.continueBtnText, !isValid && { opacity: 0.4 }]}>
              {loading ? ONBOARDING_COPY.common.saving : ONBOARDING_COPY.common.continue}
            </EliteText>
            {!loading && <Ionicons name="arrow-forward" size={18} color={isValid ? '#000' : '#666'} />}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>

      {/* Age gate (#41): <13 bloquea, 13-17 pide consentimiento parental */}
      {gate && (
        <AgeGateModal
          visible
          variant={gate.variant}
          age={gate.age}
          saving={loading}
          onExit={handleBlockedExit}
          onParentalConfirm={(email) => persistAndContinue(gate.dateStr, email)}
          onDismiss={() => setGate(null)}
        />
      )}
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
  inputLabel: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: '#888',
    letterSpacing: 2, marginTop: 24, marginBottom: 8,
  },
  input: {
    backgroundColor: '#0a0a0a', borderRadius: Radius.lg, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: FontSizes.md, fontFamily: Fonts.regular,
    color: '#fff', borderWidth: 0.5, borderColor: '#222',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, textAlign: 'center' },
  dateInputYear: { flex: 1.5, textAlign: 'center' },
  dateSep: { fontSize: FontSizes.lg, fontFamily: Fonts.regular, color: '#444' },
  hwRow: { flexDirection: 'row', gap: 12 },
  hint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#444', marginTop: 10 },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0a0a0a', borderRadius: Radius.lg, paddingVertical: 16,
    borderWidth: 1, borderColor: '#222',
  },
  sexBtnActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  sexBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#666' },
  sexBtnTextActive: { color: '#000' },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueBtnDisabled: { backgroundColor: '#1a1a1a' },
  continueBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
