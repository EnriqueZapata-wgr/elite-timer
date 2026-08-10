/**
 * Card — Componente card reutilizable con variantes premium.
 *
 * MB-31A: superficies desde el scope (oscuro de siempre fuera de
 * <ThemeReady>). El acento lima del borde izquierdo se queda en los dos
 * temas: es barra indicadora, no texto.
 */
import { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

type CardVariant = 'elevated' | 'glass' | 'accent';

interface Props {
  variant?: CardVariant;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Card({ variant = 'elevated', accentColor, style, children }: Props) {
  const t = useSurfaceTokens();
  const surface: ViewStyle =
    variant === 'glass'
      ? t.kind === 'dark'
        ? { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
        : { backgroundColor: 'rgba(255,255,255,0.55)', borderColor: 'rgba(15,21,24,0.08)' }
      : { backgroundColor: t.card, borderColor: t.borde };

  return (
    <View style={[
      styles.base,
      surface,
      variant === 'accent' && styles.accent,
      variant === 'accent' ? { borderLeftColor: accentColor ?? ATP_BRAND.lime } : null,
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
    borderWidth: 0.5,
  },
  accent: {
    borderLeftWidth: 3,
  },
});
