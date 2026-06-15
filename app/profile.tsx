/**
 * Perfil — identidad del usuario: nombre, fecha de nacimiento (calcula edad
 * cronológica), sexo biológico. Accesible desde el header de YO (Mariana #1:
 * nombre/edad/sexo no se encontraban en ningún lado).
 *
 * Persistencia:
 *  - nombre → profiles.full_name + auth user_metadata.full_name (refresca el header)
 *  - date_of_birth, biological_sex → client_profiles (upsert real, editable)
 *
 * La edad cronológica NO se captura: se DERIVA de date_of_birth (Mariana #2: la app
 * mostraba una edad que no correspondía → aquí el usuario la ve y corrige su fecha).
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { getClientProfile, upsertClientProfile } from '@/src/services/client-profile-service';
import { parseLocalDate, getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';

/** Edad cronológica derivada de la fecha de nacimiento (null si inválida). */
function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = parseLocalDate(dob);
  const today = parseLocalDate(getLocalToday());
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setName(user.user_metadata?.full_name ?? '');
      try {
        const cp = await getClientProfile(user.id);
        if (cp?.date_of_birth) {
          const [y, m, d] = String(cp.date_of_birth).slice(0, 10).split('-');
          setYear(y ?? ''); setMonth(m ?? ''); setDay(d ?? '');
        }
        if (cp?.biological_sex === 'male' || cp?.biological_sex === 'female') setSex(cp.biological_sex);
      } catch { /* perfil nuevo */ }
      setLoading(false);
    })();
  }, [user?.id]);

  /** Valida fecha y rango de edad (13-100 años). Devuelve YYYY-MM-DD o null. */
  function validateDate(): string | null {
    const d = parseInt(day, 10), m = parseInt(month, 10), y = parseInt(year, 10);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return null;
    const date = new Date(y, m - 1, d);
    if (date.getDate() !== d || date.getMonth() !== m - 1) return null;
    const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 13 || age > 100) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const dobStr = day && month && year
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : null;
  const liveAge = ageFromDob(dobStr);
  const isValid = name.trim().length >= 2 && !!day && !!month && !!year && !!sex;

  async function handleSave() {
    if (!user?.id || !isValid) return;
    const dateStr = validateDate();
    if (!dateStr) {
      Alert.alert('Fecha inválida', 'Introduce una fecha de nacimiento válida (13-100 años).');
      return;
    }
    setSaving(true);
    try {
      const trimmed = name.trim();
      // Nombre: profiles + auth metadata (este último refresca el header de YO al instante).
      await supabase.from('profiles').update({ full_name: trimmed }).eq('id', user.id);
      await supabase.auth.updateUser({ data: { full_name: trimmed } });
      // DOB + sexo: upsert real a client_profiles (editable, no solo "ensure").
      await upsertClientProfile(user.id, { date_of_birth: dateStr, biological_sex: sex });
      haptic.success();
      Alert.alert('', 'Perfil guardado ✓', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header con back */}
        <View style={styles.header}>
          <AnimatedPressable onPress={() => { haptic.light(); router.back(); }} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#888" />
          </AnimatedPressable>
          <EliteText style={styles.headerTitle}>PERFIL</EliteText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Avatar + edad cronológica derivada */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.avatarWrap}>
            <UserAvatar uri={user?.user_metadata?.avatar_url} name={name || user?.email || 'A'} size={72} />
            {liveAge != null ? (
              <EliteText style={styles.ageText}>{liveAge} años</EliteText>
            ) : (
              <EliteText style={styles.ageHint}>Tu edad se calcula de tu fecha de nacimiento</EliteText>
            )}
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
              editable={!loading}
            />
          </Animated.View>

          {/* Fecha de nacimiento */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <EliteText style={styles.inputLabel}>FECHA DE NACIMIENTO</EliteText>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="DD" placeholderTextColor="#444"
                value={day} onChangeText={(t) => setDay(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad" maxLength={2}
              />
              <EliteText style={styles.dateSep}>/</EliteText>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="MM" placeholderTextColor="#444"
                value={month} onChangeText={(t) => setMonth(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad" maxLength={2}
              />
              <EliteText style={styles.dateSep}>/</EliteText>
              <TextInput
                style={[styles.input, styles.dateInputYear]}
                placeholder="AAAA" placeholderTextColor="#444"
                value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad" maxLength={4}
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

        <View style={styles.bottomBar}>
          <AnimatedPressable
            style={[styles.saveBtn, (!isValid || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid || saving}
          >
            <EliteText style={[styles.saveBtnText, !isValid && { opacity: 0.4 }]}>
              {saving ? 'Guardando...' : 'GUARDAR'}
            </EliteText>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: 8, paddingBottom: 8 },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#fff', letterSpacing: 2 },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  avatarWrap: { alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 },
  ageText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
  ageHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#555', textAlign: 'center' },
  inputLabel: { fontSize: 10, fontFamily: Fonts.semiBold, color: '#888', letterSpacing: 2, marginTop: 24, marginBottom: 8 },
  inputHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#444', marginTop: -4, marginBottom: 8 },
  input: {
    backgroundColor: '#0a0a0a', borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: FontSizes.md, fontFamily: Fonts.regular, color: '#fff', borderWidth: 0.5, borderColor: '#222',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, textAlign: 'center' },
  dateInputYear: { flex: 1.5, textAlign: 'center' },
  dateSep: { fontSize: FontSizes.lg, fontFamily: Fonts.regular, color: '#444' },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0a0a0a', borderRadius: Radius.lg, paddingVertical: 16, borderWidth: 1, borderColor: '#222',
  },
  sexBtnActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  sexBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#666' },
  sexBtnTextActive: { color: '#000' },
  bottomBar: { paddingHorizontal: Spacing.md, paddingBottom: 40, paddingTop: 8 },
  saveBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveBtnDisabled: { backgroundColor: '#1a1a1a' },
  saveBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
