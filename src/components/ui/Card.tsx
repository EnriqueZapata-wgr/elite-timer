/**
 * Card — Componente card reutilizable con variantes premium.
 */
import { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';

type CardVariant = 'elevated' | 'glass' | 'accent';

interface Props {
  variant?: CardVariant;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Card({ variant = 'elevated', accentColor, style, children }: Props) {
  return (
    <View style={[
      styles.base,
      variant === 'elevated' && styles.elevated,
      variant === 'glass' && styles.glass,
      variant === 'accent' && styles.accent,
      variant === 'accent' && accentColor ? { borderLeftColor: accentColor } : null,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
  },
  elevated: {
    backgroundColor: '#1A1A1A',
    borderWidth: 0.5,
    borderColor: '#2A2A2A',
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  accent: {
    backgroundColor: '#1A1A1A',
    borderWidth: 0.5,
    borderColor: '#2A2A2A',
    borderLeftWidth: 3,
    borderLeftColor: '#a8e02a',
  },
});
