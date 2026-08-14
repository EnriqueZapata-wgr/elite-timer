/**
 * Root Layout — Carga de fuentes + Providers + Stack con TODAS las pantallas.
 *
 * Patrón plano: todas las rutas registradas en un solo Stack.
 * La redirección auth/app se maneja en index.tsx con <Redirect>.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

import { scrubSentryEvent } from '@/src/lib/sentry-scrub-core';
import { AuthProvider } from '@/src/contexts/auth-context';
import { ProgramsProvider } from '@/src/contexts/programs-context';
import { SessionsProvider } from '@/src/contexts/sessions-context';
import { SettingsProvider } from '@/src/contexts/settings-context';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { LabProcessingProvider } from '@/src/hooks/useLabProcessing';
import { LabProcessingSheet } from '@/src/components/labs/LabProcessingSheet';
import { ProcessingMiniBanner } from '@/src/components/labs/ProcessingMiniBanner';
import { parseResetPasswordUrl, isResetPasswordLink } from '@/src/utils/reset-password-link';
import { RevenueCatSync } from '@/src/components/RevenueCatSync';
import { NightFilterBridge } from '@/src/components/NightFilterBridge';
import { AtpThemeProvider } from '@/src/contexts/theme-context';
import { THEME_DARK } from '@/src/constants/brand';
import { NightVeil } from '@/src/components/theme/NightVeil';
import { NotificationActionsBridge } from '@/src/components/NotificationActionsBridge';
import { WidgetSyncBridge } from '@/src/components/WidgetSyncBridge';
import { ArgosPresenceProvider } from '@/src/components/argos/ArgosPresenceContext';
import { ArgosFloatingButton } from '@/src/components/argos/ArgosFloatingButton';
import { HomeFloatingButton } from '@/src/components/ui/HomeFloatingButton';
import { MeetArgosGate } from '@/src/components/argos/MeetArgosGate';
import { AtpSplash } from '@/src/components/AtpSplash';
import { OnboardingCompletion } from '@/src/components/onboarding/OnboardingCompletion';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDsn,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
  tracesSampleRate: 0.2,
  enabled: !__DEV__,
  // C9-003: a Sentry (EE.UU.) nunca viajan datos de salud, labs, ciclo,
  // mensajes de ARGOS ni email/nombre. Scrubbing determinístico en cliente.
  sendDefaultPii: false,
  beforeSend: (event) => scrubSentryEvent(event),
});

// Mantenemos la splash screen visible mientras cargan las fuentes.
SplashScreen.preventAutoHideAsync();

// Tema oscuro personalizado: fondo negro puro en vez del gris oscuro default.
// Tránsito MB-31B: el contenedor de navegación se queda en el oscuro canónico
// (las pantallas sin migrar lo necesitan); cada pantalla migrada pinta su
// propio fondo desde el tema, así que aquí solo se ve en las transiciones.
const EliteTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: THEME_DARK.fondo,
  },
};

function RootLayout() {
  // Splash cinemático (T2 ONBOARDING épico): overlay que toma el relevo del
  // splash nativo y hace dissolve a la app. Se desmonta una vez por arranque.
  const [splashDone, setSplashDone] = useState(false);
  // Cargamos solo los 4 pesos que usa la app — no los 18 disponibles
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  // Cuando las fuentes terminan de cargar, escondemos la splash screen
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Buscar y aplicar updates OTA al abrir la app
  useEffect(() => {
    if (Platform.OS === 'web') return;
    async function checkUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch { /* silenciar en dev */ }
    }
    checkUpdate();
  }, []);

  // Deep link de reset de contraseña (atp://reset-password#access_token=...&refresh_token=...).
  // Supabase manda los tokens en el fragment; los parseamos y enrutamos a la pantalla con params.
  // Cubre app abierta (addEventListener) y cold start (getInitialURL).
  useEffect(() => {
    function handle(url: string | null) {
      if (!isResetPasswordLink(url)) return;
      const { accessToken, refreshToken } = parseResetPasswordUrl(url);
      if (!accessToken) return;
      router.push({
        pathname: '/reset-password',
        params: { access_token: accessToken, refresh_token: refreshToken ?? '' },
      } as any);
    }
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    Linking.getInitialURL().then(handle).catch(() => { /* sin URL inicial */ });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
    {/* F12/F14/F15/F19/F31: GestureHandlerRootView habilita Swipeable de
        react-native-gesture-handler. Requerido en la raíz. */}
    <GestureHandlerRootView style={{ flex: 1 }}>
    {/* V1.5.1 (#5): KeyboardProvider habilita react-native-keyboard-controller
        (KeyboardAwareScrollView en journal/checkin) — el input enfocado queda
        SIEMPRE visible; los insets nativos no bastaron en device. Dep NATIVA →
        requiere build. */}
    <KeyboardProvider>
    <ThemeProvider value={EliteTheme}>
      <PostHogProvider
        apiKey={Constants.expoConfig?.extra?.posthogKey}
        options={{
          host: 'https://us.i.posthog.com',
          captureAppLifecycleEvents: true,
          // MB-32 P6: grabación de sesión ENCENDIDA con el enmascaramiento
          // más estricto que ofrece el SDK. ATP maneja datos de salud: lo
          // que PostHog puede ver es la ESTRUCTURA de la pantalla, nunca el
          // contenido. Exige posthog-react-native-session-replay (nativo →
          // build) y el toggle de grabación del proyecto en us.posthog.com.
          enableSessionReplay: true,
          sessionReplayConfig: {
            // TODO texto enmascarado — inputs Y <Text> estático (labs,
            // síntomas, journal, chat de ARGOS). Es el default y aquí queda
            // explícito con test de mutación que truena si se apaga.
            maskAllTextInputs: true,
            // Toda imagen a placeholder (fotos de comida, avatares, covers).
            maskAllImages: true,
            // iOS: pickers del sistema (fotos, contactos) enmascarados.
            maskAllSandboxedViews: true,
            // Sin logs en el replay: logWarn lleva contexto del ledger y un
            // console.log de dev puede traer payloads clínicos.
            captureLog: false,
            // Sin telemetría de red: las URLs de supabase llevan nombres de
            // tabla y filtros (user_id, fechas) en el query string.
            captureNetworkTelemetry: false,
          },
        }}
      >
        <AuthProvider>
          {/* Sync invisible: configura RevenueCat y vincula user.id como app_user_id */}
          <RevenueCatSync />
          {/* MB-30B: re-arma el filtro nocturno si quedó encendido (Android) */}
          <NightFilterBridge />
          {/* MB-30B: categorías con botones + despacho de respuestas de aviso */}
          <NotificationActionsBridge />
          {/* MB-32: replay de taps del widget (cola → writers canónicos) +
              limpieza al cerrar sesión */}
          <WidgetSyncBridge />
          {/* MB-31A: el motor de temas (4 modos) + velo nocturno in-app.
              Vive DENTRO de AuthProvider: adaptativo necesita el horario
              real del usuario (despertar + corte de pantallas). */}
          <AtpThemeProvider>
          <SettingsProvider>
            <ProgramsProvider>
              <SessionsProvider>
              <LabProcessingProvider>
              <ArgosPresenceProvider>
              <Stack screenOptions={{
                headerShown: false,
                animation: 'ios_from_right',
                animationDuration: 300,
              }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" options={{ animation: 'fade' }} />
                <Stack.Screen name="register" options={{ animation: 'fade' }} />
                <Stack.Screen name="forgot-password" />
                <Stack.Screen name="reset-password" options={{ animation: 'fade' }} />
                {/* Ola 2 Fitness PR3: /timer era un Stack.Screen fantasma (el
                    archivo no existe) y /session-summary murió huérfano: su
                    EFICIENCIA % vive en el cierre del modo timer de /session. */}
                {/* E-4 (MB-12): programs / create-program / create-routine /
                    standard-programs borradas — duplicaban my-routines/builder
                    con un store AsyncStorage paralelo que nadie leía. */}

                <Stack.Screen name="execution" options={{ animation: 'fade' }} />
                <Stack.Screen name="builder" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="settings" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="settings/legal" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Sprint Compliance 2: documentos legales in-app (staging, placeholder [RAZÓN SOCIAL]) */}
                <Stack.Screen name="legal/aviso" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
                <Stack.Screen name="legal/terminos" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
                {/* #137: sub-pantallas del hub de Ajustes reorganizado */}
                <Stack.Screen name="settings/cuenta" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/salud" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/experiencia" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/conexiones" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/dev" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/privacy" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="settings/notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="argos/conversations" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* MAGIA ARGOS T6: primer contacto cinemático post-onboarding. */}
                <Stack.Screen name="argos/meet" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="afiliados/aplicar" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="afiliados/dashboard" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="afiliados/mi-codigo" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="log-exercise" options={{ animation: 'slide_from_bottom' }} />
                {/* Ola 2 Fitness PR2: registro retro de fuerza (ex log-exercise, adelgazado). */}
                <Stack.Screen name="log-strength" options={{ animation: 'slide_from_bottom' }} />
                {/* MB-19 PIEZA 0: /personal-records y /training-methods eran redirects
                    vacíos de MB-3.6 (a /fitness-strength y /exercise-library). El censo
                    los encontró sin puerta; se borraron con su registro. */}
                <Stack.Screen name="progress" />
                <Stack.Screen name="history" />
                <Stack.Screen name="shared-routine" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="meditation" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="breathing" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="checkin" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="my-health" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="clinical-system" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* #139: /mind-hub legacy eliminado — el hub del pilar es /mente. */}
                {/* Sprint MENTE Ecosystem: hub del pilar + progreso (streaks/medallas) */}
                <Stack.Screen name="mente" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="mente/progreso" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Sprint Audio Mente: player full-screen (portada full-bleed) */}
                <Stack.Screen name="mente/player" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
                {/* N-Back (spec 2026-07-23): módulo cognitivo del pilar Mente */}
                <Stack.Screen name="mente/nback/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="mente/nback/sesion" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="mente/nback/stats" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="mente/nback/como-jugar" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* MB-19 PIEZA 2: /habits-portal se absorbio en la sala ATP. Sus 9
                    destinos son apps del registro; sus cards se retiraron. */}
                <Stack.Screen name="atp-orden" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* MB-22: el Centro ATP — instalador y configurador de apps */}
                <Stack.Screen name="centro/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="centro/[appKey]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="quiz/chronotype" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="nutrition" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="food-scan" options={{ animation: 'slide_from_bottom' }} />
                {/* OLA3: /food-log es la captura unificada (foto | texto | código).
                    Hereda el "desde abajo" que traía el registro por texto. */}
                <Stack.Screen name="food-log" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="protocol-explorer" options={{ animation: 'slide_from_right' }} />
                {/* E-4 (MB-12): smart-shopping borrada (27 líneas, un EmptyState) */}
                {/* Sprint NUTRICIÓN T5: lista de compra desde mis recetas */}
                <Stack.Screen name="lista-compra" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* OLA3: /cocina = recetas + lista + preferencias en 3 pestañas */}
                <Stack.Screen name="cocina" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="health-input" options={{ animation: 'slide_from_right' }} />
                {/* Sprint LABS GUÍA: guía descargable "¿qué labs me hago?" */}
                <Stack.Screen name="labs-guide" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="quiz-take" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* #67 p5b: cuestionarios Historia Clínica (cherry-pick 7570251) */}
                <Stack.Screen name="historia-clinica/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="historia-clinica/[category]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="quizzes" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="braverman" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* #90: reporte premium ARGOS del Braverman */}
                <Stack.Screen name="braverman-premium" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Onboarding v2 (F2 sprint UX blockers) — motor v1 eliminado */}
                <Stack.Screen name="onboarding/v2/welcome" options={{ headerShown: false, animation: 'fade' }} />
                {/* Sprint Compliance 4: posicionamiento "optimizar sanos" antes del consentimiento */}
                <Stack.Screen name="onboarding/v2/positioning" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Sprint Compliance 2: muro de consentimiento (Aviso Parte 3) antes de capturar datos */}
                <Stack.Screen name="onboarding/v2/privacy" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="onboarding/v2/profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="onboarding/v2/goal" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="onboarding/v2/cycle" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="onboarding/v2/chronotype" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="onboarding/v2/consent" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="onboarding/v2/notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Standalone: config de voz ARGOS (backfill founders + re-configuración) */}
                <Stack.Screen name="onboarding/voice-config" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="journal" options={{ animation: 'slide_from_right' }} />
                {/* #39: historial dedicado del journal */}
                <Stack.Screen name="journal-history" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="cycle" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="cycle-charts" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="cycle-history" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="cycle-settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="food-register" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fasting" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="glucose-log" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="food-preferences" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="food-text" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
                <Stack.Screen name="fitness-hub" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fitness-strength" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fitness-cardio" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fitness-hiit" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* MB-3: generador determinista + biblioteca matriceada + runner de sesión */}
                <Stack.Screen name="routine-generator" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="exercise-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Ola 2 Fitness PR1: /session es el runner unificado; strength-session queda como alias permanente. */}
                <Stack.Screen name="session" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="strength-session" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="log-cardio" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
                <Stack.Screen name="reports" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Batch 2 (#15/#8): pantalla propia de Sueño + vista Mi Cronotipo */}
                <Stack.Screen name="sleep" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* MB-30A: sesión nocturna — sin gesto de regreso (una manga dormida no debe matar la alarma) */}
                <Stack.Screen name="sleep-session" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="my-chronotype" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* MB-30B: filtro nocturno de sistema (Android overlay / guía iOS) */}
                <Stack.Screen name="night-filter" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Suscripciones RevenueCat (sprint IAP V1.3) */}
                <Stack.Screen name="paywall" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="settings/subscription" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* MB-13: canje de códigos de activación (puente de pago) */}
                <Stack.Screen name="redeem-code" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                {/* Economía Protones H+ (feature gated; pantallas accesibles para QA) */}
                <Stack.Screen name="economy/admin" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="economy/shop" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="economy/convert" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="economy/history" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="economy/how-to-earn" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              </Stack>
              {/* Capa 8 — UX async: sheet + banner globales del procesamiento de labs. */}
              <LabProcessingSheet />
              <ProcessingMiniBanner />
              {/* MAGIA ARGOS T2: acceso flotante cross-app (auto-hide contextual). */}
              <ArgosFloatingButton />
              {/* #26 Batch 2: Home en un tap desde pantallas profundas (bottom-left). */}
              <HomeFloatingButton />
              {/* MAGIA 2.0 T3: Meet ARGOS para usuarios existentes con flag NULL
                  (antes solo se alcanzaba al terminar onboarding v2). */}
              <MeetArgosGate />
              {/* T5 ONBOARDING épico: celebración al aterrizar en HOY tras Meet ARGOS. */}
              <OnboardingCompletion />
              {/* MB-31A: el velo nocturno in-app — encima de la UI, debajo
                  del splash. Capa sin toque; entibia el tema que haya. */}
              <NightVeil />
              {/* T2 ONBOARDING épico: splash cinemático sobre todo lo demás. */}
              {!splashDone && <AtpSplash onFinish={() => setSplashDone(true)} />}
              {/* Tránsito MB-31A: la barra de estado global sigue clara
                  (las pantallas sin migrar son oscuras); cada pantalla
                  <ThemeReady> pone la suya según el tema. */}
              <StatusBar style="light" />
              </ArgosPresenceProvider>
              </LabProcessingProvider>
              </SessionsProvider>
            </ProgramsProvider>
          </SettingsProvider>
          </AtpThemeProvider>
        </AuthProvider>
      </PostHogProvider>
    </ThemeProvider>
    </KeyboardProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
