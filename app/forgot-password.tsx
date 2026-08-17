/**
 * Pantalla de recuperación de contraseña.
 *
 * Envía un email con enlace de reset vía Supabase Auth.
 */
import { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreen } from '@/src/components/auth/AuthScreen';
import { useAuthTheme } from '@/src/components/auth/auth-theme';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { useAuth } from '@/src/contexts/auth-context';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { Spacing } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

export default function ForgotPasswordScreen() {
  // BLOQ-3: los colores salen de tokens; el scope lo abre AuthScreen.
  const t = useAuthTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const acento = t.kind === 'light' ? t.tealTexto : ATP_BRAND.lime;
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      haptic.error();
      setError('Ingresa tu email');
      return;
    }
    // F45.6: validar formato de email antes de enviar el enlace.
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(email.trim())) {
      haptic.error();
      setError('Ingresa un email válido');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.error) {
      haptic.error();
      setError(result.error);
    } else {
      haptic.success();
      setSent(true);
    }
  };

  return (
    <AuthScreen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={t.tealTexto} />
        </Pressable>
        <EliteText variant="title" style={styles.title}>RECUPERAR</EliteText>
      </View>

      <View style={styles.content}>
        {sent ? (
          // Mensaje de confirmación
          <View style={styles.sentContainer}>
            <Ionicons name="mail-outline" size={64} color={acento} />
            <EliteText variant="subtitle" style={styles.sentTitle}>
              ENLACE ENVIADO
            </EliteText>
            <EliteText variant="body" style={styles.sentMessage}>
              Revisa tu bandeja de entrada en {email}. Sigue el enlace para restablecer tu contraseña.
            </EliteText>
            <EliteButton
              label="VOLVER AL LOGIN"
              onPress={() => router.back()}
              variant="outline"
              style={styles.backToLogin}
            />
          </View>
        ) : (
          // Formulario
          <>
            <EliteText variant="body" style={styles.description}>
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </EliteText>

            <EliteInput
              label="EMAIL"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accentColor={t.tealTexto}
            />

            {error && (
              <EliteText variant="caption" style={styles.error}>
                {error}
              </EliteText>
            )}

            {loading ? (
              <ActivityIndicator size="large" color={acento} style={styles.loader} />
            ) : (
              <EliteButton
                label="ENVIAR ENLACE"
                onPress={handleReset}
                style={styles.sendButton}
              />
            )}
          </>
        )}
      </View>
    </AuthScreen>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    letterSpacing: 3,
  },
  content: {
    flex: 1,
  },
  description: {
    color: t.textoSecundario,
    marginBottom: Spacing.lg,
  },
  error: {
    color: t.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  loader: {
    marginVertical: Spacing.lg,
  },
  sendButton: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  // Estado enviado
  sentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  sentTitle: {
    // El lima como letra SÍ vale en oscuro (la regla 1 lo prohíbe en claro):
    // aquí se conserva tal cual y solo se calibra a teal cuando hay acero.
    color: t.kind === 'light' ? t.tealTexto : ATP_BRAND.lime,
    letterSpacing: 3,
    marginTop: Spacing.md,
  },
  sentMessage: {
    color: t.textoSecundario,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backToLogin: {
    marginTop: Spacing.lg,
  },
});
