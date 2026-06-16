/**
 * WearableMetricCard — tarjeta de una métrica del wearable en HOY (cardio del día, pasos).
 * Si `value` es null (sin datos / wearable no conectado) muestra un placeholder "—".
 * El servicio de wearable hoy es un stub (ver COWORK_REPORT) → normalmente null.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CARD } from '@/src/constants/brand';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string | null;
  unit: string;
}

export function WearableMetricCard({ icon, color, label, value, unit }: Props) {
  const hasData = value != null;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: hasData ? color : Colors.textMuted }]}>
          {hasData ? value : '—'}
        </Text>
        <Text style={styles.unit}>{hasData ? unit : 'sin datos'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, letterSpacing: 0.5 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 24, fontFamily: Fonts.extraBold },
  unit: { color: Colors.textMuted, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
});
