/**
 * AppCard — Card estandar de la app.
 *
 * Estilo unico desde brand.ts: CARD. Soporta acento de color
 * (borde lateral o superior) por categoria/pilar.
 *
 * Uso:
 *   <AppCard><Text>contenido</Text></AppCard>
 *   <AppCard accentColor="#a8e02a"><Text>fitness</Text></AppCard>
 *   <AppCard accentColor="#5B9BD5" accentPosition="top"><Text>nutricion</Text></AppCard>
 */
import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { CARD } from '@/src/constants/brand';

interface AppCardProps {
  children: ReactNode;
  accentColor?: string;
  accentPosition?: 'left' | 'top';
  style?: StyleProp<ViewStyle>;
}

export function AppCard({ children, accentColor, accentPosition = 'left', style }: AppCardProps) {
  const accentStyle: ViewStyle = accentColor
    ? accentPosition === 'top'
      ? { borderTopWidth: 3, borderTopColor: accentColor }
      : { borderLeftWidth: 3, borderLeftColor: accentColor }
    : {};

  return (
    <View style={[styles.card, accentStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD.bg,
    borderColor: CARD.borderColor,
    borderWidth: CARD.borderWidth,
    borderRadius: CARD.borderRadius,
    padding: CARD.padding,
  },
});
