/**
 * <CeStars> — muestra la Calidad de la Evaluación como estrellas 0-5 (#8), reemplazo del
 * frío "CE 97%". Lógica de mapeo en `ce-stars.ts` (testeada). Opcionalmente muestra la leyenda.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND, THEME_DARK, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ceToStars, starFills, CE_STARS_LEGEND } from './ce-stars';

interface Props {
  /** CE 0-100. */
  ce: number;
  size?: number;
  showLegend?: boolean;
  /** Etiqueta corta encima (ej. "Calidad de tu evaluación"). */
  label?: string;
  /** MB-31B remate: dentro de una card editorial (foto + velo oscuro) los
   *  grises del tema claro no se leen — fuerza los tokens oscuros. */
  editorial?: boolean;
}

const GLYPH: Record<string, string> = { full: '★', half: '⯨', empty: '☆' };

export function CeStars({ ce, size = 18, showLegend = false, label, editorial = false }: Props) {
  // MB-31B remate: subcomponente dentro del Screen themed → tokens del scope.
  // La estrella llena queda lima en ambos modos: es icono/relleno, no letra.
  const scope = useSurfaceTokens();
  const t = editorial ? THEME_DARK : scope;
  const styles = useMemo(() => makeStyles(t), [t]);
  const stars = ceToStars(ce);
  const fills = starFills(stars);
  return (
    <View style={styles.wrap}>
      {label ? <EliteText variant="caption" style={styles.label}>{label}</EliteText> : null}
      <View style={styles.row} accessibilityLabel={`${stars} de 5 estrellas de calidad de evaluación`}>
        {fills.map((f, i) => (
          <EliteText key={i} style={[styles.star, { fontSize: size, color: f === 'empty' ? t.textoTenue : ATP_BRAND.lime }]}>
            {GLYPH[f]}
          </EliteText>
        ))}
        <EliteText variant="caption" style={styles.value}>{stars.toFixed(1)}</EliteText>
      </View>
      {showLegend ? <EliteText variant="caption" style={styles.legend}>{CE_STARS_LEGEND}</EliteText> : null}
    </View>
  );
}

// MB-31B remate: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  wrap: { gap: 2 },
  label: { color: t.textoSecundario, fontSize: FontSizes.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { fontFamily: Fonts.semiBold },
  value: { color: t.textoSecundario, fontSize: FontSizes.xs, marginLeft: Spacing.xs },
  legend: { color: t.textoTenue, fontSize: FontSizes.xs, lineHeight: 15, marginTop: 2 },
});
