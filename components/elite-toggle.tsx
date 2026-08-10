import { View, Switch, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Spacing } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

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
 *
 * MB-31A: colores del scope. El lima del switch encendido se queda en los
 * dos temas: es RELLENO de control (indicador), no texto — regla 1 intacta.
 */
export function EliteToggle({ label, description, value, onValueChange }: EliteToggleProps) {
  const t = useSurfaceTokens();
  return (
    <View style={styles.row}>
      <View style={styles.textArea}>
        <EliteText variant="body">{label}</EliteText>
        {description && (
          <EliteText variant="caption" style={[styles.description, { color: t.textoSecundario }]}>
            {description}
          </EliteText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: t.flotante, true: ATP_BRAND.lime + '88' }}
        thumbColor={value ? ATP_BRAND.lime : t.textoSecundario}
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
    marginTop: 2,
  },
});
