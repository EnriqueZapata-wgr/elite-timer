/**
 * Test funcional — Reaction Time (Deary-Liewald): simple RT + choice RT.
 * Mide ms de respuesta y guarda promedios en edad_atp_functional_tests.
 * 30 simple + 30 choice; promedio descarta el 10% más lento (filtro de outliers).
 */
import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveFunctionalTests } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const SIMPLE_TRIALS = 30;
const CHOICE_TRIALS = 30;
type Phase = 'intro' | 'simple' | 'choice' | 'saving';

export default function ReactionTimeTest() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [phase, setPhase] = useState<Phase>('intro');
  const [trial, setTrial] = useState(0);
  const [armed, setArmed] = useState(false); // estímulo visible (simple)
  const [active, setActive] = useState(-1); // índice activo (choice)
  const startRef = useRef(0);
  const simpleTimes = useRef<number[]>([]);
  const choiceTimes = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSimple = useCallback(() => {
    setArmed(false);
    const delay = 1000 + Math.floor(((trial * 137) % 17) / 17 * 2000); // pseudo-aleatorio determinista
    timeoutRef.current = setTimeout(() => { setArmed(true); startRef.current = Date.now(); }, delay);
  }, [trial]);

  const scheduleChoice = useCallback(() => {
    setActive(-1);
    const delay = 800 + ((trial * 211) % 1500);
    timeoutRef.current = setTimeout(() => { setActive((trial * 3) % 4); startRef.current = Date.now(); }, delay);
  }, [trial]);

  function startSimple() { setPhase('simple'); setTrial(0); simpleTimes.current = []; setTimeout(scheduleSimple, 50); }

  function onSimpleTap() {
    if (!armed) return; // tap antes del estímulo → ignorar (falso inicio)
    const rt = Date.now() - startRef.current;
    simpleTimes.current.push(rt);
    haptic.light();
    const next = trial + 1;
    if (next >= SIMPLE_TRIALS) { startChoice(); return; }
    setTrial(next);
    setArmed(false);
    setTimeout(scheduleSimple, 400);
  }

  function startChoice() { setPhase('choice'); setTrial(0); choiceTimes.current = []; setActive(-1); setTimeout(scheduleChoice, 400); }

  function onChoiceTap(i: number) {
    if (active === -1 || i !== active) return;
    const rt = Date.now() - startRef.current;
    choiceTimes.current.push(rt);
    haptic.light();
    const next = trial + 1;
    if (next >= CHOICE_TRIALS) { finish(); return; }
    setTrial(next);
    setActive(-1);
    setTimeout(scheduleChoice, 400);
  }

  async function finish() {
    setPhase('saving');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Promedio con filtro de outliers: descarta el 10% más lento (lapsos de atención).
    const avg = (a: number[]) => {
      if (!a.length) return 0;
      const sorted = [...a].sort((x, y) => x - y);
      const keep = Math.max(1, Math.ceil(sorted.length * 0.9));
      const kept = sorted.slice(0, keep);
      return Math.round(kept.reduce((s, x) => s + x, 0) / kept.length);
    };
    const simple = avg(simpleTimes.current);
    const choice = avg(choiceTimes.current);
    if (user?.id) {
      await saveFunctionalTests(user.id, [
        { test_key: 'reaction_time_simple', value_primary: simple },
        { test_key: 'reaction_time_choice', value_primary: choice },
      ]);
    }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: 'reaction_time', simple, choice });
    haptic.success();
    Alert.alert('Test completado', `RT simple ${simple}ms · RT choice ${choice}ms`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  // Trigger del schedule cuando cambia trial (simple/choice).
  // (Se invoca desde los handlers vía setTimeout; aquí solo render.)

  return (
    <Screen>
      <PillarHeader pillar="mind" title="Tiempo de reacción" />
      <View style={styles.content}>
        {phase === 'intro' && (
          <View style={styles.center}>
            <EliteText variant="body" style={styles.title}>Deary-Liewald</EliteText>
            <EliteText variant="caption" style={styles.desc}>
              Fase 1: toca en cuanto el recuadro se ponga verde ({SIMPLE_TRIALS} veces).{'\n'}
              Fase 2: toca el recuadro que se ilumine entre 4 ({CHOICE_TRIALS} veces).{'\n'}
              No te adelantes: tocar antes no cuenta.
            </EliteText>
            <Pressable onPress={startSimple} style={styles.cta}><EliteText variant="body" style={styles.ctaText}>Empezar</EliteText></Pressable>
          </View>
        )}

        {phase === 'simple' && (
          <Pressable onPress={onSimpleTap} style={[styles.simpleTarget, armed ? styles.targetOn : styles.targetOff]}>
            <EliteText variant="body" style={styles.targetText}>{armed ? '¡TOCA!' : 'Espera…'}</EliteText>
            <EliteText variant="caption" style={styles.counter}>{trial + 1}/{SIMPLE_TRIALS}</EliteText>
          </Pressable>
        )}

        {phase === 'choice' && (
          <View style={styles.center}>
            <EliteText variant="caption" style={styles.counter}>{trial + 1}/{CHOICE_TRIALS}</EliteText>
            <View style={styles.choiceRow}>
              {[0, 1, 2, 3].map((i) => (
                <Pressable key={i} onPress={() => onChoiceTap(i)} style={[styles.choiceBox, active === i ? styles.targetOn : styles.targetOff]} />
              ))}
            </View>
            <EliteText variant="caption" style={styles.desc}>Toca el que se ilumine</EliteText>
          </View>
        )}

        {phase === 'saving' && <EliteText variant="caption" style={styles.desc}>Guardando…</EliteText>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  title: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  desc: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  cta: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  ctaText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  simpleTarget: { flex: 1, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  targetOn: { backgroundColor: Colors.neonGreen },
  targetOff: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#1a1a1a' },
  targetText: { color: Colors.textOnGreen, fontFamily: Fonts.extraBold, fontSize: FontSizes.xl },
  counter: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  choiceRow: { flexDirection: 'row', gap: Spacing.sm },
  choiceBox: { width: 70, height: 120, borderRadius: Radius.md },
});
