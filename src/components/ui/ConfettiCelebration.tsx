/**
 * ConfettiCelebration — 30 partículas animadas con caída, rotación y fade.
 * Colores: gradiente ATP (lima → teal) + nutrición + mind.
 * Duración: 2.5 segundos.
 */
import { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Colors } from '@/constants/theme';
import { ATP_BRAND, CATEGORY_COLORS } from '@/src/constants/brand';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const confettiColors = [ATP_BRAND.lime, ATP_BRAND.green1, ATP_BRAND.green2, ATP_BRAND.teal1, ATP_BRAND.teal2, CATEGORY_COLORS.nutrition, CATEGORY_COLORS.mind];
const PARTICLE_COUNT = 30;
const TOTAL_DURATION = 2500;

interface Props {
  visible: boolean;
  onDone?: () => void;
}

function Particle({ index, onDone }: { index: number; onDone?: () => void }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const startX = Math.random() * 120 - 60;
  const left = 5 + Math.random() * 90;
  const delay = Math.random() * 500;
  const duration = 1800 + Math.random() * 700;
  const size = 5 + Math.random() * 8;
  const isSquare = Math.random() > 0.5;

  useEffect(() => {
    translateX.value = startX;
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 50, { duration, easing: Easing.in(Easing.quad) })
    );
    rotate.value = withDelay(
      delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random()), { duration })
    );
    opacity.value = withDelay(
      delay + duration * 0.6,
      withTiming(0, { duration: duration * 0.4 }, () => {
        if (index === 0 && onDone) runOnJS(onDone)();
      })
    );
    scale.value = withDelay(delay, withTiming(0.2, { duration }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[
      {
        position: 'absolute',
        left: `${left}%`,
        top: 0,
        width: size,
        height: isSquare ? size : size * 0.4,
        borderRadius: isSquare ? size / 2 : size * 0.2,
        backgroundColor: confettiColors[index % confettiColors.length],
      },
      animStyle,
    ]} />
  );
}

export function ConfettiCelebration({ visible, onDone }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} index={i} onDone={i === 0 ? onDone : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    overflow: 'hidden',
  },
});
