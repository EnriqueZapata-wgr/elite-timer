/**
 * Test funcional — Cognición (Der & Deary 2006): Simple RT + Choice 4-AFC + Go/No-Go.
 * Mide ms de respuesta (+ tasa de errores en Go/No-Go) y guarda en
 * edad_atp_functional_tests con keys: reaction_time_simple, reaction_time_choice,
 * go_no_go_rt_hits, go_no_go_error_rate.
 *
 * - 20 trials por modo. Go/No-Go ratio 75/25 (go/no-go).
 * - Randomización REAL via PRNG mulberry32 seedeado por sesión (sin librerías nuevas).
 * - Filtro de outliers: descarta el 10% de hits más lentos.
 * - Fix B5: NO-GO con retención correcta (1500 ms sin tocar) = "correct withhold" y el
 *   trial AVANZA SOLO. Lógica pura en gng-trial-flow.ts (testeada con PRNG seeded).
 * - v2.1: los errores de comisión se VEN — flash rojo + haptic.error + contador en vivo
 *   "Errores: N", y la pantalla de resultado muestra accuracy (la inhibición es
 *   resultado de primera clase, no nota al pie).
 *
 * ÚNICO test que se vive en la app (doctrina 2): el teléfono ES el instrumento.
 */
import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveFunctionalTests } from '@/src/services/edad-atp/capture-service';
import {
  mulberry32, avgNoOutliers, buildGngSchedule, gngErrorRatePct,
  GNG_WITHHOLD_MS, type GngStimulus,
} from '@/src/services/edad-atp/gng-trial-flow';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const TRIALS = 20;
const DEMO_TRIALS = 2;

type Mode = 'simple' | 'choice' | 'gng';
type Phase = 'instruction' | 'demo' | 'run' | 'saving' | 'result';

type Summary = { simple: number; choice: number; gngRt: number; errRate: number; errors: number; noGoTotal: number; correctWithholds: number };

