/**
 * Pantalla de Registro — Crear cuenta nueva.
 *
 * Campos: nombre completo, email, password, confirmar password.
 * Validaciones client-side antes de enviar a Supabase.
 *
 * Sprint Compliance 2: CB-1 (Términos + Aviso de Privacidad) OBLIGATORIO,
 * NO pre-marcado, bloquea la creación de cuenta. La aceptación se loguea
 * en user_consent_log; si la sesión aún no está lista, queda encolada y se
 * reintenta después.
 *
 * PIVOTE LIMPIO, 7 de septiembre de 2026: aquí se firman TRES, no uno.
 * Se suman CB-3 (transferencia internacional) y CB-4 (mayoría de edad), que
 * hasta hoy vivían en el muro del onboarding.
 *   · CB-3 porque Supabase, Sentry y PostHog están en Estados Unidos y tratan
 *     datos desde que se crea la cuenta. Pedirlo tres pantallas después sería
 *     transferir antes de consentir.
 *   · CB-4 porque la mayoría de edad es la condición de validez de todos los
 *     demás consentimientos, y sin ella un menor entrega edad, sexo, talla y
 *     peso antes de que alguien pregunte.
 * Los tres son los que el guardia de app/index.tsx exige para abrir la app.
 * Ninguno viene pre-marcado: el consentimiento es un acto de la persona.
 *
 * CB-2 (datos sensibles de salud) NO está aquí a propósito: la LFPDPPP pide
 * consentimiento previo al TRATAMIENTO, no previo al registro, así que se
 * pide en la pantalla que va a escribir el primer dato de salud
 * (src/components/legal/PuertaDatosSalud.tsx).
 */
import { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreen } from '@/src/components/auth/AuthScreen';
import { useAuthTheme } from '@/src/components/auth/auth-theme';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { logConsent } from '@/src/services/consent-log-service';
import { ConsentCheckboxRow } from '@/src/components/legal/ConsentCheckboxRow';
import { CONSENT_BY_ID } from '@/src/constants/consent-copy';
import { CONSENTIMIENTOS_DE_PUERTA } from '@/src/services/acceso-consentido-core';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
// MB-31B remate dejó esta pantalla anclada a THEME_DARK como frontera oscura.
// BLOQ-3 (16-ago) la pasó a `useAuthTheme`, y MARCA (17-ago) encendió
// AUTH_RESPETA_EL_TEMA: hoy AuthScreen abre <ThemeReady>, pinta el gradiente
// con tokens (flotante→fondo en claro) y pone el StatusBar por tema. Aquí no
// queda un solo neutro a mano; el lima solo vive como RELLENO (checkbox) y
// el acento de letra en claro es tealTexto. Verificado el 31-ago-2026 (21.3).
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { Spacing, Fonts } from '@/constants/theme';
import { BackButton } from '@/src/components/ui/BackButton';

