/**
 * PrioritySemaphore — semáforo clínico de intervenciones 🔴🟡🟢 (dx-f3).
 * Dot de color por prioridad (1 alta · 2 media · 3 baja) + label opcional.
 * Colores semánticos alineados a getScoreColor (brand): rojo/ámbar/verde.
 */
import { View, Text, StyleSheet } from 'react-native';
import { TEXT } from '@/src/constants/brand';
import { Fonts } from '@/constants/theme';

export type SemaphorePriority = 1 | 2 | 3;

export const PRIORITY_COLORS: Record<SemaphorePriority, string> = {
  1: '#ef4444', // 🔴 alta
  2: '#fbbf24', // 🟡 media
  3: '#4ade80', // 🟢 baja
};

export const PRIORITY_LABELS: Record<SemaphorePriority, string> = {
  1: 'Prioridad alta',
  2: 'Prioridad media',
  3: 'Prioridad baja',
};

interface Props {
  priority: SemaphorePriority;
  /** Muestra el label textual junto al dot. */
  showLabel?: boolean;
  /** Diámetro del dot (default 10). */
  size?: number;
}

export function PrioritySemaphore({ priority, showLabel = false, size = 10 }: Props) {
  const color = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS[2];
  return (
    <View style={styles.row}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
      {showLabel && (
        <Text style={[styles.label, { color }]}>{PRIORITY_LABELS[priority] ?? ''}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: Fonts.semiBold, fontSize: 11, color: TEXT.secondary },
});
