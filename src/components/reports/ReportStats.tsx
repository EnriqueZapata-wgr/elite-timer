/**
 * ReportStats (OLA1 R-0) — el encabezado de sección y la cifra con etiqueta
 * que ya usaba el hub, ahora en un solo lugar.
 *
 * El hub y la pantalla del dominio pintan la MISMA cifra: si esto viviera
 * duplicado, tarde o temprano dirían dos números distintos del mismo dato.
 */
import { View, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export function SectionHeader({ icon, color, title }: { icon: string; color: string; title: string }) {
  // El icono conserva su color de sección (identidad); el título sigue el tema.
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon as any} size={20} color={color} />
      <EliteText style={s.sectionTitle}>{title}</EliteText>
    </View>
  );
}

export function Stat({ value, label }: { value: number | string; label: string }) {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.stat}>
      <EliteText style={s.statValue}>{value}</EliteText>
      <EliteText style={s.statLabel}>{label}</EliteText>
    </View>
  );
}

export function StatsRow({ children }: { children: React.ReactNode }) {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return <View style={s.statsRow}>{children}</View>;
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: t.texto, letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 65 },
  statValue: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: t.texto },
  statLabel: { fontSize: 9, fontFamily: Fonts.semiBold, color: t.textoSecundario, letterSpacing: 1, marginTop: 2 },
});
