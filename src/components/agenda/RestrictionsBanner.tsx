/**
 * RestrictionsBanner (#v13i D) — banner de prohibiciones del día ("HOY EVITA · Café · Alcohol").
 * Semánticamente las prohibiciones NO van en el timeline (no son acciones con hora), viven arriba
 * de /agenda y en la AgendaPreviewCard de HOY. Puramente visual; no toca la lógica de eventos.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';

const WARN = '#ff8b66';

interface Props {
  /** Etiquetas cortas ya normalizadas (ej. ['Café', 'Alcohol']). */
  restrictions: string[];
  /** Versión reducida para la AgendaPreviewCard en HOY. */
  compact?: boolean;
}

export function RestrictionsBanner({ restrictions, compact }: Props) {
  if (!restrictions.length) return null;
  return (
    <View style={[styles.banner, compact && styles.bannerCompact]}>
      <Ionicons name="shield-outline" size={compact ? 14 : 16} color={WARN} />
      <View style={styles.body}>
        <EliteText style={styles.label}>HOY EVITA</EliteText>
        <EliteText style={[styles.list, compact && styles.listCompact]} numberOfLines={compact ? 1 : 2}>
          {restrictions.join(' · ')}
        </EliteText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(231,76,60,0.08)',
    borderLeftWidth: 3, borderLeftColor: WARN,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  bannerCompact: { paddingVertical: Spacing.xs, gap: Spacing.sm },
  body: { flex: 1, gap: 2 },
  label: { color: WARN, fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 2 },
  list: { color: 'rgba(255,255,255,0.75)', fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  listCompact: { fontSize: FontSizes.xs },
});
