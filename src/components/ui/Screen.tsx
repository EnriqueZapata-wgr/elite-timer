/**
 * Screen — Wrapper estandar para pantallas hijas (las que no son tabs).
 *
 * Aplica:
 *   - flex 1
 *   - backgroundColor: BG.screen
 *   - SafeAreaView con edges configurables (default: ['top'])
 *
 * Cuando usar:
 *   - Pantallas con <PillarHeader>: <Screen>...</Screen>  (default edges=['top'])
 *   - Pantallas con <ScreenHeader>: <Screen edges={[]}>...</Screen>
 *     (porque ScreenHeader ya hace su propio paddingTop:insets.top)
 *   - Modales bottom-sheet: <Screen edges={['bottom']}>...</Screen>
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { BG } from '@/src/constants/brand';

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
}

export function Screen({ children, edges = ['top'], keyboard = false }: ScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={edges}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {children}
        </KeyboardAvoidingView>
      ) : children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG.screen,
  },
});
