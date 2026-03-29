/**
 * Pantalla de Registro — Crear cuenta nueva.
 *
 * Campos: nombre completo, email, password, confirmar password.
 * Validaciones client-side antes de enviar a Supabase.
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Fonts } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Ingresa tu nombre completo';
    if (!email.trim()) return 'Ingresa tu email';
    if (!/\S+@\S+\.\S+/.test(email.trim())) return 'Formato de email inválido';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
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
      haptic.success();
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Cuenta creada exitosamente.');
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          'Cuenta creada',
          'Tu cuenta ha sido creada exitosamente.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
        );
      }
    }
  };

  return (
    <ScreenContainer centered={false}>
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
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
              <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
            </Pressable>
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
            />

            <EliteInput
              label="EMAIL"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <View style={styles.passwordContainer}>
              <EliteInput
                label="CONTRASEÑA"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                containerStyle={styles.passwordInput}
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
            />

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
    </ScreenContainer>
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
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },
});
