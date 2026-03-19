import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface SessionStatProps {
  /** Etiqueta descriptiva (ej: "Tiempo Total") */
  label: string;
  /** Valor principal (ej: "04:00") */
  value: string;
  /** Texto secundario opcional (ej: "240 segundos") */
  detail?: string;
}

/**
 * SessionStat — Tarjeta de estadística para el resumen de sesión.
 * Muestra label arriba, valor grande en el centro, detalle debajo.
 */
export function SessionStat({ label, value, detail }: SessionStatProps) {
  return (
    <View style={styles.card}>
      <EliteText variant="caption" style={styles.label}>
        {label}
      </EliteText>
      <EliteText variant="subtitle" style={styles.value}>
        {value}
      </EliteText>
      {detail && (
        <EliteText variant="caption" style={styles.detail}>
          {detail}
        </EliteText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    flex: 1,
  },
  label: {
    letterSpacing: 1,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  value: {
    color: Colors.neonGreen,
    fontSize: 22,
  },
  detail: {
    marginTop: Spacing.xs,
    color: Colors.textSecondary,
  },
});
