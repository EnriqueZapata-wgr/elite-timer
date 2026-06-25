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
import { TopBannerPersistent } from '@/src/components/layout/TopBannerPersistent';

interface TabScreenProps {
  children: ReactNode;
}

export function TabScreen({ children }: TabScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* #v13c 2.6: banner persistente (Home + E-/H+/Rank) en las tabs que usan TabScreen (YO, MI ATP). */}
      <TopBannerPersistent />
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
