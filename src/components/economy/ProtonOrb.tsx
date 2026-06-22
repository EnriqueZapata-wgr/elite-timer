/**
 * ProtonOrb — "joya" H+ con brillo en loop (reanimated). Decorativa, reusable en balance/tienda.
 * Doctrina NO-FRANKENSTEIN: reanimated 4, tokens, sin deps nuevas.
 */
import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import { ATP_BRAND } from '@/src/constants/brand';

interface Props {
  size?: number;
  color?: string;
  /** Activa el loop de brillo (default true). */
  animated?: boolean;
  style?: ViewStyle;
}

export function ProtonOrb({ size = 56, color = ATP_BRAND.lime, animated = true, style }: Props) {
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    if (!animated) return;
    pulse.value = withRepeat(withSequence(
      withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
    glow.value = withRepeat(withSequence(
      withTiming(0.55, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.3, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
  }, [animated, pulse, glow]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View style={[
        StyleSheet.absoluteFill,
        { borderRadius: size / 2, backgroundColor: color },
        haloStyle,
      ]} />
      <Animated.View style={[
        {
          width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39,
          backgroundColor: `${color}26`, borderWidth: 1.5, borderColor: color,
          alignItems: 'center', justifyContent: 'center',
        },
        orbStyle,
      ]}>
        <Ionicons name="diamond" size={size * 0.4} color={color} />
      </Animated.View>
    </View>
  );
}