export default function RegisterScreen() {
  const router = useRouter();
  // BLOQ-3: los colores salen de tokens; el scope lo abre AuthScreen.
  const t = useAuthTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const acento = t.kind === 'light' ? t.tealTexto : ATP_BRAND.lime;
  const { signUp } = useAuth();
  const analytics = useAnalytics();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // CB-1, CB-3 y CB-4: NUNCA pre-marcados (consentimiento = acción afirmativa
  // del usuario, art. 8 LFPDPPP). Tres estados separados a propósito: una sola
  // casilla para tres consentimientos distintos no es consentimiento granular.
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [transferAccepted, setTransferAccepted] = useState(false);
  const [adultAccepted, setAdultAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Ingresa tu nombre completo';
    if (!email.trim()) return 'Ingresa tu email';
    if (!/\S+@\S+\.\S+/.test(email.trim())) return 'Formato de email inválido';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    if (!termsAccepted) return 'Debes aceptar los Términos y el Aviso de Privacidad';
    if (!transferAccepted) return 'Necesitamos tu permiso para la transferencia internacional de datos';
    if (!adultAccepted) return 'Necesitamos que confirmes que eres mayor de 18 años';
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
      // CB-1, CB-3 y CB-4 aceptados → log de auditoría. Si la sesión todavía
      // no está lista, el servicio los encola en AsyncStorage y se reintentan
      // solos; y si aun así no llegan, el guardia manda a /consentimientos,
      // que hace flush antes de volver a preguntar. Nadie firma dos veces por
      // un fallo de red y nadie entra sin que la fila exista.
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser?.id) await logConsent(newUser.id, [...CONSENTIMIENTOS_DE_PUERTA], 'accepted');
      // T5 HARDENING: funnel core — cuenta creada (sin PII en props).
      analytics.track(ATP_EVENTS.USER_SIGNED_UP, { method: 'email' });
      haptic.success();
      // PIVOTE LIMPIO (7-sep-2026): esta pantalla es la 1 de 6 y la que sigue
      // es la de las tres preguntas. El onboarding de diez pantallas dejó de
      // ser el camino de una cuenta nueva; sus pantallas siguen existiendo
      // para quien quedó a medias en un build anterior.
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Cuenta creada exitosamente.');
        router.replace('/primera-sesion/preguntas');
      } else {
        Alert.alert(
          'Cuenta creada',
          'Tu cuenta ha sido creada exitosamente.',
          [{ text: 'OK', onPress: () => router.replace('/primera-sesion/preguntas') }],
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
            <BackButton color={t.tealTexto} />
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
              accentColor={t.tealTexto}
            />

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

            <View style={styles.passwordContainer}>
              <EliteInput
                label="CONTRASEÑA"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                accentColor={t.tealTexto}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={t.textoSecundario}
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
              accentColor={t.tealTexto}
            />

            {/* CB-1 · Términos + Aviso de Privacidad (obligatorio, NO pre-marcado).
                MB-17: abren la web publicada (misma fuente que el paywall) —
                las pantallas /legal/* quedan de respaldo, nadie navega a ellas
                mientras el texto in-app tenga corchetes de razón social. */}
            <Pressable
              onPress={() => { haptic.light(); setTermsAccepted(a => !a); }}
              style={styles.consentRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
                {termsAccepted && <Ionicons name="checkmark" size={14} color={t.textoSobreLima} />}
              </View>
              <EliteText variant="caption" style={styles.consentText}>
                He leído y acepto los{' '}
                <EliteText
                  variant="caption"
                  style={styles.consentLink}
                  onPress={() => Linking.openURL('https://somosatp.com/terminos').catch(() => {})}
                >
                  Términos y Condiciones
                </EliteText>
                {' '}y el{' '}
                <EliteText
                  variant="caption"
                  style={styles.consentLink}
                  onPress={() => Linking.openURL('https://somosatp.com/privacidad').catch(() => {})}
                >
                  Aviso de Privacidad
                </EliteText>
                .
              </EliteText>
            </Pressable>

            {/* CB-3 y CB-4 · pivote limpio 7-sep-2026. Texto legal EXACTO
                (es el que se hashea en user_consent_log), casillas separadas
                y ninguna pre-marcada. Sin estas dos no hay cuenta: son la
                condición para tratar y transferir cualquier dato. */}
            <View style={styles.consentBlock}>
              <ConsentCheckboxRow
                text={CONSENT_BY_ID['CB-3'].text}
                checked={transferAccepted}
                onToggle={() => setTransferAccepted(a => !a)}
                required
              />
              <ConsentCheckboxRow
                text={CONSENT_BY_ID['CB-4'].text}
                checked={adultAccepted}
                onToggle={() => setAdultAccepted(a => !a)}
                required
              />
            </View>

            {error && (
              <EliteText variant="caption" style={styles.error}>
                {error}
              </EliteText>
            )}

            {loading ? (
              <ActivityIndicator size="large" color={acento} style={styles.loader} />
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

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
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
  consentBlock: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
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
    borderColor: t.bordeMarcado,
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
    color: t.textoSecundario,
    lineHeight: 18,
  },
  consentLink: {
    color: t.tealTexto,
    fontFamily: Fonts.semiBold,
  },
  error: {
    color: t.error,
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
    color: t.textoSecundario,
    textAlign: 'center',
  },
  linkHighlight: {
    color: t.tealTexto,
    fontFamily: Fonts.semiBold,
  },
});
