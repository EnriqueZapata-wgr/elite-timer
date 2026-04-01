/**
 * Onboarding Basics — Paso 1: nombre, fecha de nacimiento y sexo.
 *
 * Guarda datos en profiles y client_profiles, luego navega al quiz de cronotipo.
 */
import { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { ensureClientProfile } from '@/src/services/health-score-service';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS } from '@/src/constants/brand';

export default function OnboardingBasicsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length >= 2 && day && month && year && sex;

  /** Valida fecha y rango de edad (13-100 años) */
  function validateDate(): string | null {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return null;

    const date = new Date(y, m - 1, d);
    if (date.getDate() !== d || date.getMonth() !== m - 1) return null;

    const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 13 || age > 100) return null;

    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  async function handleContinue() {
    if (!user || !isValid) return;

    const dateStr = validateDate();
    if (!dateStr) {
      Alert.alert('Fecha inválida', 'Introduce una fecha de nacimiento válida (13-100 años).');
      return;
    }

    setLoading(true);
    try {
      // 1. Actualizar nombre en profiles
      await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user.id);

      // 2. Crear/actualizar client_profile con dob y sexo
      await ensureClientProfile(user.id, dateStr, sex!);

      // 3. Marcar paso de onboarding
      await supabase.from('profiles').update({ onboarding_step: 'basics' }).eq('id', user.id);

      haptic.success();
      router.push('/quiz/chronotype?from=onboarding');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText variant="label" style={styles.step}>PASO 1 DE 3</EliteText>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '33%' }]} />
            </View>
            <EliteText variant="subtitle" style={styles.heading}>Cuéntanos sobre ti</EliteText>
          </Animated.View>

          {/* Nombre */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <EliteText variant="label" style={styles.label}>Nombre</EliteText>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={TEXT_COLORS.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </Animated.View>

          {/* Fecha de nacimiento */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <EliteText variant="label" style={styles.label}>Fecha de nacimiento</EliteText>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="DD"
                placeholderTextColor={TEXT_COLORS.muted}
                value={day}
                onChangeText={(t) => setDay(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="MM"
                placeholderTextColor={TEXT_COLORS.muted}
                value={month}
                onChangeText={(t) => setMonth(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.dateInputYear]}
                placeholder="AAAA"
                placeholderTextColor={TEXT_COLORS.muted}
                value={year}
                onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </Animated.View>

          {/* Sexo */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <EliteText variant="label" style={styles.label}>Sexo biológico</EliteText>
            <View style={styles.sexRow}>
              {(['male', 'female'] as const).map((s) => (
                <AnimatedPressable
                  key={s}
                  style={[styles.sexBtn, sex === s && styles.sexBtnActive]}
                  onPress={() => { haptic.selection(); setSex(s); }}
                >
                  <EliteText variant="subtitle" style={[styles.sexText, sex === s && styles.sexTextActive]}>
                    {s === 'male' ? 'Hombre' : 'Mujer'}
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
          </Animated.View>

          {/* Botón continuar */}
          <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.footer}>
            <AnimatedPressable
              style={[styles.btnPrimary, !isValid && styles.btnDisabled]}
              disabled={!isValid || loading}
              onPress={handleContinue}
            >
              <EliteText variant="subtitle" style={styles.btnText}>
                {loading ? 'Guardando...' : 'Continuar →'}
              </EliteText>
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  step: { color: ATP_BRAND.lime, fontSize: FontSizes.sm, letterSpacing: 2, marginBottom: Spacing.sm },
  progressTrack: {
    height: 4,
    backgroundColor: SURFACES.cardLight,
    borderRadius: 2,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: ATP_BRAND.lime, borderRadius: 2 },
  heading: { fontSize: FontSizes.xxl, color: TEXT_COLORS.primary, marginBottom: Spacing.xl },
  label: { color: TEXT_COLORS.secondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    backgroundColor: SURFACES.card,
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
  },
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateInput: { flex: 1, textAlign: 'center' },
  dateInputYear: { flex: 1.5, textAlign: 'center' },
  sexRow: { flexDirection: 'row', gap: Spacing.sm },
  sexBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    backgroundColor: SURFACES.card,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SURFACES.border,
  },
  sexBtnActive: { borderColor: ATP_BRAND.lime },
  sexText: { color: TEXT_COLORS.secondary, fontSize: FontSizes.lg },
  sexTextActive: { color: ATP_BRAND.lime },
  footer: { marginTop: Spacing.xl },
  btnPrimary: {
    backgroundColor: ATP_BRAND.lime,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: TEXT_COLORS.onAccent, fontSize: FontSizes.lg },
});
