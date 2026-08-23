/**
 * HomeFloatingButton (#26 Batch 2 · rework HOME-1 MB-0) — volver a HOY en UN
 * tap desde cualquier pantalla. Montado una vez en el layout raíz, auto-hide
 * contextual vía home-floating-core (solo se oculta en HOY + funnel).
 * ARRIBA-IZQUIERDA, justo bajo la línea de header para no tapar el BackButton
 * que los headers pintan en la esquina. Casita sin letras, acento ATP.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SURFACES } from '@/src/constants/brand';
import { shouldHideHomeButton } from './home-floating-core';
import { useHasOwnNav } from './useOwnNavPresence';
import { HomeIcon } from './HomeIcon';

export function HomeFloatingButton() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // V1.5.1 (#8): headers estándar traen casita propia → el flotante se oculta.
  const screenHasOwnNav = useHasOwnNav();

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  if (shouldHideHomeButton({ pathname, keyboardVisible, screenHasOwnNav })) return null;

  function goHome() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // I17 (V1.5): dismissTo desapila hasta los tabs YA montados sin remontar.
    // navigate (intento HOME-1) podía no matchear el entry del historial y
    // pushear un (tabs) nuevo → HOY remontaba con loader ("se reinició").
    router.dismissTo('/(tabs)');
  }

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-start', alignItems: 'flex-start' }]}
    >
      <Pressable
        onPress={goHome}
        accessibilityRole="button"
        accessibilityLabel="Volver a HOY"
        hitSlop={10}
        style={({ pressed }) => ({
          marginLeft: 14,
          // Bajo la línea del header (~48px): arriba-izquierda sin tapar el BackButton.
          marginTop: insets.top + 52,
          width: 44,
          height: 44,
          borderRadius: 22,
          // ACERO: mismo caso que la orbe de ARGOS. El '#0A0A0A' a mano quedaba
          // más oscuro que el lienzo de acero y la casita se hundía en vez de
          // flotar. `SURFACES.base` es el escalón de chrome, que es justo lo
          // que este botón es: algo que flota sobre la pantalla.
          backgroundColor: SURFACES.base,
          borderWidth: 1,
          // 19.1 (1.2): la casita deja el lima — es acento y aquí no hay dato
          // heroico. Mismo vocabulario glass que HomeChip.
          borderColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
        })}
      >
        <HomeIcon size={20} />
      </Pressable>
    </View>
  );
}

export default HomeFloatingButton;
