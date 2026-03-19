import { type ReactNode } from 'react';
import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface EliteCardProps {
  /** Título principal */
  title: string;
  /** Texto secundario */
  subtitle?: string;
  /** Contenido a la derecha (ej: botón play) */
  rightContent?: ReactNode;
  /** Callback al presionar */
  onPress?: () => void;
  /** Estilos adicionales */
  style?: ViewStyle;
}

/**
 * EliteCard — Card genérica para listas (programas, rutinas, estándar).
 * Fondo surface, borde sutil, contenido izquierda + derecha opcional.
 */
export function EliteCard({ title, subtitle, rightContent, onPress, style }: EliteCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && onPress && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        <EliteText variant="subtitle" style={styles.title} numberOfLines={1}>
          {title}
        </EliteText>
        {subtitle && (
          <EliteText variant="caption" numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </EliteText>
        )}
      </View>
      {rightContent && <View style={styles.right}>{rightContent}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
    borderColor: Colors.neonGreen,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  right: {
    marginLeft: Spacing.md,
  },
});
