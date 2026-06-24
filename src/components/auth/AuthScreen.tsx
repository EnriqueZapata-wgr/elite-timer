/**
 * AuthScreen — contenedor compartido de las pantallas de auth (login/register/forgot/reset).
 * Igual que ScreenContainer pero con un gradient vertical SUTIL (#0A0E14 → #000) que descansa
 * la vista sin romper la marca (patrón Whoop/Oura). Mantiene safe-area + padding + StatusBar.
 */
import { type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing } from '@/constants/theme';

interface AuthScreenProps {
  children: ReactNode;
  centered?: boolean;
  style?: ViewStyle;
}

/** Gradient casi imperceptible: arriba un azul-petróleo muy oscuro, abajo negro puro. */
const AUTH_GRADIENT = ['#0A0E14', '#000000'] as const;

export function AuthScreen({ children, centered = false, style }: AuthScreenProps) {
  return (
    <LinearGradient colors={AUTH_GRADIENT} style={styles.fill}>
      <StatusBar style="light" />
      <SafeAreaView style={[styles.container, centered && styles.centered, style]}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  centered: { alignItems: 'center', justifyContent: 'center' },
});
