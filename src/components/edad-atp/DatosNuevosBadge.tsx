/**
 * <DatosNuevosBadge> — aviso no intrusivo de que entró data nueva integrada y se puede
 * recalcular la Edad ATP (#16). Se muestra solo si `visible`. Tappable opcional (llevar a
 * recalcular). Se limpia tras recalcular (el padre controla `visible`).
 */
import { useMemo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  visible: boolean;
  onPress?: () => void;
}

export function DatosNuevosBadge({ visible, onPress }: Props) {
  // MB-31B remate: subcomponente dentro del Screen themed → tokens del scope.
  const t = useSurfaceTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  if (!visible) return null;
  return (
    <Pressable onPress={onPress} style={styles.badge} accessibilityRole="button">
      <View style={styles.dot} />
      <EliteText variant="caption" style={styles.text}>
        Datos nuevos — puedes recalcular tu Edad ATP
      </EliteText>
    </Pressable>
  );
}

// MB-31B remate: el lima como LETRA solo vive en oscuro; en claro cae al teal
// de texto (manual regla 1 — hallazgo). El punto lima es relleno: se queda.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: 'rgba(168,224,42,0.10)', borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(168,224,42,0.35)',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ATP_BRAND.lime },
  text: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
});
