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
  const content = (
    <LinearGradient
      colors={[color + '25', color + '0A', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { borderColor: color + '28' }, style]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => pressed ? { opacity: 0.8 } : undefined}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
