/**
 * Screen — Wrapper estandar para pantallas hijas (las que no son tabs).
 *
 * Aplica:
 *   - flex 1
 *   - backgroundColor: fondo del tema (oscuro mientras la pantalla no migre)
 *   - SafeAreaView con edges configurables (default: ['top'])
 *
 * Cuando usar:
 *   - Pantallas con <PillarHeader>: <Screen>...</Screen>  (default edges=['top'])
 *   - Pantallas con <ScreenHeader>: <Screen edges={[]}>...</Screen>
 *     (porque ScreenHeader ya hace su propio paddingTop:insets.top)
 *   - Modales bottom-sheet: <Screen edges={['bottom']}>...</Screen>
 *
 * MB-31A: `themed` declara que la pantalla YA migró sus colores a tokens y
 * puede recibir el modo claro — pinta el fondo con el tema global y envuelve
 * a los hijos en <ThemeReady> para que el kit compartido lo siga. Sin el
 * prop, la pantalla recibe el oscuro de siempre (regla de tránsito MB-31B).
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { ThemeReady, useAppTheme, useSurfaceTokens } from '@/src/contexts/theme-context';

interface ScreenProps {
  children: ReactNode;
  edges?: readonly Edge[];
  /**
   * KEY-1 (MB-0): pantallas con inputs en la parte baja — el contenido se
   * desplaza con la curva nativa del teclado en vez de quedar tapado.
   * iOS: behavior 'padding' (animación interrumpible del sistema).
   * Android: no-op — softwareKeyboardLayoutMode 'resize' ya redimensiona.
   * El blindaje definitivo (react-native-keyboard-controller) entra en el
   * build único post-MB-1 (spike e) sin cambiar esta API.
   */
  keyboard?: boolean;
  /** MB-31A: esta pantalla ya migró sus colores y sigue el tema global. */
  themed?: boolean;
}

export function Screen({ children, edges = ['top'], keyboard = false, themed = false }: ScreenProps) {
  const global = useAppTheme().tokens;
  const scoped = useSurfaceTokens();
  const fondo = (themed ? global : scoped).fondo;

  const inner = keyboard ? (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  ) : children;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: fondo }]} edges={edges}>
      {themed ? <ThemeReady>{inner}</ThemeReady> : inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
