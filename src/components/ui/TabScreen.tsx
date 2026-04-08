/**
 * TabScreen — Wrapper estandar para las 3 pantallas raiz de tabs (index/yo/kit).
 *
 * Aplica:
 *   - flex 1
 *   - backgroundColor: BG.screen
 *   - paddingTop: insets.top (para evitar el notch)
 *
 * Las tabs no usan PillarHeader/ScreenHeader — tienen su propio top bar
 * inline, asi que necesitan manejar el inset directamente.
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG } from '@/src/constants/brand';

interface TabScreenProps {
  children: ReactNode;
}

export function TabScreen({ children }: TabScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG.screen,
  },
});
