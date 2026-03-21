/**
 * Root Layout — Carga de fuentes + Providers + Stack con TODAS las pantallas.
 *
 * Patrón plano: todas las rutas registradas en un solo Stack.
 * La redirección auth/app se maneja en index.tsx con <Redirect>.
 */
import { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

import { AuthProvider } from '@/src/contexts/auth-context';
import { ProgramsProvider } from '@/contexts/programs-context';
import { SessionsProvider } from '@/contexts/sessions-context';
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={EliteTheme}>
      <AuthProvider>
        <SettingsProvider>
          <ProgramsProvider>
            <SessionsProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="forgot-password" />
                <Stack.Screen name="timer" />
                <Stack.Screen name="programs" />
                <Stack.Screen name="create-program" />
                <Stack.Screen name="create-routine" />
                <Stack.Screen name="standard-programs" />
                <Stack.Screen name="active-timer" />
                <Stack.Screen name="session-summary" />
                <Stack.Screen name="execution" />
                <Stack.Screen name="builder" />
                <Stack.Screen name="settings" />
              </Stack>
              <StatusBar style="light" />
            </SessionsProvider>
          </ProgramsProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
