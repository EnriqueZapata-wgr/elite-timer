/**
 * useColchonOrbe (20-sep-2026): cuánto paddingBottom necesita el scroll de
 * ESTA ruta para que su último renglón no quede debajo de la orbe de ARGOS.
 * Cero donde la orbe no se pinta.
 *
 * <Screen> ya lo aplica solo a su scroll hijo directo. Este hook es para las
 * pantallas que no usan <Screen> o cuyo scroll vive más adentro (dentro de un
 * View o de un componente propio):
 *
 *   const colchon = useColchonOrbe();
 *   <ScrollView contentContainerStyle={{ paddingBottom: paddingBottomConColchon(40, colchon) }} />
 *
 * La lógica es pura y vive en argos-floating-core.ts (con su test).
 */
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useArgosPresence } from './ArgosPresenceContext';
import { colchonOrbe } from './argos-floating-core';

/**
 * @param bordeInferiorSeguro true si el contenedor ya respeta el inset inferior
 * (SafeAreaView con 'bottom' en edges); entonces el inset no se suma dos veces.
 */
export function useColchonOrbe(bordeInferiorSeguro = false): number {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { hidden, introduced } = useArgosPresence();
  return colchonOrbe({
    pathname,
    manualHidden: hidden,
    introduced,
    insetBottom: insets.bottom,
    bordeInferiorSeguro,
  });
}
