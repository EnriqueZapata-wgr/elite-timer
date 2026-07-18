/**
 * SubEdadConstellation — Edad Integral grande al centro + 5 mini-rings de sub-edades
 * en formación circular (72° entre sí), siguiendo ARQUITECTURA_v2 §6.1.
 * Animación stagger se añade en un commit posterior. Tap en una sub-edad → drill-down.
 */
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Fonts, FontSizes } from '@/constants/theme';
import { EDAD_DIMS as DIMS, statusColor, statusGlyph, EDAD_TIMING, SUB_EDAD_CE_PENDING_THRESHOLD, EDAD_PENDING_COLOR } from './tokens';

const SIZE = 300;
const RADIUS = 118;
const MINI = 62;

export function SubEdadConstellation({ result, onPressCenter }: { result: EdadAtpV2Result; onPressCenter?: () => void }) {
  const chrono = result.chronological_age;
  const subs = result.sub_edades;

  return (
    <View style={styles.wrap}>
      {DIMS.map((d, i) => {
        const subResult = (subs as any)[d.key];
        const sub = subResult?.age_years ?? chrono;
        // CE bajo = mayoría de params sin contestar → "Pendiente", no un número rojo.
        const pending = (subResult?.ce_percent ?? 0) < SUB_EDAD_CE_PENDING_THRESHOLD;
        const angle = (-90 + i * 72) * (Math.PI / 180);
        const left = SIZE / 2 + RADIUS * Math.cos(angle) - MINI / 2;
        const top = SIZE / 2 + RADIUS * Math.sin(angle) - MINI / 2;
        const color = pending ? EDAD_PENDING_COLOR : statusColor(sub, chrono);
        return (
          <Animated.View key={d.key} entering={FadeIn.delay(EDAD_TIMING.constellationBaseDelay + i * EDAD_TIMING.staggerMs).duration(350)} style={[styles.mini, { left, top, borderColor: color }]}>
            <Pressable
              onPress={() => { haptic.light(); router.push(`/edad-atp/sub-edad/${d.key}`); }}
              style={styles.miniInner}
            >
              <EliteText style={styles.miniIcon}>{d.icon}</EliteText>
              {pending ? (
                <>
                  <EliteText style={[styles.miniPending, { color }]}>Pendiente</EliteText>
                  <EliteText style={styles.miniGlyph}>⚠️</EliteText>
                </>
              ) : (
                <>
                  <EliteText style={[styles.miniAge, { color }]}>{Math.round(sub)}</EliteText>
                  <EliteText style={[styles.miniGlyph, { color }]}>{statusGlyph(sub, chrono)}</EliteText>
                </>
              )}
            </Pressable>
          </Animated.View>
        );
      })}

      <Animated.View entering={ZoomIn.duration(400)} style={styles.center}>
        <Pressable onPress={() => { haptic.medium(); onPressCenter?.(); }} style={styles.centerInner}>
          <EliteText style={styles.centerLabel}>EDAD ATP</EliteText>
          <EliteText style={styles.centerValue}>{result.edad_integral.toFixed(1)}</EliteText>
          <EliteText style={styles.centerSub}>cronológica {chrono}</EliteText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: {
    position: 'absolute', left: SIZE / 2 - 72, top: SIZE / 2 - 72, width: 144, height: 144,
    borderRadius: 72, backgroundColor: '#0d1a0a', borderWidth: 2, borderColor: Colors.neonGreen,
  },
  centerInner: { flex: 1, borderRadius: 72, alignItems: 'center', justifyContent: 'center', gap: 2 },
  centerLabel: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 2, fontFamily: Fonts.bold },
  centerValue: { color: Colors.neonGreen, fontSize: 44, fontFamily: Fonts.extraBold, lineHeight: 48 },
  centerSub: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  mini: {
    position: 'absolute', width: MINI, height: MINI, borderRadius: MINI / 2,
    backgroundColor: Colors.surface, borderWidth: 1.5,
  },
  miniInner: { flex: 1, borderRadius: MINI / 2, alignItems: 'center', justifyContent: 'center' },
  miniIcon: { fontSize: 15 },
  miniAge: { fontSize: FontSizes.md, fontFamily: Fonts.bold, lineHeight: 20 },
  miniPending: { fontSize: 9, fontFamily: Fonts.semiBold, lineHeight: 12 },
  miniGlyph: { fontSize: 9, lineHeight: 11 },
});
