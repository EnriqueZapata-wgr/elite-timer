/**
 * RecalculateDiff — diff animado de la Edad Integral tras recalcular
 * (ej. "55.3 → 54.1 · 1.2 años más joven"). Verde si mejora, ámbar si empeora.
 */
import { useMemo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { SEMANTIC, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export function RecalculateDiff({ from, to }: { from: number; to: number }) {
  // MB-31B remate: subcomponente dentro del Screen themed → tokens del scope.
  // Mejora en lima solo como LETRA en oscuro (manual regla 1); ámbar se queda.
  const t = useSurfaceTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const delta = Math.round((to - from) * 10) / 10;
  if (delta === 0) return null;
  const improved = delta < 0;
  const color = improved ? (t.kind === 'dark' ? SEMANTIC.success : t.tealTexto) : '#EF9F27';
  const label = improved
    ? `${Math.abs(delta)} año${Math.abs(delta) === 1 ? '' : 's'} más joven`
    : `${delta} año${delta === 1 ? '' : 's'} más viejo`;

  return (
    <Animated.View entering={FadeInDown.duration(450)} style={[styles.card, { borderColor: color }]}>
      <View style={styles.row}>
        <EliteText style={styles.from}>{from.toFixed(1)}</EliteText>
        <EliteText style={[styles.arrow, { color }]}>→</EliteText>
        <EliteText style={[styles.to, { color }]}>{to.toFixed(1)}</EliteText>
      </View>
      <EliteText style={[styles.label, { color }]}>{improved ? '↓ ' : '↑ '}{label}</EliteText>
    </Animated.View>
  );
}

// MB-31B remate: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  card: { backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, padding: Spacing.md, alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  from: { color: t.textoSecundario, fontSize: 26, fontFamily: Fonts.bold },
  arrow: { fontSize: 22, fontFamily: Fonts.bold },
  to: { fontSize: 34, fontFamily: Fonts.extraBold },
  label: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
