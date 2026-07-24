/**
 * AnimatedPressable — Pressable con spring scale animation.
 * Usa Pressable nativo + reanimated para el scale (sin GestureDetector).
 */
import { type ReactNode } from 'react';
import { Pressable, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface Props {
  onPress?: () => void;
  /** Dispara al touch-down (antes de que el responder pueda cancelar el press).
   * Úsalo cuando el gesto debe registrar aunque haya otro dedo presionando
   * otro Pressable (multitouch — fix N-Back V1.5). */
  onPressIn?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  children: ReactNode;
  hitSlop?: number;
}

export function AnimatedPressable({
  onPress,
  onPressIn,
  onLongPress,
  delayLongPress,
  disabled,
  style,
  scaleDown = 0.97,
  children,
  hitSlop,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withSpring(scaleDown, { damping: 15, stiffness: 400 });
        onPressIn?.();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[animatedStyle, style, disabled && { opacity: 0.4 }]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
