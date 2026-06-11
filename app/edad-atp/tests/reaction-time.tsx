/**
 * Test funcional — Cognición (Der & Deary 2006): Simple RT + Choice 4-AFC + Go/No-Go.
 * Mide ms de respuesta (+ tasa de errores en Go/No-Go) y guarda en
 * edad_atp_functional_tests con keys: reaction_time_simple, reaction_time_choice,
 * go_no_go_rt_hits, go_no_go_error_rate.
 *
 * - 20 trials por modo. Go/No-Go ratio 75/25 (go/no-go).
 * - Randomización REAL via PRNG mulberry32 seedeado por sesión (sin librerías nuevas).
 * - Filtro de outliers: descarta el 10% de hits más lentos.
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

const TRIALS = 20;
const GNG_NOGO_RATIO = 0.25; // 25% de los estímulos son "no-go" (rojo = NO tocar)

type Mode = 'simple' | 'choice' | 'gng';
type Phase = 'instruction' | 'demo' | 'run' | 'saving';

/** PRNG mulberry32: determinista dado un seed, pero distinto cada sesión. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Promedio con filtro de outliers: descarta el 10% más lento (lapsos de atención). */
function avgNoOutliers(a: number[]): number {
  if (!a.length) return 0;
  const sorted = [...a].sort((x, y) => x - y);
  const keep = Math.max(1, Math.ceil(sorted.length * 0.9));
  const kept = sorted.slice(0, keep);
  return Math.round(kept.reduce((s, x) => s + x, 0) / kept.length);
}

const MODE_ORDER: Mode[] = ['simple', 'choice', 'gng'];
const MODE_COPY: Record<Mode, { title: string; instr: string }> = {
  simple: { title: 'Fase 1 — Reacción simple', instr: 'Toca la pantalla en cuanto el recuadro se ponga VERDE. No te adelantes: tocar antes no cuenta. Primero 2 intentos de práctica.' },
  choice: { title: 'Fase 2 — Elección (4 opciones)', instr: 'Toca el recuadro que se ILUMINE entre los 4. Rápido y preciso. Primero 2 intentos de práctica.' },
  gng: { title: 'Fase 3 — Go / No-Go', instr: 'Toca cuando el estímulo sea VERDE (Go). NO toques si es ROJO (No-Go). Mide tu inhibición. Primero 2 intentos de práctica.' },
};

