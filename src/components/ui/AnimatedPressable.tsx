/**
 * AnimatedPressable — Botón con spring scale + haptic feedback.
 * Reemplaza Pressable/TouchableOpacity en toda la app.
 */
import { type ReactNode } from 'react';
import { type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { vibrateLight } from '@/src/utils/haptics';

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  haptic?: boolean;
  children: ReactNode;
}

export function AnimatedPressable({
  onPress,
  onLongPress,
  disabled,
  style,
  scaleDown = 0.97,
  haptic = true,
  children,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : 1,
  }));

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withSpring(scaleDown, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    })
    .onEnd(() => {
      if (haptic) vibrateLight();
      onPress?.();
    });

  const longPress = Gesture.LongPress()
    .enabled(!disabled && !!onLongPress)
    .minDuration(500)
    .onStart(() => {
      if (haptic) vibrateLight();
      onLongPress?.();
    });

  const composed = Gesture.Race(tap, longPress);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[animatedStyle, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
