/**
 * Root Layout — Carga de fuentes + Providers + Stack con TODAS las pantallas.
 *
 * Patrón plano: todas las rutas registradas en un solo Stack.
 * La redirección auth/app se maneja en index.tsx con <Redirect>.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { useEffect } from 'react';
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
import 'react-native-reanimated';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

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
import { ArgosPresenceProvider } from '@/src/components/argos/ArgosPresenceContext';
import { ArgosFloatingButton } from '@/src/components/argos/ArgosFloatingButton';
import { MeetArgosGate } from '@/src/components/argos/MeetArgosGate';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDsn,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
  tracesSampleRate: 0.2,
  enabled: !__DEV__,
});

// Mantenemos la splash screen visible mientras cargan las fuentes.
SplashScreen.preventAutoHideAsync();

// Tema oscuro personalizado: fondo negro puro (#000) en vez del gris oscuro default
const EliteTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
  },
};

function RootLayout() {
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
    <ThemeProvider value={EliteTheme}>
      <PostHogProvider
        apiKey={Constants.expoConfig?.extra?.posthogKey}
        options={{
          host: 'https://us.i.posthog.com',
          captureAppLifecycleEvents: true,
          enableSessionReplay: false,
        }}
      >
        <AuthProvider>
          {/* Sync invisible: configura RevenueCat y vincula user.id como app_user_id */}
          <RevenueCatSync />
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
                <Stack.Screen name="timer" />
                <Stack.Screen name="programs" />
                <Stack.Screen name="create-program" />
                <Stack.Screen name="create-routine" />
                <Stack.Screen name="standard-programs" />

                <Stack.Screen name="session-summary" />
                <Stack.Screen name="execution" options={{ animation: 'fade' }} />
                <Stack.Screen name="routine-execution" options={{ animation: 'fade' }} />
                <Stack.Screen name="builder" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="settings" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="settings/legal" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
                <Stack.Screen name="personal-records" />
                <Stack.Screen name="progress" />
                <Stack.Screen name="history" />
                <Stack.Screen name="shared-routine" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="meditation" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="breathing" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="checkin" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="my-health" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="clinical-system" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="mind-hub" options={{ animation: 'slide_from_right' }} />
                {/* Sprint MENTE Ecosystem: hub del pilar + progreso (streaks/medallas) */}
                <Stack.Screen name="mente" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="mente/progreso" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="habits-portal" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="quiz/chronotype" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="nutrition" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="food-scan" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="protocol-explorer" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="smart-shopping" options={{ animation: 'slide_from_right' }} />
                {/* Sprint NUTRICIÓN T5: lista de compra desde mis recetas */}
                <Stack.Screen name="lista-compra" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="health-input" options={{ animation: 'slide_from_right' }} />
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
                <Stack.Screen name="fitness-mobility" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fitness-hiit" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="log-cardio" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
                <Stack.Screen name="reports" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Suscripciones RevenueCat (sprint IAP V1.3) */}
                <Stack.Screen name="paywall" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="settings/subscription" options={{ headerShown: false, animation: 'slide_from_right' }} />
                {/* Economía Protones H+ (feature gated; pantallas accesibles para QA) */}
                <Stack.Screen name="economy/admin" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="economy/shop" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="economy/convert" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="economy/history" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="economy/how-to-earn" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="economy/challenges" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="economy/referrals" options={{ headerShown: false, animation: 'slide_from_right' }} />
              </Stack>
              {/* Capa 8 — UX async: sheet + banner globales del procesamiento de labs. */}
              <LabProcessingSheet />
              <ProcessingMiniBanner />
              {/* MAGIA ARGOS T2: acceso flotante cross-app (auto-hide contextual). */}
              <ArgosFloatingButton />
              {/* MAGIA 2.0 T3: Meet ARGOS para usuarios existentes con flag NULL
                  (antes solo se alcanzaba al terminar onboarding v2). */}
              <MeetArgosGate />
              <StatusBar style="light" />
              </ArgosPresenceProvider>
              </LabProcessingProvider>
              </SessionsProvider>
            </ProgramsProvider>
          </SettingsProvider>
        </AuthProvider>
      </PostHogProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
