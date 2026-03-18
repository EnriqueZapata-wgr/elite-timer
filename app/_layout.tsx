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

// Mantenemos la splash screen visible mientras cargan las fuentes.
// Sin esto, la app mostraría texto sin estilo por un instante.
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

  // No renderizamos nada hasta que las fuentes estén listas.
  // La splash screen cubre este tiempo en blanco.
  if (!fontsLoaded) {
    return null;
  }

  return (
    // Siempre tema oscuro — ELITE es una app de fondo negro
    <ThemeProvider value={EliteTheme}>
      {/* Stack principal: Splash → Dashboard (tabs) → Timer */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="timer" />
      </Stack>
      {/* light = íconos blancos en la barra de estado sobre fondo negro */}
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
