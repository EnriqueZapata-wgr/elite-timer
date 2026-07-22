/**
 * Sprint Compliance 4 — Footer de pantallas de RESULTADOS (Mapa Funcional,
 * Edad ATP, labs). Posicionamiento §2 en superficie: el resultado siempre
 * lleva al pie "estimación educativa, no diagnóstico".
 */
import { StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Spacing, Fonts } from '@/constants/theme';

export const RESULT_DISCLAIMER_TEXT =
  'Estimación educativa, no diagnóstico. ATP optimiza, no trata.';

export function ResultDisclaimerFooter() {
  return <EliteText style={s.text}>{RESULT_DISCLAIMER_TEXT}</EliteText>;
}

const s = StyleSheet.create({
  text: {
    fontSize: 11, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center', lineHeight: 16,
    marginTop: Spacing.lg, marginBottom: Spacing.md, paddingHorizontal: Spacing.md,
  },
});
