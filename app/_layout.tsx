/**
 * Root Layout — Carga de fuentes + Providers + Stack con TODAS las pantallas.
 *
 * Patrón plano: todas las rutas registradas en un solo Stack.
 * La redirección auth/app se maneja en index.tsx con <Redirect>.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
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

export default function RootLayout() {
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={EliteTheme}>
      <AuthProvider>
        <SettingsProvider>
          <ProgramsProvider>
            <SessionsProvider>
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
                <Stack.Screen name="log-exercise" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="personal-records" />
                <Stack.Screen name="progress" />
                <Stack.Screen name="history" />
                <Stack.Screen name="shared-routine" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="meditation" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="breathing" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="checkin" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="my-health" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="mind-hub" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="quiz/chronotype" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="nutrition" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="food-scan" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="protocol-explorer" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="smart-shopping" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="health-input" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="quiz-take" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="quizzes" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="onboarding-basics" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="onboarding-complete" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="journal" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="cycle" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="food-register" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fasting" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="food-text" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
                <Stack.Screen name="fitness-hub" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fitness-strength" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fitness-cardio" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fitness-mobility" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="fitness-hiit" options={{ headerShown: false, animation: 'slide_from_right' }} />
                <Stack.Screen name="log-cardio" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }} />
                <Stack.Screen name="reports" options={{ headerShown: false, animation: 'slide_from_right' }} />
              </Stack>
              <StatusBar style="light" />
            </SessionsProvider>
          </ProgramsProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
