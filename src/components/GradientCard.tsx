/**
 * GradientCard — Card estilo Oura Ring con gradiente sutil de color.
 *
 * Gradiente diagonal del color (opacity ~0.15) → transparente.
 * Border sutil del color. Border radius 16.
 */
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  color: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
}

export function GradientCard({ color, children, style, onPress, disabled }: GradientCardProps) {
  const flatStyle = StyleSheet.flatten(style);
  // Extraer flex del style para pasarlo al wrapper Pressable
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

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [outerStyle, pressed ? { opacity: 0.8 } : undefined]}
      >
        {content}
      </Pressable>
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
