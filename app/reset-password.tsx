/**
 * Pantalla de reset de contraseña — destino del deep link `atp://reset-password` (#auth-sprint D).
 *
 * Flujo: el _layout parsea el deep link y nos pasa access_token/refresh_token → validamos la
 * sesión con setSession → mostramos form (nueva + confirmar) → updateUser({password}) → /login.
 * Estilo consistente con login/register/forgot (AuthScreen, inputs teal).
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreen } from '@/src/components/auth/AuthScreen';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND } from '@/src/constants/brand';
import { Colors, Spacing } from '@/constants/theme';

type Phase = 'validating' | 'ready' | 'invalid';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();

  const [phase, setPhase] = useState<Phase>('validating');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validar el token estableciendo la sesión de recuperación.
  useEffect(() => {
    const access_token = params.access_token;
    const refresh_token = params.refresh_token;
    if (!access_token || !refresh_token) { setPhase('invalid'); return; }
    let alive = true;
    (async () => {
      const { error: sessErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (!alive) return;
      setPhase(sessErr ? 'invalid' : 'ready');
    })();
    return () => { alive = false; };
  }, [params.access_token, params.refresh_token]);

  const handleUpdate = async () => {
    haptic.light();
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); haptic.error(); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); haptic.error(); return; }

    setError(null);
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updErr) {
      haptic.error();
      setError(updErr.message.includes('should be at least') ? 'La contraseña debe tener al menos 6 caracteres' : updErr.message);
      return;
    }
    haptic.success();
    Alert.alert('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.', [
      { text: 'OK', onPress: () => router.replace('/login') },
    ]);
  };

  return (
    <AuthScreen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.replace('/login')} style={styles.backButton} hitSlop={8}>
              <Ionicons name="chevron-back" size={28} color={ATP_BRAND.teal} />
            </Pressable>
            <EliteText variant="title" style={styles.title}>NUEVA CONTRASEÑA</EliteText>
          </View>

          {phase === 'validating' ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={ATP_BRAND.teal} />
              <EliteText variant="caption" style={styles.muted}>Validando enlace…</EliteText>
            </View>
          ) : phase === 'invalid' ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
              <EliteText variant="body" style={styles.muted}>
                El enlace expiró o no es válido. Solicita uno nuevo.
              </EliteText>
              <EliteButton label="VOLVER A SOLICITAR" onPress={() => router.replace('/forgot-password')} variant="outline" style={styles.cta} />
            </View>
          ) : (
            <View style={styles.form}>
              <EliteText variant="body" style={styles.description}>
                Ingresa tu nueva contraseña. Mínimo 6 caracteres.
              </EliteText>

              <View style={styles.passwordContainer}>
                <EliteInput
                  label="NUEVA CONTRASEÑA"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  accentColor={ATP_BRAND.teal}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <EliteInput
                label="CONFIRMAR CONTRASEÑA"
                placeholder="Repite tu contraseña"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                accentColor={ATP_BRAND.teal}
              />

              {error && <EliteText variant="caption" style={styles.error}>{error}</EliteText>}

              {loading ? (
                <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
              ) : (
                <EliteButton label="ACTUALIZAR CONTRASEÑA" onPress={handleUpdate} style={styles.cta} />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.sm },
  backButton: { padding: Spacing.xs },
  title: { letterSpacing: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl },
  muted: { color: Colors.textSecondary, textAlign: 'center' },
  form: { alignItems: 'center' },
  description: { color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: 'center' },
  passwordContainer: { width: '100%', position: 'relative' },
  eyeButton: { position: 'absolute', right: Spacing.md, top: 38, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { color: Colors.error, textAlign: 'center', marginBottom: Spacing.md },
  loader: { marginVertical: Spacing.lg },
  cta: { marginTop: Spacing.sm, alignSelf: 'center' },
});
