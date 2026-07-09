/**
 * ArgosFloatingButton — acceso flotante a ARGOS cross-app (T2 Sprint MAGIA ARGOS).
 *
 * Aparece bottom-right en todas las pantallas menos donde estorba (chat ARGOS,
 * onboarding, teclado abierto — ver argos-floating-core). Al tap abre el chat
 * pasando la pantalla de origen como contexto (?from=…, consumido en T4).
 *
 * Se monta UNA vez en el layout raíz (hermano del Stack, como los overlays de
 * labs). No intrusivo: respeta safe areas y se auto-oculta.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArgosAvatar } from './ArgosAvatar';
import { useArgosPresence } from './ArgosPresenceContext';
import { shouldHideFloatingButton } from './argos-floating-core';
import { screenFromPath } from '@/src/hooks/argos-screen-context-core';
import { ATP_BRAND } from '@/src/constants/brand';

export function ArgosFloatingButton() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { hidden, introduced } = useArgosPresence();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const hide = shouldHideFloatingButton({
    pathname,
    keyboardVisible,
    manualHidden: hidden,
    introduced,
  });
  if (hide) return null;

  const from = screenFromPath(pathname);

  function openArgos() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/argos-chat?from=${from}` as any);
  }

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'flex-end' }]}
    >
      <Pressable
        onPress={openArgos}
        accessibilityRole="button"
        accessibilityLabel="Abrir ARGOS"
        hitSlop={8}
        style={({ pressed }) => ({
          marginRight: 18,
          marginBottom: insets.bottom + 78, // por encima de la tab bar
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#0A0A0A',
          borderWidth: 1,
          borderColor: `${ATP_BRAND.lime}55`,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          // Halo lima sutil (patrón GLOW.accent de brand.ts)
          shadowColor: ATP_BRAND.lime,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
        })}
      >
        <ArgosAvatar state="idle" size={40} />
      </Pressable>
    </View>
  );
}

export default ArgosFloatingButton;
