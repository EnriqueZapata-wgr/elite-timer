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
import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { BG } from '@/src/constants/brand';

interface ScreenProps {
  children: ReactNode;
  edges?: readonly Edge[];
}

export function Screen({ children, edges = ['top'] }: ScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG.screen,
  },
});
