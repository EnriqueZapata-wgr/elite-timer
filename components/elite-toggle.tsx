import { View, Switch, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing } from '@/constants/theme';

interface EliteToggleProps {
  /** Título del toggle */
  label: string;
  /** Descripción debajo del título */
  description?: string;
  /** Valor actual */
  value: boolean;
  /** Callback al cambiar */
  onValueChange: (value: boolean) => void;
}

/**
 * EliteToggle — Fila con label + descripción + switch verde.
 */
export function EliteToggle({ label, description, value, onValueChange }: EliteToggleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textArea}>
        <EliteText variant="body">{label}</EliteText>
        {description && (
          <EliteText variant="caption" style={styles.description}>
            {description}
          </EliteText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.surfaceLight, true: Colors.neonGreen + '88' }}
        thumbColor={value ? Colors.neonGreen : Colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
  },
  textArea: {
    flex: 1,
    marginRight: Spacing.md,
  },
  description: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
