/**
 * StickyPillarBanner (Overhaul Mente A3) — banner superior FIJO de las
 * pantallas de pilar: back + home + electrones, con blur (glassmorphism) que
 * aparece encima del contenido al scrollear.
 *
 * Reemplaza a los botones flotantes (home + ARGOS) dentro del pilar — esos se
 * auto-ocultan vía isMentePillarPath (argos-floating-core / home-floating-core).
 *
 * Uso: pantalla con el banner absoluto arriba y el ScrollView debajo SIN
 * paddingTop (el hero editorial pasa por debajo del banner transparente):
 *
 *   const [scrolled, setScrolled] = useState(false);
 *   <StickyPillarBanner scrolled={scrolled} />
 *   <ScrollView
 *     onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
 *     scrollEventThrottle={16}
 *   >…</ScrollView>
 *
 * expo-blur ya está en el binario actual (lo usan HOY y food-scan) — cero
 * dependencia nativa nueva. En Android sin blur real la capa degrada a un tint
 * oscuro translúcido (mismo fail-soft que el resto de la app).
 */
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ElectronBadge } from '@/src/components/ui/ElectronBadge';
import { haptic } from '@/src/utils/haptics';
import { Spacing } from '@/constants/theme';

interface Props {
  /** true cuando el scroll pasó el umbral → aparece la capa blur. */
  scrolled: boolean;
  /** Back custom (default: router.back()). */
  onBack?: () => void;
  /** Ocultar el back (ej. si la pantalla no tiene a dónde volver). */
  hideBack?: boolean;
  /** Acción extra a la derecha, antes de los electrones (ej. trofeo Progreso). */
  rightExtra?: ReactNode;
}

export function StickyPillarBanner({ scrolled, onBack, hideBack, rightExtra }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const blur = useSharedValue(0);

  useEffect(() => {
    blur.value = withTiming(scrolled ? 1 : 0, { duration: 180 });
  }, [scrolled, blur]);

  const blurStyle = useAnimatedStyle(() => ({ opacity: blur.value }));

  return (
    <View style={[s.wrap, { paddingTop: insets.top }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, blurStyle]} pointerEvents="none">
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={s.tint} />
      </Animated.View>

      <View style={s.row}>
        {!hideBack && (
          <Pressable
            onPress={() => { haptic.light(); if (onBack) onBack(); else router.back(); }}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={8}
            style={({ pressed }) => [s.chip, pressed && s.pressed]}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
        )}
        <Pressable
          onPress={() => { haptic.light(); router.navigate('/(tabs)'); }}
          accessibilityRole="button"
          accessibilityLabel="Volver a HOY"
          hitSlop={8}
          style={({ pressed }) => [s.chip, pressed && s.pressed]}
        >
          <Ionicons name="home-outline" size={18} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }} />
        {rightExtra}
        <ElectronBadge />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  chip: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.94 }] },
});

export default StickyPillarBanner;
