/**
 * HomeFloatingButton (#26 Batch 2) — volver a HOY en UN tap desde cualquier
 * pantalla profunda del Stack. Espejo del patrón ArgosFloatingButton (montado
 * una vez en el layout raíz, auto-hide contextual vía home-floating-core).
 * Bottom-LEFT: ARGOS ocupa bottom-right — no se enciman.
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
    // navigate (no push): vuelve al tab HOY sin apilar otra instancia.
    router.navigate('/(tabs)');
  }

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'flex-start' }]}
    >
      <Pressable
        onPress={goHome}
        accessibilityRole="button"
        accessibilityLabel="Volver a HOY"
        hitSlop={8}
        style={({ pressed }) => ({
          marginLeft: 18,
          marginBottom: insets.bottom + 78, // mismo offset sobre la tab bar que ARGOS
          width: 48,
          height: 48,
          borderRadius: 24,
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
        <Ionicons name="flash" size={22} color={ATP_BRAND.lime} />
      </Pressable>
    </View>
  );
}

export default HomeFloatingButton;
