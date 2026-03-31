/**
 * GradientCard — Card estilo premium con gradiente sutil + spring scale.
 *
 * Gradiente diagonal del color (opacity ~0.15) → transparente.
 * Press: spring scale bounce (0.97) con feedback táctil.
 */
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GradientCardProps {
  color: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

export function GradientCard({ color, children, style, onPress, onLongPress, disabled }: GradientCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flatStyle = StyleSheet.flatten(style);
  const { flex, flexGrow, flexShrink, flexBasis, alignSelf, margin, marginLeft, marginRight,
    marginTop, marginBottom, marginHorizontal, marginVertical, width, height, minHeight,
    maxWidth, maxHeight, ...innerStyle } = (flatStyle ?? {}) as any;

  const outerStyle: ViewStyle = {};
  if (flex !== undefined) outerStyle.flex = flex;
  if (flexGrow !== undefined) outerStyle.flexGrow = flexGrow;
  if (flexShrink !== undefined) outerStyle.flexShrink = flexShrink;
  if (flexBasis !== undefined) outerStyle.flexBasis = flexBasis;
  if (alignSelf !== undefined) outerStyle.alignSelf = alignSelf;
  if (margin !== undefined) outerStyle.margin = margin;
  if (marginLeft !== undefined) outerStyle.marginLeft = marginLeft;
  if (marginRight !== undefined) outerStyle.marginRight = marginRight;
  if (marginTop !== undefined) outerStyle.marginTop = marginTop;
  if (marginBottom !== undefined) outerStyle.marginBottom = marginBottom;
  if (marginHorizontal !== undefined) outerStyle.marginHorizontal = marginHorizontal;
  if (marginVertical !== undefined) outerStyle.marginVertical = marginVertical;
  if (width !== undefined) outerStyle.width = width;
  if (height !== undefined) outerStyle.height = height;
  if (minHeight !== undefined) outerStyle.minHeight = minHeight;
  if (maxWidth !== undefined) outerStyle.maxWidth = maxWidth;
  if (maxHeight !== undefined) outerStyle.maxHeight = maxHeight;

  const gradientStyle = [styles.gradient, { borderColor: color + '28' }, innerStyle];

  const content = (
    <LinearGradient
      colors={[color + '25', color + '0A', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={gradientStyle}
    >
      {children}
    </LinearGradient>
  );

  if (onPress || onLongPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 10, stiffness: 300 });
        }}
        style={[animatedStyle, outerStyle, disabled && { opacity: 0.4 }]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <LinearGradient
      colors={[color + '25', color + '0A', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { borderColor: color + '28' }, flatStyle]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
