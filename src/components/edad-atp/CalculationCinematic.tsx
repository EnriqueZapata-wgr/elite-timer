/**
 * CalculationCinematic — modal full-screen con el reveal por fases del cálculo de
 * la Edad ATP (ARQUITECTURA_v2 §6 / buzón completion). Haptics por fase + count-up
 * premium en el reveal. Confetti/sound se enchufan en commits posteriores.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Fonts, FontSizes } from '@/constants/theme';

type Phase = { label: string; emoji: string; ms: number };

export function CalculationCinematic({
  visible, result, onDone,
}: { visible: boolean; result: EdadAtpV2Result | null; onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  const [display, setDisplay] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const hasCognitive = result ? result.modificador_cognitivo !== 0 : false;
  const phases: Phase[] = [
    { label: 'Procesando biomarcadores…', emoji: '🩸', ms: 1500 },
    { label: 'Evaluando composición…', emoji: '💪', ms: 1000 },
    { label: 'Calculando ritmo de envejecimiento…', emoji: '⏱️', ms: 1000 },
    ...(hasCognitive ? [{ label: 'Aplicando ajustes cognitivos…', emoji: '🧠', ms: 500 }] : []),
    { label: 'Tu Edad ATP', emoji: '✦', ms: 1800 },
  ];
  const revealIdx = phases.length - 1;

  useEffect(() => {
    if (!visible || !result) return;
    setPhase(0);
    setDisplay(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    let acc = 0;
    phases.forEach((p, i) => {
      const t = setTimeout(() => {
        setPhase(i);
        if (i === revealIdx) {
          haptic.success();
          runCountUp(result.edad_integral);
        } else {
          haptic.light();
        }
      }, acc);
      timers.current.push(t);
      acc += p.ms;
    });
    const end = setTimeout(() => onDone(), acc);
    timers.current.push(end);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, result?.edad_integral]);

  function runCountUp(target: number) {
    const steps = 32;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplay(Math.min(target, (target * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 35);
  }

  if (!visible || !result) return null;
  const cur = phases[phase] ?? phases[0];
  const isReveal = phase >= revealIdx;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        {isReveal ? (
          <Animated.View entering={ZoomIn.duration(450)} style={styles.revealWrap}>
            <EliteText style={styles.revealLabel}>EDAD BIOLÓGICA INTEGRAL</EliteText>
            <EliteText style={styles.revealValue}>{display.toFixed(1)}</EliteText>
            <EliteText style={styles.revealSub}>cronológica {result.chronological_age}</EliteText>
          </Animated.View>
        ) : (
          <Animated.View key={phase} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.phaseWrap}>
            <EliteText style={styles.phaseEmoji}>{cur.emoji}</EliteText>
            <EliteText style={styles.phaseLabel}>{cur.label}</EliteText>
            <View style={styles.dots}>
              {phases.slice(0, revealIdx).map((_, i) => (
                <View key={i} style={[styles.dot, i <= phase && styles.dotOn]} />
              ))}
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  phaseWrap: { alignItems: 'center', gap: Spacing.md },
  phaseEmoji: { fontSize: 56 },
  phaseLabel: { color: '#fff', fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  dotOn: { backgroundColor: Colors.neonGreen },
  revealWrap: { alignItems: 'center', gap: 6 },
  revealLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs, letterSpacing: 2, fontFamily: Fonts.bold },
  revealValue: { color: Colors.neonGreen, fontSize: 80, fontFamily: Fonts.extraBold, lineHeight: 88 },
  revealSub: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
