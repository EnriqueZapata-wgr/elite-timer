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
 *
 * PIVOTE ELITE, 8 de septiembre de 2026: la app deja de ser para el público y
 * pasa a ser solo para clientes con servicio contratado. Decisión del dueño:
 * SIN CÓDIGO DE ACTIVACIÓN NO HAY CUENTA. Por eso el código es el primer campo
 * de la pantalla: es la puerta, y nadie debería llenar cuatro campos para
 * enterarse al final de que no puede pasar.
 *
 * El código NO es una vía de compra y no se presenta como tal (Apple 3.1.1):
 * aquí no se nombra ningún precio, ninguna tienda ni ningún sitio. Es "el que
 * te dimos con tu servicio contratado", y punto.
 *
 * ORDEN (verificar, crear, canjear) y por qué es ese y no otro:
 *   1. Se VERIFICA el código con un RPC que no lo consume. Si no sirve, no se
 *      crea cuenta: no se gastó nada y nadie quedó a medias.
 *   2. Se crea la cuenta.
 *   3. Se CANJEA (redeem_activation_code necesita sesión: sin cuenta no hay
 *      quién canjee). Consumir al final garantiza que un código nunca se
 *      queme sin cuenta detrás. El riesgo que queda es el contrario, cuenta
 *      creada y canje fallido, y ese sí se puede reparar: la cuenta existe,
 *      el código sigue vivo y se activa en Ajustes, Tengo un código.
 *
 * Quien ya tiene cuenta NO pasa por aquí: el código se exige al crear cuenta
 * nueva, nunca al entrar. Los perfiles que existían antes de este pivote
 * siguen entrando igual.
 */
