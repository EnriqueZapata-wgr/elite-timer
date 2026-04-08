/**
 * SectionTitle — Etiqueta de seccion estandar.
 *
 * Reemplaza las 8 implementaciones inline de sectionTitle/sectionLabel
 * dispersas en el codigo. Estilo unico definido en brand.ts: SECTION_TITLE.
 *
 * Uso:
 *   <SectionTitle>BENCHMARKS</SectionTitle>
 *   <SectionTitle rightAction={<Text>Ver todo →</Text>}>MIS RUTINAS</SectionTitle>
 */
import type { ReactNode } from 'react';
import { Text, View, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SECTION_TITLE } from '@/src/constants/brand';

interface SectionTitleProps {
  children: string;
  /** Render arbitrario a la derecha (link, boton, badge). */
  rightAction?: ReactNode;
  /** Texto plano a la derecha (atajo cuando solo es un texto). */
  rightText?: string;
  /** Color del rightText (default: igual al titulo). */
  rightColor?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SectionTitle({ children, rightAction, rightText, rightColor, style, containerStyle }: SectionTitleProps) {
  // Si se pasa rightText (string), lo renderiza como Text del mismo estilo
  const right = rightAction ?? (rightText
    ? <Text style={[styles.text, { marginBottom: 0 }, rightColor ? { color: rightColor } : null]}>{rightText}</Text>
    : null);

  if (right) {
    return (
      <View style={[styles.row, containerStyle]}>
        <Text style={[styles.text, { marginBottom: 0 }, style]}>{children}</Text>
        {right}
      </View>
    );
  }
  return <Text style={[styles.text, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: SECTION_TITLE.fontSize,
    letterSpacing: SECTION_TITLE.letterSpacing,
    fontWeight: SECTION_TITLE.fontWeight,
    color: SECTION_TITLE.color,
    textTransform: SECTION_TITLE.textTransform,
    marginBottom: SECTION_TITLE.marginBottom,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SECTION_TITLE.marginBottom,
  },
});
