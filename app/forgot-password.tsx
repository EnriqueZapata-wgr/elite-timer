/**
 * Pantalla de recuperación de contraseña.
 *
 * Envía un email con enlace de reset vía Supabase Auth.
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { useAuth } from '@/src/contexts/auth-context';
import { Colors, Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Ingresa tu email');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  };

  return (
    <ScreenContainer centered={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title" style={styles.title}>RECUPERAR</EliteText>
      </View>

      <View style={styles.content}>
        {sent ? (
          // Mensaje de confirmación
          <View style={styles.sentContainer}>
            <Ionicons name="mail-outline" size={64} color={Colors.neonGreen} />
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
                label="ENVIAR ENLACE"
                onPress={handleReset}
                style={styles.sendButton}
              />
            )}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  error: {
    color: Colors.error,
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
    color: Colors.neonGreen,
    letterSpacing: 3,
    marginTop: Spacing.md,
  },
  sentMessage: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backToLogin: {
    marginTop: Spacing.lg,
  },
});
