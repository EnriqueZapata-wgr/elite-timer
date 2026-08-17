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
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArgosOrb } from './ArgosOrb';
import { useArgosPresence } from './ArgosPresenceContext';
import { shouldHideFloatingButton } from './argos-floating-core';
import { screenFromPath } from '@/src/hooks/argos-screen-context-core';
import { openArgosChat } from '@/src/services/argos-nav';
import { ATP_BRAND } from '@/src/constants/brand';

/**
 * OLA0 QW-1: espacio que la orbe ocupa sobre el borde inferior. Las pantallas
 * cuyo contenido interactivo queda bajo la orbe lo suman a su paddingBottom de
 * scroll para poder despejarla.
 *
 * BLOQ-4: valía 96 y NO alcanzaba. La orbe se dibuja con `marginBottom:
 * insets.bottom + 78` y mide 56 de alto, así que su borde SUPERIOR queda a
 * insets.bottom + 134 del fondo de la ventana. Con 96 de colchón, los últimos
 * ~38 px de la orbe seguían cayendo sobre el contenido: bastaba para no tapar
 * texto de relleno, pero un control en el último renglón quedaba igual de
 * pisado. Las ocho pantallas que ya lo sumaban creían estar despejadas y no lo
 * estaban. 140 = 78 + 56 + 6 de respiro.
 *
 * Si el valor de `marginBottom` de la orbe cambia, este número cambia con él.
 */
export const ORB_SAFE_BOTTOM = 140;

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
    openArgosChat({ from });
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
        {/* MB-20 4.4: la orbe es ARGOS en todas partes (avatar retirado). */}
        <ArgosOrb state="idle" size={40} />
      </Pressable>
    </View>
  );
}

export default ArgosFloatingButton;
