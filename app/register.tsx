/**
 * Pantalla de Registro — Crear cuenta nueva.
 *
 * Campos: nombre completo, email, password, confirmar password.
 * Validaciones client-side antes de enviar a Supabase.
 *
 * Sprint Compliance 2: CB-1 (Términos + Aviso de Privacidad) OBLIGATORIO,
 * NO pre-marcado — bloquea la creación de cuenta. La aceptación se loguea
 * en user_consent_log; si la sesión aún no está lista, queda encolada y se
 * reintenta en el muro de consentimiento del onboarding.
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreen } from '@/src/components/auth/AuthScreen';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { logConsent } from '@/src/services/consent-log-service';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { ATP_BRAND } from '@/src/constants/brand';
import { Colors, Spacing, Fonts } from '@/constants/theme';
import { BackButton } from '@/src/components/ui/BackButton';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const analytics = useAnalytics();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // CB-1: NUNCA pre-marcado (consentimiento = acción afirmativa del usuario)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Ingresa tu nombre completo';
    if (!email.trim()) return 'Ingresa tu email';
    if (!/\S+@\S+\.\S+/.test(email.trim())) return 'Formato de email inválido';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    if (!termsAccepted) return 'Debes aceptar los Términos y el Aviso de Privacidad';
    return null;
  };

  // Haptic en registro: light al enviar, success si se crea la cuenta
  const handleRegister = async () => {
    haptic.light();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    const result = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      // CB-1 aceptado → log de auditoría (si la sesión no está lista, el
      // servicio lo encola y el muro del onboarding lo reintenta).
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser?.id) await logConsent(newUser.id, ['CB-1'], 'accepted');
      // T5 HARDENING: funnel core — cuenta creada (sin PII en props).
      analytics.track(ATP_EVENTS.USER_SIGNED_UP, { method: 'email' });
      haptic.success();
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Cuenta creada exitosamente.');
        router.replace('/onboarding/v2/welcome');
      } else {
        Alert.alert(
          'Cuenta creada',
          'Tu cuenta ha sido creada exitosamente.',
          [{ text: 'OK', onPress: () => router.replace('/onboarding/v2/welcome') }],
        );
      }
    }
  };

  return (
    <AuthScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <BackButton color={ATP_BRAND.teal} />
            <EliteText variant="title" style={styles.title}>CREAR CUENTA</EliteText>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <EliteInput
              label="NOMBRE COMPLETO"
              placeholder="Tu nombre"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              accentColor={ATP_BRAND.teal}
            />

            <EliteInput
              label="EMAIL"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accentColor={ATP_BRAND.teal}
            />

            <View style={styles.passwordContainer}>
              <EliteInput
                label="CONTRASEÑA"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                accentColor={ATP_BRAND.teal}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>

            <EliteInput
              label="CONFIRMAR CONTRASEÑA"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              accentColor={ATP_BRAND.teal}
            />

            {/* CB-1 · Términos + Aviso de Privacidad (obligatorio, NO pre-marcado) */}
            <Pressable
              onPress={() => { haptic.light(); setTermsAccepted(a => !a); }}
              style={styles.consentRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
                {termsAccepted && <Ionicons name="checkmark" size={14} color="#000" />}
              </View>
              <EliteText variant="caption" style={styles.consentText}>
                He leído y acepto los{' '}
                <EliteText
                  variant="caption"
                  style={styles.consentLink}
                  onPress={() => router.push('/legal/terminos')}
                >
                  Términos y Condiciones
                </EliteText>
                {' '}y el{' '}
                <EliteText
                  variant="caption"
                  style={styles.consentLink}
                  onPress={() => router.push('/legal/aviso')}
                >
                  Aviso de Privacidad
                </EliteText>
                .
              </EliteText>
            </Pressable>

            {error && (
              <EliteText variant="caption" style={styles.error}>
                {error}
              </EliteText>
            )}

            {loading ? (
              <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
            ) : (
              <EliteButton
                label="CREAR CUENTA"
                onPress={handleRegister}
                style={styles.registerButton}
              />
            )}

            <Pressable onPress={() => router.back()}>
              <EliteText variant="body" style={styles.link}>
                ¿Ya tienes cuenta? <EliteText variant="body" style={styles.linkHighlight}>Inicia sesión</EliteText>
              </EliteText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  title: {
    letterSpacing: 3,
  },
  form: {
    alignItems: 'center',
  },
  passwordContainer: {
    width: '100%',
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 38,
    padding: Spacing.xs,
  },
  consentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: ATP_BRAND.lime,
    borderColor: ATP_BRAND.lime,
  },
  consentText: {
    flex: 1,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  consentLink: {
    color: ATP_BRAND.teal,
    fontFamily: Fonts.semiBold,
  },
  error: {
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  loader: {
    marginVertical: Spacing.lg,
  },
  registerButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  link: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  linkHighlight: {
    color: ATP_BRAND.teal,
    fontFamily: Fonts.semiBold,
  },
});
