/**
 * ConfettiCelebration — Partículas animadas para celebrar PRs.
 * 20 partículas con caída + rotación + fade.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const COLORS = ['#a8e02a', '#FFD700', '#a8e02a', '#FFD700', '#a8e02a'];
const PARTICLE_COUNT = 20;

interface Props {
  visible: boolean;
  onDone?: () => void;
}

function Particle({ index, onDone }: { index: number; onDone?: () => void }) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const startX = Math.random() * 100 - 50; // -50 to 50%
  const left = 10 + Math.random() * 80; // 10% to 90%
  const delay = Math.random() * 400;
  const duration = 1500 + Math.random() * 800;
  const size = 6 + Math.random() * 6;

  useEffect(() => {
    translateX.value = startX;
    translateY.value = withDelay(delay, withTiming(600, { duration, easing: Easing.in(Easing.quad) }));
    rotate.value = withDelay(delay, withTiming(360 * (Math.random() > 0.5 ? 1 : -1), { duration }));
    opacity.value = withDelay(delay + duration * 0.6, withTiming(0, { duration: duration * 0.4 }, () => {
      if (index === 0 && onDone) runOnJS(onDone)();
    }));
    scale.value = withDelay(delay, withTiming(0.3, { duration }));
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
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS[index % COLORS.length],
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
