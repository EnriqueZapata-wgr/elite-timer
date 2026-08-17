/**
 * Pantalla de Login — Entry point de la app.
 *
 * Branding ELITE + campos de email/password + links a registro y recuperación.
 *
 * BLOQ-3: la comparación con la card editorial ya no aplica. La card es oscura
 * por doctrina (lleva foto y su velo es constante, hay tests que lo exigen);
 * este flujo era oscuro por alcance pendiente, y el onboarding v2 que viene
 * INMEDIATAMENTE después está terminado en claro. Los colores de esta pantalla
 * ya salen de tokens (`useAuthTheme`), y el scope lo abre AuthScreen.
 *
 * MARCA: lo que faltaba para encender la bandera era un logo que se leyera en
 * claro. El horizontal (PNG) trae el logotipo en blanco y sobre acero daba ~1.1
 * de contraste. Ahora la marca la dibuja <LogoVerticalATP>, montado con
 * react-native-svg desde la geometría del logo vertical oficial: el logotipo
 * "ATP" entra por color (#1d1d1b en claro, #fff en oscuro, los dos de los
 * assets `_N` y `_B`) y la molécula conserva sus degradados intactos.
 */
import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreen } from '@/src/components/auth/AuthScreen';
import { useAuthTheme } from '@/src/components/auth/auth-theme';
import { AuthLinksFooter } from '@/src/components/auth/AuthLinksFooter';
import { LogoVerticalATP } from '@/src/components/ui/brand/LogoVerticalATP';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { useAuth } from '@/src/contexts/auth-context';
import { hasLocalCard, loadFichaPrelogin } from '@/src/services/salud/emergency-card-store';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { LOGIN_PASA_POR_GATE } from '@/src/constants/flags';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

// Logo grande en login (~22% del alto de pantalla, como el splash nativo).
// Es el MISMO alto que ocupaba el PNG horizontal: ese archivo era cuadrado
// (600×600) y con resizeMode="contain" acababa limitado por el alto, así que la
// huella en pantalla no se mueve al cambiar de asset.
const LOGO_HEIGHT = Math.round(Dimensions.get('window').height * 0.22);

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const t = useAuthTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  // El lima como letra tiene 1.34 sobre acero: en claro el acento es teal
  // calibrado. En oscuro `tealTexto` YA es #1ABC9C, el mismo de siempre.
  const acento = t.kind === 'light' ? t.tealTexto : ATP_BRAND.lime;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // OLA6 D: ¿hay ficha de emergencia guardada en ESTE teléfono? Se pregunta
  // sin descifrarla: solo para decidir si se pinta la entrada.
  const [hayFicha, setHayFicha] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [permitida, existe] = await Promise.all([loadFichaPrelogin(), hasLocalCard()]);
      if (alive) setHayFicha(permitida && existe);
    })();
    return () => { alive = false; };
  }, []);

  // Haptic en login: light al enviar, success/error según resultado
  const handleLogin = async () => {
    haptic.light();
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      haptic.error();
      setError(result.error);
    } else {
      haptic.success();
      // CIERRE-1: entrar por `/` y no por `/(tabs)`. `app/index.tsx` es el
      // único gate de onboarding de la app; brincarlo metía a HOY a usuarios
      // que nunca aceptaron CB-2, CB-3 y CB-4 (se firman en
      // /onboarding/v2/privacy y se asientan en user_consent_log). Quien ya
      // terminó tiene onboarding_step='completed' y el gate lo suelta a
      // /(tabs) de inmediato: no repite nada.
      router.replace(LOGIN_PASA_POR_GATE ? '/' : '/(tabs)');
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
          {/* Branding ATP */}
          <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.brand}>
            <LogoVerticalATP height={LOGO_HEIGHT} tema={t.kind === 'light' ? 'claro' : 'oscuro'} />
            <EliteText variant="caption" style={styles.tagline}>ACTIVA TU ENERGÍA Y SALUD</EliteText>
          </Animated.View>

          {/* Formulario */}
          <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.form}>
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
                placeholder="Tu contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                accentColor={t.tealTexto}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={t.textoSecundario}
                />
              </Pressable>
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

            {/* OLA6 PIEZA D: la ficha de emergencia se abre ANTES de iniciar
                sesión, leyendo la copia local del teléfono. Solo aparece si
                hay ficha guardada aquí: si no, sería una promesa vacía. */}
            {hayFicha ? (
              <Pressable onPress={() => router.push('/ficha-emergencia')} style={styles.fichaLink}>
                <Ionicons name="medkit-outline" size={16} color="#D93636" />
                <EliteText variant="caption" style={styles.fichaLinkTexto}>
                  Ficha de emergencia
                </EliteText>
              </Pressable>
            ) : null}

            <AuthLinksFooter />
          </Animated.View>
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
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
  },
  // Branding
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  tagline: {
    color: t.tealTexto,
    letterSpacing: 2,
    marginTop: Spacing.sm,
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: t.error,
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
    color: t.textoSecundario,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  linkHighlight: {
    color: t.tealTexto,
    fontFamily: Fonts.semiBold,
  },
  forgotLink: {
    color: t.tealTexto,
    textAlign: 'center',
  },
  // OLA6 D: discreto pero presente. No compite con el acceso, y el día que
  // hace falta está donde alguien lo va a buscar.
  fichaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
  },
  fichaLinkTexto: {
    color: t.textoSecundario,
    fontFamily: Fonts.semiBold,
  },
});
