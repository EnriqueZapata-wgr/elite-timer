/**
 * Onboarding Basics — Paso 1: nombre, fecha de nacimiento y sexo.
 *
 * Guarda datos en profiles y client_profiles, luego navega al quiz de cronotipo.
 * Usa router.replace para que el usuario no pueda volver a pasos completados.
 */
import { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { ensureClientProfile } from '@/src/services/health-score-service';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';

export default function OnboardingBasicsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      router.replace('/quiz/chronotype?from=onboarding' as any);
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header con progress */}
        <View style={[styles.header, { paddingTop: 16 }]}>
          <EliteText style={styles.stepText}>PASO 1 DE 3</EliteText>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '33%' }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Título */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText style={styles.title}>Cuéntanos de ti</EliteText>
            <EliteText style={styles.subtitle}>Necesitamos algunos datos para personalizar tu experiencia.</EliteText>
          </Animated.View>

          {/* Nombre */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <EliteText style={styles.inputLabel}>NOMBRE</EliteText>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor="#444"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              autoFocus
            />
          </Animated.View>

          {/* Fecha de nacimiento */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <EliteText style={styles.inputLabel}>FECHA DE NACIMIENTO</EliteText>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="DD"
                placeholderTextColor="#444"
                value={day}
                onChangeText={(t) => setDay(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <EliteText style={styles.dateSep}>/</EliteText>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="MM"
                placeholderTextColor="#444"
                value={month}
                onChangeText={(t) => setMonth(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <EliteText style={styles.dateSep}>/</EliteText>
              <TextInput
                style={[styles.input, styles.dateInputYear]}
                placeholder="AAAA"
                placeholderTextColor="#444"
                value={year}
                onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </Animated.View>

          {/* Sexo biológico */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <EliteText style={styles.inputLabel}>SEXO BIOLÓGICO</EliteText>
            <EliteText style={styles.inputHint}>Para rangos de salud precisos</EliteText>
            <View style={styles.sexRow}>
              <AnimatedPressable
                style={[styles.sexBtn, sex === 'male' && styles.sexBtnActive]}
                onPress={() => { haptic.light(); setSex('male'); }}
              >
                <Ionicons name="man-outline" size={24} color={sex === 'male' ? '#000' : '#666'} />
                <EliteText style={[styles.sexBtnText, sex === 'male' && styles.sexBtnTextActive]}>Hombre</EliteText>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.sexBtn, sex === 'female' && styles.sexBtnActive]}
                onPress={() => { haptic.light(); setSex('female'); }}
              >
                <Ionicons name="woman-outline" size={24} color={sex === 'female' ? '#000' : '#666'} />
                <EliteText style={[styles.sexBtnText, sex === 'female' && styles.sexBtnTextActive]}>Mujer</EliteText>
              </AnimatedPressable>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Botón continuar fijo abajo */}
        <View style={styles.bottomBar}>
          <AnimatedPressable
            style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!isValid || loading}
          >
            <EliteText style={[styles.continueBtnText, !isValid && { opacity: 0.4 }]}>
              {loading ? 'Guardando...' : 'CONTINUAR'}
            </EliteText>
            {!loading && <Ionicons name="arrow-forward" size={18} color={isValid ? '#000' : '#666'} />}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: Spacing.md },
  stepText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: ATP_BRAND.lime,
    letterSpacing: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: ATP_BRAND.lime, borderRadius: 2 },

  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginTop: 32,
  },
  subtitle: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: 8,
    marginBottom: 32,
  },

  inputLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#888',
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: '#444',
    marginTop: -4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: '#fff',
    borderWidth: 0.5,
    borderColor: '#222',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, textAlign: 'center' },
  dateInputYear: { flex: 1.5, textAlign: 'center' },
  dateSep: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.regular,
    color: '#444',
  },

  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  sexBtnActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  sexBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: '#666',
  },
  sexBtnTextActive: { color: '#000' },

  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  continueBtn: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnDisabled: { backgroundColor: '#1a1a1a' },
  continueBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
});
