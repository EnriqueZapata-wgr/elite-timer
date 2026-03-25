/**
 * Pantalla de Login — Entry point de la app.
 *
 * Branding ELITE + campos de email/password + links a registro y recuperación.
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { useAuth } from '@/src/contexts/auth-context';
import { Colors, Spacing, Fonts, FontSizes } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.replace('/(tabs)');
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
          {/* Branding ATP */}
          <View style={styles.brand}>
            <View style={styles.accentLine} />
            <EliteText variant="title" style={styles.logo}>ATP</EliteText>
            <EliteText variant="label" style={styles.tagline}>PERFORMANCE TIMER</EliteText>
            <View style={styles.accentLine} />
          </View>

          {/* Formulario */}
          <View style={styles.form}>
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
                placeholder="Tu contraseña"
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

            {error && (
              <EliteText variant="caption" style={styles.error}>
                {error}
              </EliteText>
            )}

            {loading ? (
              <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
            ) : (
              <EliteButton
                label="INICIAR SESIÓN"
                onPress={handleLogin}
                style={styles.loginButton}
              />
            )}

            {/* Links */}
            <Pressable onPress={() => router.push('/register')}>
              <EliteText variant="body" style={styles.link}>
                ¿No tienes cuenta? <EliteText variant="body" style={styles.linkHighlight}>Regístrate</EliteText>
              </EliteText>
            </Pressable>

            <Pressable onPress={() => router.push('/forgot-password')}>
              <EliteText variant="caption" style={styles.forgotLink}>
                ¿Olvidaste tu contraseña?
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
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
  },
  // Branding
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    fontSize: 56,
    letterSpacing: 16,
  },
  tagline: {
    letterSpacing: 6,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  accentLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.neonGreen,
    marginVertical: Spacing.md,
  },
  // Formulario
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
  loginButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  link: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  linkHighlight: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },
  forgotLink: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
