/**
 * HomeChip (V1.5.1 #8) — casita fija en el header, mismo vocabulario glass que
 * el chip del StickyPillarBanner (Mente). Los headers estándar la montan para
 * que TODAS las pantallas tengan Home arriba sin depender del flotante.
 */
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/src/utils/haptics';

export function HomeChip({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  return (
    <Pressable
      // I17 (V1.5): dismissTo desapila hasta los tabs YA montados — navigate
      // podía pushear un (tabs) nuevo y HOY remontaba con loader.
      onPress={() => { haptic.light(); router.dismissTo('/(tabs)'); }}
      accessibilityRole="button"
      accessibilityLabel="Volver a HOY"
      hitSlop={8}
      style={({ pressed }) => [s.chip, pressed && s.pressed, style]}
    >
      <Ionicons name="home-outline" size={18} color="#fff" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.94 }] },
});

export default HomeChip;
