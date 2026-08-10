/**
 * TabScreen — Wrapper estandar para las 3 pantallas raiz de tabs (index/yo/kit).
 *
 * Aplica:
 *   - flex 1
 *   - backgroundColor: fondo del tema (oscuro mientras la pantalla no migre)
 *   - paddingTop: insets.top (para evitar el notch)
 *
 * Las tabs no usan PillarHeader/ScreenHeader — tienen su propio top bar
 * inline, asi que necesitan manejar el inset directamente.
 *
 * MB-31A: `themed` = la pantalla ya migró sus colores (ver Screen.tsx).
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeReady, useAppTheme, useSurfaceTokens } from '@/src/contexts/theme-context';
import { TopBannerPersistent } from '@/src/components/layout/TopBannerPersistent';

interface TabScreenProps {
  children: ReactNode;
  /** MB-31A: esta pantalla ya migró sus colores y sigue el tema global. */
  themed?: boolean;
}

export function TabScreen({ children, themed = false }: TabScreenProps) {
  const insets = useSafeAreaInsets();
  const global = useAppTheme().tokens;
  const scoped = useSurfaceTokens();
  const fondo = (themed ? global : scoped).fondo;

  const inner = (
    <>
      {/* #v13c 2.6: banner persistente (Home + E-/H+/Rank) en las tabs que usan TabScreen (YO, MI ATP). */}
      <TopBannerPersistent />
      {children}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: fondo }]}>
      {themed ? <ThemeReady>{inner}</ThemeReady> : inner}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
