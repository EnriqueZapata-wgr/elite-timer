/**
 * EdadAtpShareCard — tarjeta visual para compartir (Stories 9:16 o feed 1:1).
 * Diseñada para capturarse con view-shot (commit 21). Branding ATP discreto.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Fonts, FontSizes } from '@/constants/theme';

const DIMS = [
  { key: 'metabolica', icon: '🩸' },
  { key: 'corporal', icon: '💪' },
  { key: 'cardiovascular', icon: '❤️' },
  { key: 'fitness', icon: '🏃' },
  { key: 'cognitiva', icon: '🧠' },
] as const;

export function EdadAtpShareCard({ result, format = 'story' }: { result: EdadAtpV2Result; format?: 'story' | 'square' }) {
  const delta = Math.round((result.edad_integral - result.chronological_age) * 10) / 10;
  const highlight = delta < 0
    ? `${Math.abs(delta)} años más joven que tu edad real`
    : delta > 0 ? `Trabajemos: ${delta} años por mejorar` : 'En línea con tu edad real';

  return (
    <View style={[styles.card, format === 'story' ? styles.story : styles.square]}>
      <EliteText style={styles.brandTop}>MI EDAD ATP</EliteText>

      <View style={styles.center}>
        <EliteText style={styles.label}>EDAD BIOLÓGICA INTEGRAL</EliteText>
        <EliteText style={styles.value}>{result.edad_integral.toFixed(1)}</EliteText>
        <EliteText style={styles.chrono}>cronológica {result.chronological_age}</EliteText>
        <EliteText style={styles.highlight}>{highlight}</EliteText>
      </View>

      <View style={styles.subsRow}>
        {DIMS.map((d) => {
          const sub = (result.sub_edades as any)[d.key]?.age_years ?? result.chronological_age;
          return (
            <View key={d.key} style={styles.subItem}>
              <EliteText style={styles.subIcon}>{d.icon}</EliteText>
              <EliteText style={styles.subAge}>{Math.round(sub)}</EliteText>
            </View>
          );
        })}
      </View>

      <EliteText style={styles.footer}>ATP · Sistema operativo de rendimiento humano</EliteText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#050505', padding: Spacing.xl, justifyContent: 'space-between', alignItems: 'center' },
  story: { width: 360, aspectRatio: 9 / 16 },
  square: { width: 360, aspectRatio: 1 },
  brandTop: { color: Colors.neonGreen, fontFamily: Fonts.bold, letterSpacing: 3, fontSize: FontSizes.sm },
  center: { alignItems: 'center', gap: 4 },
  label: { color: Colors.textSecondary, fontSize: FontSizes.xs, letterSpacing: 2, fontFamily: Fonts.bold },
  value: { color: Colors.neonGreen, fontSize: 96, fontFamily: Fonts.extraBold, lineHeight: 104 },
  chrono: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  highlight: { color: '#fff', fontSize: FontSizes.md, fontFamily: Fonts.semiBold, textAlign: 'center', marginTop: Spacing.sm },
  subsRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  subItem: { alignItems: 'center', gap: 2 },
  subIcon: { fontSize: 20 },
  subAge: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.md },
  footer: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center' },
});