const MODE_ORDER: Mode[] = ['simple', 'choice', 'gng'];
const MODE_COPY: Record<Mode, { title: string; instr: string }> = {
  simple: { title: 'Fase 1 — Reacción simple', instr: 'Toca la pantalla en cuanto el recuadro se ponga VERDE. No te adelantes: tocar antes no cuenta. Primero 2 intentos de práctica.' },
  choice: { title: 'Fase 2 — Elección (4 opciones)', instr: 'Toca el recuadro que se ILUMINE entre los 4. Rápido y preciso. Primero 2 intentos de práctica.' },
  gng: { title: 'Fase 3 — Go / No-Go', instr: 'Toca cuando el estímulo sea VERDE (Go). Si es ROJO (No-Go), NO toques: retén y el trial avanza solo. Mide tu inhibición. Primero 2 intentos de práctica.' },
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
  const [errorCount, setErrorCount] = useState(0); // comisiones visibles en vivo (v2.1)
  const [summary, setSummary] = useState<Summary | null>(null); // pantalla de resultado
  const flash = useSharedValue(0); // overlay rojo al fallar un NO-GO
  const startRef = useRef(0);
  const rngRef = useRef<() => number>(mulberry32(1));
  const seededRef = useRef(false);
  const demoLeft = useRef(0);
  const simpleTimes = useRef<number[]>([]);
  const choiceTimes = useRef<number[]>([]);
  const gngHits = useRef<number[]>([]);
  const gngErrors = useRef(0); // comisiones (tap en no-go)
  const gngWithholds = useRef(0); // retenciones correctas en no-go (fix B5)
  const gngSchedule = useRef<GngStimulus[]>([]); // estímulos pre-decididos con el PRNG
  const gngIdx = useRef(0); // índice dentro del schedule actual (demo o run)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const withholdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // El timeout de withhold se crea dentro de schedule() (closure vieja) → ref siempre
  // apuntando al handler del último render para leer phase/trial frescos.
  const onWithholdRef = useRef<() => void>(() => {});

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
    if (withholdTimer.current) clearTimeout(withholdTimer.current);
    const delay = 800 + Math.floor(rand() * 1800); // intervalo aleatorio real
    timeoutRef.current = setTimeout(() => {
      startRef.current = Date.now();
      if (m === 'simple') setArmed(true);
      else if (m === 'choice') setActive(Math.floor(rand() * 4));
      else {
        // Estímulo pre-decidido en el schedule de la corrida (PRNG de la sesión).
        const stim = gngSchedule.current[gngIdx.current] ?? (rand() < 0.25 ? 'nogo' : 'go');
        gngIdx.current += 1;
        if (stim === 'nogo') {
          setIsNoGo(true);
          // Fix B5: retener GNG_WITHHOLD_MS = correct withhold → el trial avanza solo.
          withholdTimer.current = setTimeout(() => onWithholdRef.current(), GNG_WITHHOLD_MS);
        } else {
          setArmed(true);
        }
      }
    }, delay);
  }, []);

  function startInstruction(idx: number) { setModeIdx(idx); setPhase('instruction'); setTrial(0); }

  function startDemo() {
    ensureSeed();
    demoLeft.current = DEMO_TRIALS;
    if (mode === 'gng') { gngSchedule.current = buildGngSchedule(rand, DEMO_TRIALS); gngIdx.current = 0; }
    setPhase('demo'); setTrial(0);
    setTimeout(() => schedule(mode), 300);
  }

  function startRun() {
    setPhase('run'); setTrial(0);
    if (mode === 'simple') simpleTimes.current = [];
    if (mode === 'choice') choiceTimes.current = [];
    if (mode === 'gng') {
      gngHits.current = []; gngErrors.current = 0; gngWithholds.current = 0;
      gngSchedule.current = buildGngSchedule(rand, TRIALS);
      gngIdx.current = 0;
      setErrorCount(0);
    }
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
    if (withholdTimer.current) clearTimeout(withholdTimer.current);
    if (modeIdx + 1 < MODE_ORDER.length) startInstruction(modeIdx + 1);
    else finish();
  }

  // Retención correcta en NO-GO (fix B5): registrar y avanzar solo. Asignado cada
  // render para que el timeout (closure vieja de schedule) lea phase/trial frescos.
  onWithholdRef.current = () => {
    if (phase === 'run') gngWithholds.current += 1;
    setIsNoGo(false); haptic.light();
    advance(phase === 'demo');
  };

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
      // Comisión: tocó en no-go → error (cancela el withhold pendiente). v2.1: se VE.
      if (withholdTimer.current) clearTimeout(withholdTimer.current);
      if (phase === 'run') { gngErrors.current += 1; setErrorCount((n) => n + 1); }
      setIsNoGo(false); haptic.error();
      flash.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 320 }));
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
    if (withholdTimer.current) clearTimeout(withholdTimer.current);
    const simple = avgNoOutliers(simpleTimes.current);
    const choice = avgNoOutliers(choiceTimes.current);
    const gngRt = avgNoOutliers(gngHits.current);
    // Tasa de errores Go/No-Go: comisiones sobre el TOTAL de trials presentados.
    // Denominador consistente con el withhold automático: todos los trials completan
    // (hits + comisiones + retenciones correctas = TRIALS).
    const errRate = gngErrorRatePct(gngErrors.current, TRIALS);
    if (user?.id) {
      await saveFunctionalTests(user.id, [
        { test_key: 'reaction_time_simple', value_primary: simple },
        { test_key: 'reaction_time_choice', value_primary: choice },
        { test_key: 'go_no_go_rt_hits', value_primary: gngRt },
        { test_key: 'go_no_go_error_rate', value_primary: errRate },
      ]);
    }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: 'reaction_time', simple, choice, gng_rt: gngRt, gng_err: errRate, gng_withholds: gngWithholds.current });
    haptic.success();
    // Inhibición: retenciones correctas sobre el total de estímulos NO-GO presentados
    // (= retenciones + comisiones). Es la medida principal del Go/No-Go.
    const noGoTotal = gngWithholds.current + gngErrors.current;
    setSummary({ simple, choice, gngRt, errRate, errors: gngErrors.current, noGoTotal, correctWithholds: gngWithholds.current });
    setPhase('result');
  }

  const counter = `${Math.min(trial + 1, TRIALS)}/${TRIALS}`;
  const isDemo = phase === 'demo';
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

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
            {!isDemo ? (
              <EliteText variant="caption" style={[styles.errCounter, errorCount > 0 && styles.errCounterOn]}>
                Errores: {errorCount}
              </EliteText>
            ) : null}
          </Pressable>
        )}

        {phase === 'saving' && <EliteText variant="caption" style={styles.desc}>Guardando…</EliteText>}

        {phase === 'result' && summary && (
          <View style={styles.center}>
            <EliteText variant="body" style={styles.title}>Resultado</EliteText>
            <View style={styles.resultCard}>
              <View style={styles.resultRow}><EliteText variant="body" style={styles.resultLabel}>Reacción simple</EliteText><EliteText variant="body" style={styles.resultVal}>{summary.simple} ms</EliteText></View>
              <View style={styles.resultRow}><EliteText variant="body" style={styles.resultLabel}>Elección (4-AFC)</EliteText><EliteText variant="body" style={styles.resultVal}>{summary.choice} ms</EliteText></View>
              <View style={styles.resultRow}><EliteText variant="body" style={styles.resultLabel}>Go/No-Go (hits)</EliteText><EliteText variant="body" style={styles.resultVal}>{summary.gngRt} ms</EliteText></View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <EliteText variant="body" style={styles.resultLabel}>Inhibición (No-Go)</EliteText>
                <EliteText variant="body" style={[styles.resultVal, summary.errors === 0 ? styles.resultGood : styles.resultBad]}>
                  {summary.correctWithholds}/{summary.noGoTotal} correctos
                </EliteText>
              </View>
              <View style={styles.resultRow}>
                <EliteText variant="body" style={styles.resultLabel}>Errores de comisión</EliteText>
                <EliteText variant="body" style={[styles.resultVal, summary.errors === 0 ? styles.resultGood : styles.resultBad]}>
                  {summary.errors} ({summary.errRate}%)
                </EliteText>
              </View>
            </View>
            <Pressable onPress={() => router.back()} style={styles.cta}><EliteText variant="body" style={styles.ctaText}>Listo</EliteText></Pressable>
          </View>
        )}
      </View>

      {/* Flash rojo al fallar un NO-GO (v2.1: los errores se VEN). */}
      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
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
  errCounter: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4, fontFamily: Fonts.semiBold },
  errCounterOn: { color: '#fff', backgroundColor: 'rgba(226,75,74,0.85)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm, overflow: 'hidden' },
  choiceRow: { flexDirection: 'row', gap: Spacing.sm },
  choiceBox: { width: 70, height: 120, borderRadius: Radius.md },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E24B4A' },
  resultCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a', gap: Spacing.xs },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  resultLabel: { color: Colors.textSecondary },
  resultVal: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  resultGood: { color: Colors.neonGreen },
  resultBad: { color: '#E24B4A' },
  resultDivider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: Spacing.xs },
});
