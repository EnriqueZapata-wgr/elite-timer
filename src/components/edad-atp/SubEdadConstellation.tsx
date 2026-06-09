/**
 * SubEdadConstellation — Edad Integral grande al centro + 5 mini-rings de sub-edades
 * en formación circular (72° entre sí), siguiendo ARQUITECTURA_v2 §6.1.
 * Animación stagger se añade en un commit posterior. Tap en una sub-edad → drill-down.
 */
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Fonts, FontSizes } from '@/constants/theme';

const DIMS = [
  { key: 'metabolica', icon: '🩸', label: 'Metabólica' },
  { key: 'corporal', icon: '💪', label: 'Corporal' },
  { key: 'cardiovascular', icon: '❤️', label: 'Cardio' },
  { key: 'fitness', icon: '🏃', label: 'Fitness' },
  { key: 'cognitiva', icon: '🧠', label: 'Cognitiva' },
] as const;

const SIZE = 300;
const RADIUS = 118;
const MINI = 62;

/** Color por estado vs edad cronológica: verde mejor, ámbar neutro, rojo peor. */
function statusColor(sub: number, chrono: number): string {
  const d = sub - chrono;
  if (d <= -1) return Colors.neonGreen;
  if (d >= 2) return '#E24B4A';
  return '#EF9F27';
}
function statusGlyph(sub: number, chrono: number): string {
  const d = sub - chrono;
  if (d <= -1) return '▲';
  if (d >= 2) return '▼';
  return '◐';
}

export function SubEdadConstellation({ result, onPressCenter }: { result: EdadAtpV2Result; onPressCenter?: () => void }) {
  const chrono = result.chronological_age;
  const subs = result.sub_edades;

  return (
    <View style={styles.wrap}>
      {DIMS.map((d, i) => {
        const sub = subs[d.key]?.age_years ?? chrono;
        const angle = (-90 + i * 72) * (Math.PI / 180);
        const left = SIZE / 2 + RADIUS * Math.cos(angle) - MINI / 2;
        const top = SIZE / 2 + RADIUS * Math.sin(angle) - MINI / 2;
        const color = statusColor(sub, chrono);
        return (
          <Pressable
            key={d.key}
            onPress={() => { haptic.light(); router.push(`/edad-atp/sub-edad/${d.key}` as any); }}
            style={[styles.mini, { left, top, borderColor: color }]}
          >
            <EliteText style={styles.miniIcon}>{d.icon}</EliteText>
            <EliteText style={[styles.miniAge, { color }]}>{Math.round(sub)}</EliteText>
            <EliteText style={[styles.miniGlyph, { color }]}>{statusGlyph(sub, chrono)}</EliteText>
          </Pressable>
        );
      })}

      <Pressable onPress={() => { haptic.medium(); onPressCenter?.(); }} style={styles.center}>
        <EliteText style={styles.centerLabel}>EDAD ATP</EliteText>
        <EliteText style={styles.centerValue}>{result.edad_integral.toFixed(1)}</EliteText>
        <EliteText style={styles.centerSub}>cronológica {chrono}</EliteText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: {
    position: 'absolute', left: SIZE / 2 - 72, top: SIZE / 2 - 72, width: 144, height: 144,
    borderRadius: 72, backgroundColor: '#0d1a0a', borderWidth: 2, borderColor: Colors.neonGreen,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  centerLabel: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 2, fontFamily: Fonts.bold },
  centerValue: { color: Colors.neonGreen, fontSize: 44, fontFamily: Fonts.extraBold, lineHeight: 48 },
  centerSub: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  mini: {
    position: 'absolute', width: MINI, height: MINI, borderRadius: MINI / 2,
    backgroundColor: Colors.surface, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  miniIcon: { fontSize: 15 },
  miniAge: { fontSize: FontSizes.md, fontFamily: Fonts.bold, lineHeight: 20 },
  miniGlyph: { fontSize: 9, lineHeight: 11 },
});
