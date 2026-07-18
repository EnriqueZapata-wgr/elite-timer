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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { shouldHideHomeButton } from './home-floating-core';
import { ATP_BRAND } from '@/src/constants/brand';

export function HomeFloatingButton() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  if (shouldHideHomeButton({ pathname, keyboardVisible })) return null;

  function goHome() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // navigate (no push/replace): vuelve al tab HOY sin apilar otra instancia
    // ni remontar el árbol (HOME-1: replace reiniciaba la app).
    router.navigate('/(tabs)');
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
          backgroundColor: '#0A0A0A',
          borderWidth: 1,
          borderColor: `${ATP_BRAND.lime}55`,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          shadowColor: ATP_BRAND.lime,
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
        })}
      >
        <Ionicons name="home" size={20} color={ATP_BRAND.lime} />
      </Pressable>
    </View>
  );
}

export default HomeFloatingButton;
