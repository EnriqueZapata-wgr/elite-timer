import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { Colors, Spacing } from '@/constants/theme';

interface EmptyStateProps {
  /** Nombre del ícono de Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Mensaje descriptivo */
  message: string;
  /** Texto del botón de acción (opcional) */
  actionLabel?: string;
  /** Callback del botón de acción */
  onAction?: () => void;
}

/**
 * EmptyState — Placeholder para listas vacías.
 * Ícono grande + mensaje + botón de acción opcional.
 */
export function EmptyState({ icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={Colors.textSecondary} style={styles.icon} />
      <EliteText variant="body" style={styles.message}>
        {message}
      </EliteText>
      {actionLabel && onAction && (
        <EliteButton label={actionLabel} onPress={onAction} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    marginBottom: Spacing.md,
  },
  message: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  button: {
    minWidth: 200,
  },
});
