/**
 * Sprint Compliance 4 — Footer de pantallas de RESULTADOS (Mapa Funcional,
 * Edad ATP, labs). Posicionamiento §2 en superficie: el resultado siempre
 * lleva al pie "estimación educativa, no diagnóstico".
 */
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Spacing, Fonts } from '@/constants/theme';
import { withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export const RESULT_DISCLAIMER_TEXT =
  'Estimación educativa, no diagnóstico. ATP optimiza, no trata.';

export function ResultDisclaimerFooter() {
  // NOCHE-4: iba en blanco al 35%, que sobre papel es invisible. Un pie de
  // resultado que no se lee no cumple lo que la ley pide que diga.
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return <EliteText style={s.text}>{RESULT_DISCLAIMER_TEXT}</EliteText>;
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  text: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: t.kind === 'dark' ? withOpacity(t.texto, 0.35) : t.textoSecundario,
    textAlign: 'center', lineHeight: 16,
    marginTop: Spacing.lg, marginBottom: Spacing.md, paddingHorizontal: Spacing.md,
  },
});
