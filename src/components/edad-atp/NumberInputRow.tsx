/**
 * NumberInputRow — fila de input numérico reutilizable para captura Edad ATP.
 * label + input decimal + unidad + helper opcional. `readOnly` para valores
 * auto-calculados (ej. FFMI).
 */
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
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
  /** Resalta la fila (input enfocado desde "Datos por capturar" con ?focus=). */
  highlight?: boolean;
  /** Si se pasa, el helper se vuelve un link tappable (ej. "haz el test Cooper →"). */
  onHelperPress?: () => void;
}

export function NumberInputRow({ label, unit, value, onChangeText, helper, placeholder, readOnly, badge, highlight, onHelperPress }: Props) {
  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <View style={styles.labelCol}>
        <EliteText variant="body" style={styles.label}>{label}{unit ? ` (${unit})` : ''}</EliteText>
        {badge ? (
          <View style={styles.badge}>
            <EliteText variant="caption" style={styles.badgeText}>✓ {badge}</EliteText>
          </View>
        ) : null}
        {helper ? (
          onHelperPress ? (
            <Pressable onPress={onHelperPress} hitSlop={6}>
              <EliteText variant="caption" style={styles.helperLink}>{helper}</EliteText>
            </Pressable>
          ) : (
            <EliteText variant="caption" style={styles.helper}>{helper}</EliteText>
          )
        ) : null}
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly, highlight && styles.inputHighlight]}
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
  rowHighlight: { backgroundColor: 'rgba(168,224,42,0.06)', borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, marginHorizontal: -Spacing.xs },
  inputHighlight: { borderColor: Colors.neonGreen },
  labelCol: { flex: 1 },
  label: { color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  helper: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 1 },
  helperLink: { color: Colors.neonGreen, fontSize: FontSizes.xs, marginTop: 2, fontFamily: Fonts.semiBold },
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
