import { type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing } from '@/constants/theme';

interface ScreenContainerProps {
  /** Contenido de la pantalla */
  children: ReactNode;
  /** Centra el contenido vertical y horizontalmente (default: true) */
  centered?: boolean;
  /** Estilos adicionales */
  style?: ViewStyle;
}

/**
 * ScreenContainer — Contenedor base para todas las pantallas ELITE.
 *
 * Incluye:
 * - SafeAreaView con fondo negro
 * - StatusBar con íconos claros (para fondo oscuro)
 * - Padding horizontal estándar
 * - Opción de centrar contenido
 *
 * Ejemplo:
 *   <ScreenContainer>
 *     <EliteText variant="title">MI PANTALLA</EliteText>
 *   </ScreenContainer>
 */
export function ScreenContainer({
  children,
  centered = true,
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView
      style={[
        styles.container,
        centered && styles.centered,
        style,
      ]}
    >
      {/* Íconos blancos en la barra de estado — siempre, porque el fondo es negro */}
      <StatusBar style="light" />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Fondo negro, ocupa toda la pantalla, padding lateral
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.md,
  },
  // Centrado vertical y horizontal — útil para pantallas como el timer
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
