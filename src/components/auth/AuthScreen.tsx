/**
 * AuthScreen — contenedor compartido de las pantallas de auth (login/register/forgot/reset).
 * Igual que ScreenContainer pero con un gradient vertical SUTIL que descansa la
 * vista sin romper la marca (patrón Whoop/Oura). Mantiene safe-area + padding + StatusBar.
 *
 * BLOQ-3: dejó de ser una frontera oscura fija. El gradiente sale de los tokens
 * del tema y el contenedor abre <ThemeReady>, que es lo que hace que EliteInput
 * y EliteButton (kit compartido, leen `useSurfaceTokens`) se vuelvan claros aquí
 * dentro. Con AUTH_RESPETA_EL_TEMA en false no se monta el scope y todo vuelve
 * al oscuro de siempre, byte por byte: el kit sin ThemeReady recibe THEME_DARK.
 *
 * El StatusBar viaja con el fondo. Si se tematiza el gradiente y no la barra,
 * la hora del sistema queda negra sobre negro (o blanca sobre claro), que es
 * exactamente el defecto que la auditoría encontró en otras pantallas.
 */
import { type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing } from '@/constants/theme';
import { ThemeReady } from '@/src/contexts/theme-context';
import { AUTH_RESPETA_EL_TEMA } from '@/src/constants/flags';
import { useAuthTheme } from './auth-theme';

interface AuthScreenProps {
  children: ReactNode;
  centered?: boolean;
  style?: ViewStyle;
}

/** Gradient casi imperceptible: arriba un azul-petróleo muy oscuro, abajo negro puro. */
const AUTH_GRADIENT_OSCURO = ['#0A0E14', '#000000'] as const;

export function AuthScreen({ children, centered = false, style }: AuthScreenProps) {
  const t = useAuthTheme();
  const claro = t.kind === 'light';
  // En claro el gradiente conserva la MISMA intención: se va aclarando hacia
  // arriba y asienta abajo. Con acero, `flotante` arriba y `fondo` abajo.
  const colores = claro ? ([t.flotante, t.fondo] as const) : AUTH_GRADIENT_OSCURO;

  const cuerpo = (
    <SafeAreaView style={[styles.container, centered && styles.centered, style]}>
      {children}
    </SafeAreaView>
  );

  return (
    <LinearGradient colors={colores} style={styles.fill}>
      <StatusBar style={claro ? 'dark' : 'light'} />
      {AUTH_RESPETA_EL_TEMA ? <ThemeReady>{cuerpo}</ThemeReady> : cuerpo}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  centered: { alignItems: 'center', justifyContent: 'center' },
});
