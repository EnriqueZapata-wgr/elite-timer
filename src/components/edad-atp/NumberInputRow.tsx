/**
 * NumberInputRow — fila de input numérico reutilizable para captura Edad ATP.
 * label + input decimal + unidad + helper opcional. `readOnly` para valores
 * auto-calculados (ej. FFMI).
 */
import { View, TextInput, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  label: string;
  unit?: string;
  value: string;
  onChangeText?: (v: string) => void;
  helper?: string;
  placeholder?: string;
  readOnly?: boolean;
  /** Etiqueta verde "ya tienes este dato" (ej. "Labs · hace 12d"). */
  badge?: string;
}

export function NumberInputRow({ label, unit, value, onChangeText, helper, placeholder, readOnly, badge }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.labelCol}>
        <EliteText variant="body" style={styles.label}>{label}{unit ? ` (${unit})` : ''}</EliteText>
        {badge ? (
          <View style={styles.badge}>
            <EliteText variant="caption" style={styles.badgeText}>✓ {badge}</EliteText>
          </View>
        ) : null}
        {helper ? <EliteText variant="caption" style={styles.helper}>{helper}</EliteText> : null}
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly]}
        value={value}
        onChangeText={onChangeText}
        editable={!readOnly}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? '—'}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  labelCol: { flex: 1 },
  label: { color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  helper: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 1 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(168,224,42,0.12)', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 },
  badgeText: { color: Colors.neonGreen, fontSize: FontSizes.xs },
  input: {
    width: 96, textAlign: 'right',
    backgroundColor: Colors.surface, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 10,
    color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md,
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  inputReadOnly: { color: Colors.neonGreen, borderColor: 'rgba(168,224,42,0.3)' },
});
