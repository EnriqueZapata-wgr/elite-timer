/**
 * HomeChip (V1.5.1 #8) — casita fija en el header, mismo vocabulario glass que
 * el chip del StickyPillarBanner (Mente). Los headers estándar la montan para
 * que TODAS las pantallas tengan Home arriba sin depender del flotante.
 */
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { HomeIcon } from './HomeIcon';
import { haptic } from '@/src/utils/haptics';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export function HomeChip({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const t = useSurfaceTokens(); // MB-31A: glass oscuro de siempre / glass claro
  const glass = t.kind === 'dark'
    ? { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.15)' }
    : { backgroundColor: 'rgba(15,21,24,0.06)', borderColor: 'rgba(15,21,24,0.14)' };
  return (
    <Pressable
      // I17 (V1.5): dismissTo desapila hasta los tabs YA montados — navigate
      // podía pushear un (tabs) nuevo y HOY remontaba con loader.
      onPress={() => { haptic.light(); router.dismissTo('/(tabs)'); }}
      accessibilityRole="button"
      accessibilityLabel="Volver a HOY"
      hitSlop={8}
      style={({ pressed }) => [s.chip, glass, pressed && s.pressed, style]}
    >
      <HomeIcon size={18} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.94 }] },
});

export default HomeChip;
