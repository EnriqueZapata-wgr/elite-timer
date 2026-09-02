/**
 * NumberInputRow — fila de input numérico reutilizable para captura Edad ATP.
 * label + input decimal + unidad + helper opcional. `readOnly` para valores
 * auto-calculados (ej. FFMI).
 */
import { useMemo } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

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
  /** MB-27 V3 (abierto 2): abre el teclado directo — el deep-link ?focus=
   *  promete captura inmediata, y highlight solo era tinte. */
  autoFocus?: boolean;
  /** Si se pasa, el helper se vuelve un link tappable (ej. "haz el test Cooper →"). */
  onHelperPress?: () => void;
}

export function NumberInputRow({ label, unit, value, onChangeText, helper, placeholder, readOnly, badge, highlight, autoFocus, onHelperPress }: Props) {
  // MB-31B remate: subcomponente dentro del Screen themed → tokens del scope.
  const t = useSurfaceTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
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
        autoFocus={autoFocus && !readOnly}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? '—'}
        placeholderTextColor={t.textoTenue}
      />
    </View>
  );
}

// MB-31B remate: los estilos leen los tokens del tema. El lima como LETRA
// (link de helper / valor auto-calculado) solo vive en oscuro; en claro cae
// al teal de texto (manual regla 1 — hallazgos reportados).
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  rowHighlight: { backgroundColor: 'rgba(168,224,42,0.06)', borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, marginHorizontal: -Spacing.xs },
  // 31-ago-2026 (21.3): el lima como borde sobre el campo hundido claro mide
  // 1.12: el ?focus resaltaba un campo que nadie veía resaltado. En claro el
  // filo es el teal calibrado (4.64 sobre hundido, forma >= 3).
  inputHighlight: { borderColor: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto },
  labelCol: { flex: 1 },
  label: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  helper: { color: t.textoSecundario, fontSize: FontSizes.xs, marginTop: 1 },
  helperLink: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontSize: FontSizes.xs, marginTop: 2, fontFamily: Fonts.semiBold },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(168,224,42,0.12)', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 },
  badgeText: { color: t.textoSecundario, fontSize: FontSizes.xs },
  // Campo de captura: receso (t.hundido) — en claro se oscurece frente a la card.
  input: {
    width: 96, textAlign: 'right',
    backgroundColor: t.hundido, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 10,
    color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md,
    borderWidth: 1, borderColor: t.borde,
  },
  inputReadOnly: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, borderColor: t.kind === 'dark' ? 'rgba(168,224,42,0.3)' : t.tealTexto },
});
