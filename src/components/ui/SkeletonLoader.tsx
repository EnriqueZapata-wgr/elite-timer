/**
 * SkeletonLoader — Loading state elegante con shimmer/pulse.
 */
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { SURFACES } from '@/src/constants/brand';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

type Variant = 'card' | 'text-line' | 'circle' | 'stat-card';

interface Props {
  variant?: Variant;
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({ variant = 'card', width, height, style }: Props) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const variantStyle = VARIANT_STYLES[variant];

  return (
    <Animated.View style={[
      styles.base,
      variantStyle,
      width !== undefined ? { width: width as any } : null,
      height !== undefined ? { height } : null,
      animatedStyle,
      style,
    ]} />
  );
}

const VARIANT_STYLES: Record<Variant, ViewStyle> = {
  card: { width: '100%', height: 80, borderRadius: 16 },
  'text-line': { width: '60%', height: 14, borderRadius: 7 },
  circle: { width: 48, height: 48, borderRadius: 24 },
  'stat-card': { width: '47%', height: 70, borderRadius: 12 },
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: SURFACES.cardLight,
  },
});
