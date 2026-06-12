/**
 * <CeStars> — muestra la Calidad de la Evaluación como estrellas 0-5 (#8), reemplazo del
 * frío "CE 97%". Lógica de mapeo en `ce-stars.ts` (testeada). Opcionalmente muestra la leyenda.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ceToStars, starFills, CE_STARS_LEGEND } from './ce-stars';

interface Props {
  /** CE 0-100. */
  ce: number;
  size?: number;
  showLegend?: boolean;
  /** Etiqueta corta encima (ej. "Calidad de tu evaluación"). */
  label?: string;
}

const GLYPH: Record<string, string> = { full: '★', half: '⯨', empty: '☆' };

export function CeStars({ ce, size = 18, showLegend = false, label }: Props) {
  const stars = ceToStars(ce);
  const fills = starFills(stars);
  return (
    <View style={styles.wrap}>
      {label ? <EliteText variant="caption" style={styles.label}>{label}</EliteText> : null}
      <View style={styles.row} accessibilityLabel={`${stars} de 5 estrellas de calidad de evaluación`}>
        {fills.map((f, i) => (
          <EliteText key={i} style={[styles.star, { fontSize: size, color: f === 'empty' ? Colors.textMuted : Colors.neonGreen }]}>
            {GLYPH[f]}
          </EliteText>
        ))}
        <EliteText variant="caption" style={styles.value}>{stars.toFixed(1)}</EliteText>
      </View>
      {showLegend ? <EliteText variant="caption" style={styles.legend}>{CE_STARS_LEGEND}</EliteText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  label: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { fontFamily: Fonts.semiBold },
  value: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginLeft: Spacing.xs },
  legend: { color: Colors.textMuted, fontSize: FontSizes.xs, lineHeight: 15, marginTop: 2 },
});