import { useState, useMemo, useRef } from 'react';
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
import {
  redeemActivationCode,
  verificarCodigoActivacion,
} from '@/src/services/subscription/subscription-service';
import {
  COPY_CONFIRMA_TU_CORREO,
  mensajeDeCanjeTrasCuenta,
  mensajeDeCodigo,
  nivelQuedoAplicado,
  permiteCrearCuenta,
  tieneFormaDeCodigo,
} from '@/src/services/subscription/codigo-registro-core';
import { guardarCanjePendiente } from '@/src/services/subscription/canje-pendiente';
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

  // PIVOTE ELITE (8-sep-2026): el código es el primer campo y la condición de
  // todo lo demás. Se guarda en mayúsculas porque así se escribe y así se lee
  // en voz alta; el servidor lo normaliza de todos modos.
  const [codigo, setCodigo] = useState('');
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
  // CARRERA (8-sep-2026): `loading` es estado y solo frena después del
  // re-render. Dos toques seguidos alcanzan a entrar dos veces al mismo alta.
  // El ref frena en el mismo tick, antes de que React pinte nada.
  const enviandoRef = useRef(false);

  const validate = (): string | null => {
    if (!tieneFormaDeCodigo(codigo)) return 'Escribe el código de activación que te dimos con tu servicio contratado';
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

  /**
   * Aviso de alta y salida a la primera sesión.
   * PIVOTE LIMPIO (7-sep-2026): esta pantalla es la 1 de 6 y la que sigue es
   * la de las tres preguntas. El onboarding de diez pantallas dejó de ser el
   * camino de una cuenta nueva; sus pantallas siguen existiendo para quien
   * quedó a medias en un build anterior.
   * `aviso` no nulo (8-sep-2026) significa: la cuenta SÍ existe, lo que no se
   * pudo fue activar el nivel. Se entra igual; nadie se queda fuera de su
   * propia cuenta por un canje que puede repetirse en Ajustes.
   */
  const avisarAltaYSeguir = (aviso: string | null) => {
    const texto = aviso ?? 'Tu cuenta ya está lista y tu nivel quedó activo.';
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(texto);
      router.replace('/primera-sesion/preguntas');
    } else {
      Alert.alert(
        'Cuenta creada',
        texto,
        [{ text: 'OK', onPress: () => router.replace('/primera-sesion/preguntas') }],
      );
    }
  };

  /**
   * Cuenta creada SIN sesión: el camino de la confirmación por correo.
   *
   * 8-sep-2026 (revisión en frío): esto no es un canje fallido, es otro
   * camino, y hay que tratarlo como tal. A /primera-sesion/preguntas no se
   * puede ir sin sesión (el guardia rebota a /login), así que se va derecho a
   * /login, pero avisando ANTES lo que hay que hacer. Antes de este arreglo,
   * la persona aterrizaba en login sin que nada le hablara del correo.
   */
  const avisarConfirmaTuCorreo = () => {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(COPY_CONFIRMA_TU_CORREO.texto);
      router.replace('/login');
    } else {
      Alert.alert(
        COPY_CONFIRMA_TU_CORREO.titulo,
        COPY_CONFIRMA_TU_CORREO.texto,
        [{ text: 'Entendido', onPress: () => router.replace('/login') }],
      );
    }
  };

  // Haptic en registro: light al enviar, success si se crea la cuenta
  const handleRegister = async () => {
    haptic.light();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    setError(null);
    setLoading(true);
    try {
      // PASO 1 (8-sep-2026): la puerta. Verificar NO consume el código, así
      // que un tropiezo aquí no gasta nada de nadie. Si no se pudo verificar,
      // `permiteCrearCuenta` dice que no y el mensaje habla de la conexión,
      // nunca del código: confundir "no se pudo leer" con "no existe" sería
      // acusar de mentiroso a un cliente que ya pagó.
      const estado = await verificarCodigoActivacion(codigo);
      if (!permiteCrearCuenta(estado)) {
        setError(mensajeDeCodigo(estado));
        haptic.error();
        return;
      }

      // PASO 2: la cuenta.
      const result = await signUp(email.trim(), password, fullName.trim());
      if (result.error) {
        setError(result.error);
        haptic.error();
        return;
      }

      // ¿QUEDÓ SESIÓN? (8-sep-2026, revisión en frío). Con la confirmación por
      // correo activada NO queda, y ese es el camino de todos los clientes
      // nuevos. Se pregunta antes de intentar nada: sin sesión, el canje
      // contestaría not_authenticated dos veces y la persona acabaría en
      // login sin saber que tiene un correo esperándola.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // El código se guarda con llave por correo y se canja solo en el
        // primer login (canjearPendiente). Nadie lo vuelve a teclear.
        await guardarCanjePendiente(email.trim(), codigo);
        analytics.track(ATP_EVENTS.USER_SIGNED_UP, { method: 'email' });
        haptic.success();
        avisarConfirmaTuCorreo();
        return;
      }

      // CB-1, CB-3 y CB-4 aceptados → log de auditoría. Si la sesión todavía
      // no está lista, el servicio los encola en AsyncStorage y se reintentan
      // solos; y si aun así no llegan, el guardia manda a /consentimientos,
      // que hace flush antes de volver a preguntar. Nadie firma dos veces por
      // un fallo de red y nadie entra sin que la fila exista.
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser?.id) await logConsent(newUser.id, [...CONSENTIMIENTOS_DE_PUERTA], 'accepted');
      // T5 HARDENING: funnel core — cuenta creada (sin PII en props).
      analytics.track(ATP_EVENTS.USER_SIGNED_UP, { method: 'email' });

      // PASO 3: el canje, ya con sesión. Aquí sí se consume el código, y el
      // servidor lo hace con SELECT ... FOR UPDATE dentro de una sola
      // transacción: dos personas con el mismo código se serializan y solo
      // una lo gasta. Reintentar es seguro porque el segundo intento de la
      // MISMA persona contesta already_redeemed, que cuenta como aplicado.
      let canje = await redeemActivationCode(codigo);
      if (canje.status === 'network_error' || canje.status === 'not_authenticated') {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        canje = await redeemActivationCode(codigo);
      }
      const aviso = mensajeDeCanjeTrasCuenta(canje.status);
      if (nivelQuedoAplicado(canje.status)) {
        haptic.success();
      } else {
        haptic.error();
        // Se guarda igual: si lo que falló fue la red, el nivel se aplica solo
        // en la próxima entrada y la promesa del aviso se cumple.
        if (canje.status === 'network_error' || canje.status === 'not_authenticated') {
          await guardarCanjePendiente(email.trim(), codigo);
        }
      }
      avisarAltaYSeguir(aviso);
    } finally {
      setLoading(false);
      enviandoRef.current = false;
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
            {/* PIVOTE ELITE (8-sep-2026): la puerta va primero. El texto de
                abajo nombra el código como lo que es, lo que va con el
                servicio contratado, sin hablar de precios ni de dónde se
                compra: no es una vía de pago (Apple 3.1.1). */}
            <EliteInput
              label="CÓDIGO DE ACTIVACIÓN"
              placeholder="ATP-XXXX-XXXX"
              value={codigo}
              onChangeText={(texto) => { setCodigo(texto.toUpperCase()); if (error) setError(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              accentColor={t.tealTexto}
              containerStyle={styles.campoCodigo}
            />
            <EliteText variant="caption" style={styles.ayudaCodigo}>
              Es el código que te dimos con tu servicio contratado. Si no lo encuentras, avísanos y te lo reenviamos.
            </EliteText>

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
  campoCodigo: {
    marginBottom: Spacing.xs,
  },
  ayudaCodigo: {
    alignSelf: 'stretch',
    color: t.textoSecundario,
    lineHeight: 18,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
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