export default function ReactionTimeTest() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [modeIdx, setModeIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('instruction');
  const [trial, setTrial] = useState(0);
  const [armed, setArmed] = useState(false); // estímulo visible (simple/gng go)
  const [active, setActive] = useState(-1); // índice iluminado (choice)
  const [isNoGo, setIsNoGo] = useState(false); // estímulo no-go visible (gng)
  const startRef = useRef(0);
  const rngRef = useRef<() => number>(mulberry32(1));
  const seededRef = useRef(false);
  const demoLeft = useRef(0);
  const simpleTimes = useRef<number[]>([]);
  const choiceTimes = useRef<number[]>([]);
  const gngHits = useRef<number[]>([]);
  const gngErrors = useRef(0); // comisiones (tap en no-go) + omisiones (no tap en go)
  const gngGoCount = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mode = MODE_ORDER[modeIdx];

  /** Seed por sesión: usa el reloj solo una vez al primer arranque (no rompe resume). */
  const ensureSeed = useCallback(() => {
    if (seededRef.current) return;
    rngRef.current = mulberry32((Date.now() & 0xffffffff) || 1);
    seededRef.current = true;
  }, []);

  const rand = () => rngRef.current();

  const schedule = useCallback((m: Mode) => {
    setArmed(false); setActive(-1); setIsNoGo(false);
    const delay = 800 + Math.floor(rand() * 1800); // intervalo aleatorio real
    timeoutRef.current = setTimeout(() => {
      startRef.current = Date.now();
      if (m === 'simple') setArmed(true);
      else if (m === 'choice') setActive(Math.floor(rand() * 4));
      else {
        const noGo = rand() < GNG_NOGO_RATIO;
        if (noGo) setIsNoGo(true); else { setArmed(true); gngGoCount.current += 1; }
      }
    }, delay);
  }, []);

  function startInstruction(idx: number) { setModeIdx(idx); setPhase('instruction'); setTrial(0); }

  function startDemo() {
    ensureSeed();
    demoLeft.current = 2;
    setPhase('demo'); setTrial(0);
    setTimeout(() => schedule(mode), 300);
  }

  function startRun() {
    setPhase('run'); setTrial(0);
    if (mode === 'simple') simpleTimes.current = [];
    if (mode === 'choice') choiceTimes.current = [];
    if (mode === 'gng') { gngHits.current = []; gngErrors.current = 0; gngGoCount.current = 0; }
    setTimeout(() => schedule(mode), 300);
  }

  function advance(isDemo: boolean) {
    if (isDemo) {
      demoLeft.current -= 1;
      if (demoLeft.current <= 0) { startRun(); return; }
      setTimeout(() => schedule(mode), 400);
      return;
    }
    const next = trial + 1;
    if (next >= TRIALS) { nextModeOrFinish(); return; }
    setTrial(next);
    setTimeout(() => schedule(mode), 400);
  }

  function nextModeOrFinish() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (modeIdx + 1 < MODE_ORDER.length) startInstruction(modeIdx + 1);
    else finish();
  }

  function onSimpleTap() {
    if (!armed) return; // tap antes del estímulo → ignorar (falso inicio)
    const rt = Date.now() - startRef.current;
    if (phase === 'run') simpleTimes.current.push(rt);
    setArmed(false); haptic.light();
    advance(phase === 'demo');
  }

  function onChoiceTap(i: number) {
    if (active === -1 || i !== active) return;
    const rt = Date.now() - startRef.current;
    if (phase === 'run') choiceTimes.current.push(rt);
    setActive(-1); haptic.light();
    advance(phase === 'demo');
  }

  function onGngTap() {
    if (!armed && !isNoGo) return; // sin estímulo aún
    if (isNoGo) {
      // Comisión: tocó en no-go → error.
      if (phase === 'run') gngErrors.current += 1;
      setIsNoGo(false); haptic.warning();
      advance(phase === 'demo');
      return;
    }
    const rt = Date.now() - startRef.current;
    if (phase === 'run') gngHits.current.push(rt);
    setArmed(false); haptic.light();
    advance(phase === 'demo');
  }

  async function finish() {
    setPhase('saving');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const simple = avgNoOutliers(simpleTimes.current);
    const choice = avgNoOutliers(choiceTimes.current);
    const gngRt = avgNoOutliers(gngHits.current);
    // Tasa de errores Go/No-Go: comisiones sobre el total de estímulos go presentados.
    const errRate = gngGoCount.current > 0 ? Math.round((gngErrors.current / TRIALS) * 100) : 0;
    if (user?.id) {
      await saveFunctionalTests(user.id, [
        { test_key: 'reaction_time_simple', value_primary: simple },
        { test_key: 'reaction_time_choice', value_primary: choice },
        { test_key: 'go_no_go_rt_hits', value_primary: gngRt },
        { test_key: 'go_no_go_error_rate', value_primary: errRate },
      ]);
    }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: 'reaction_time', simple, choice, gng_rt: gngRt, gng_err: errRate });
    haptic.success();
    Alert.alert('Test completado', `Simple ${simple}ms · Choice ${choice}ms · Go/No-Go ${gngRt}ms (${errRate}% err)`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  const counter = `${Math.min(trial + 1, TRIALS)}/${TRIALS}`;
  const isDemo = phase === 'demo';

  return (
    <Screen>
      <PillarHeader pillar="mind" title="Cognición · tiempo de reacción" />
      <View style={styles.content}>
        {phase === 'instruction' && (
          <View style={styles.center}>
            <EliteText variant="body" style={styles.title}>{MODE_COPY[mode].title}</EliteText>
            <EliteText variant="caption" style={styles.desc}>{MODE_COPY[mode].instr}</EliteText>
            <Pressable onPress={startDemo} style={styles.cta}><EliteText variant="body" style={styles.ctaText}>Practicar</EliteText></Pressable>
          </View>
        )}

        {(phase === 'demo' || phase === 'run') && mode === 'simple' && (
          <Pressable onPress={onSimpleTap} style={[styles.target, armed ? styles.targetOn : styles.targetOff]}>
            <EliteText variant="body" style={styles.targetText}>{armed ? '¡TOCA!' : 'Espera…'}</EliteText>
            <EliteText variant="caption" style={styles.counter}>{isDemo ? 'práctica' : counter}</EliteText>
          </Pressable>
        )}

        {(phase === 'demo' || phase === 'run') && mode === 'choice' && (
          <View style={styles.center}>
            <EliteText variant="caption" style={styles.counter}>{isDemo ? 'práctica' : counter}</EliteText>
            <View style={styles.choiceRow}>
              {[0, 1, 2, 3].map((i) => (
                <Pressable key={i} onPress={() => onChoiceTap(i)} style={[styles.choiceBox, active === i ? styles.targetOn : styles.targetOff]} />
              ))}
            </View>
            <EliteText variant="caption" style={styles.desc}>Toca el que se ilumine</EliteText>
          </View>
        )}

        {(phase === 'demo' || phase === 'run') && mode === 'gng' && (
          <Pressable onPress={onGngTap} style={[styles.target, armed ? styles.targetOn : isNoGo ? styles.targetNoGo : styles.targetOff]}>
            <EliteText variant="body" style={styles.targetText}>{armed ? 'GO ¡TOCA!' : isNoGo ? 'NO-GO ✋' : 'Espera…'}</EliteText>
            <EliteText variant="caption" style={styles.counter}>{isDemo ? 'práctica' : counter}</EliteText>
          </Pressable>
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
  target: { flex: 1, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  targetOn: { backgroundColor: Colors.neonGreen },
  targetOff: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#1a1a1a' },
  targetNoGo: { backgroundColor: '#E24B4A' },
  targetText: { color: Colors.textOnGreen, fontFamily: Fonts.extraBold, fontSize: FontSizes.xl },
  counter: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  choiceRow: { flexDirection: 'row', gap: Spacing.sm },
  choiceBox: { width: 70, height: 120, borderRadius: Radius.md },
});
