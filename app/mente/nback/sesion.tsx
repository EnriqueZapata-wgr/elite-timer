/**
 * N-Back — sesión activa (norte UX: referencia de Enrique).
 *
 * Countdown (¿Listo? / En posición. / ¡Va!) → gameplay full-black (grid 3×3
 * con crosshair, cuadro que se ilumina 500ms, letra hablada, botones POSICIÓN
 * y SONIDO) → resultados (barras con umbrales 75/90, cambio de nivel, rounds
 * restantes, economía). FULL FOCUS: cero ARGOS/nav flotante (isMentePillarPath).
 *
 * Timing: 3s por trial a 1x (decisión #44-2), speed divide. Primera sesión:
 * N=1 forzado (tutorial, #44-1); después resume_mode. Al completar round:
 * nback_sessions + estado + e- (1er round del día) + claim H+ (mig 218).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  NBACK_CONFIG, generateRound, scoreChannel, evaluateRound, startingN,
  trialDurationMs, stimuliCountFor, type NBackRound, type NBackRoundResult,
} from '@/src/services/nback-core';
import { createNBackAudio, type NBackAudioHandle } from '@/src/services/nback-audio';
import {
  fetchNBackState, completeNBackRound, getNBackSettings,
  DEFAULT_NBACK_SETTINGS, type NBackSettings, type RoundOutcome,
} from '@/src/services/nback-service';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

type Phase = 'loading' | 'countdown' | 'playing' | 'saving' | 'results';

const COUNTDOWN_STEPS = ['¿Listo?', 'En posición.', '¡Va!'];
const RAISE_PCT = NBACK_CONFIG.RAISE_THRESHOLD * 100;
const DROP_PCT = NBACK_CONFIG.DROP_THRESHOLD * 100;

interface ResultsView {
  result: NBackRoundResult;
  outcome: RoundOutcome | null;
  n: number;
}

export default function NBackSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  useKeepAwake();

  const [phase, setPhase] = useState<Phase>('loading');
  const [countdownIdx, setCountdownIdx] = useState(0);
  const [n, setN] = useState<number>(NBACK_CONFIG.N_START);
  const [isTutorial, setIsTutorial] = useState(false);
  const [trialIdx, setTrialIdx] = useState(0);
  const [litCell, setLitCell] = useState<number | null>(null);
  const [pressedThisTrial, setPressedThisTrial] = useState<{ v: boolean; a: boolean }>({ v: false, a: false });
  const [flash, setFlash] = useState<{ channel: 'v' | 'a'; ok: boolean } | null>(null);
  const [results, setResults] = useState<ResultsView | null>(null);

  const settingsRef = useRef<NBackSettings>(DEFAULT_NBACK_SETTINGS);
  const audioRef = useRef<NBackAudioHandle | null>(null);
  const roundRef = useRef<NBackRound | null>(null);
  const trialRef = useRef(0);
  const pressedVRef = useRef<boolean[]>([]);
  const pressedARef = useRef<boolean[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedAtRef = useRef(new Date());
  const aliveRef = useRef(true);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => { if (aliveRef.current) fn(); }, ms);
    timersRef.current.push(t);
  }, []);

  // ── Carga inicial: settings + estado + audio ──
  useEffect(() => {
    aliveRef.current = true;
    (async () => {
      const [settings, audio] = await Promise.all([getNBackSettings(), createNBackAudio()]);
      if (!aliveRef.current) { audio.dispose(); return; }
      settingsRef.current = settings;
      audioRef.current = audio;
      let startN: number = NBACK_CONFIG.N_START;
      let tutorial = false;
      if (user?.id) {
        const st = await fetchNBackState(user.id);
        tutorial = st.sessions_total === 0;
        startN = startingN(st.sessions_total, st.current_n, st.best_n, settings.resumeMode);
      }
      if (!aliveRef.current) return;
      setIsTutorial(tutorial);
      setN(startN);
      startCountdown(startN);
    })();
    return () => {
      aliveRef.current = false;
      clearTimers();
      audioRef.current?.dispose();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown ──
  const startCountdown = useCallback((forN: number) => {
    setPhase('countdown');
    setCountdownIdx(0);
    later(() => setCountdownIdx(1), 900);
    later(() => setCountdownIdx(2), 1800);
    later(() => startRound(forN), 2600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Round ──
  const startRound = useCallback((forN: number) => {
    const round = generateRound(forN);
    roundRef.current = round;
    trialRef.current = 0;
    pressedVRef.current = new Array(round.positions.length).fill(false);
    pressedARef.current = new Array(round.positions.length).fill(false);
    startedAtRef.current = new Date();
    setN(forN);
    setPhase('playing');
    runTrial(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runTrial = useCallback((i: number) => {
    const round = roundRef.current;
    if (!round) return;
    if (i >= round.positions.length) { finishRound(); return; }
    trialRef.current = i;
    setTrialIdx(i);
    setPressedThisTrial({ v: false, a: false });
    setFlash(null);
    setLitCell(round.positions[i]);
    audioRef.current?.play(round.letters[i]);
    const trialMs = trialDurationMs(settingsRef.current.speed);
    later(() => setLitCell(null), NBACK_CONFIG.STIMULUS_VISIBLE_MS);
    later(() => runTrial(i + 1), trialMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = useCallback((channel: 'v' | 'a') => {
    const round = roundRef.current;
    if (!round || phase !== 'playing') return;
    const i = trialRef.current;
    const pressedArr = channel === 'v' ? pressedVRef.current : pressedARef.current;
    if (pressedArr[i]) return; // un press por canal por trial
    pressedArr[i] = true;
    setPressedThisTrial(prev => ({ ...prev, [channel]: true }));
    const isMatch = channel === 'v' ? round.visualMatches[i] : round.audioMatches[i];
    if (settingsRef.current.feedbackSound) {
      // Feedback suave (spec #6): verde acierto / rojo error — degradable en settings.
      setFlash({ channel, ok: isMatch });
      if (isMatch) haptic.light(); else haptic.warning();
      later(() => setFlash(null), 350);
    } else {
      haptic.light();
    }
  }, [phase, later]);

  // ── Fin del round: score → persistir → resultados ──
  const finishRound = useCallback(async () => {
    const round = roundRef.current;
    if (!round) return;
    clearTimers();
    setLitCell(null);
    setPhase('saving');
    const visual = scoreChannel(round.visualMatches, pressedVRef.current);
    const audio = scoreChannel(round.audioMatches, pressedARef.current);
    const result = evaluateRound(visual.accuracy, audio.accuracy, round.n);
    const trialMs = trialDurationMs(settingsRef.current.speed);
    const durationMin = (round.positions.length * trialMs) / 60000;

    let outcome: RoundOutcome | null = null;
    if (user?.id) {
      try {
        outcome = await completeNBackRound(user.id, {
          startedAt: startedAtRef.current,
          visual, audio, result,
          nLevel: round.n,
          stimuliCount: stimuliCountFor(round.n),
          speed: settingsRef.current.speed,
          durationMin,
        });
      } catch {
        Alert.alert('Round no guardado', 'Terminaste el round pero no pudimos registrarlo. Revisa tu conexión.');
      }
    }
    if (!aliveRef.current) return;
    haptic.success();
    setResults({ result, outcome, n: round.n });
    setPhase('results');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const continueNextRound = useCallback(() => {
    if (!results) return;
    haptic.medium();
    setResults(null);
    startCountdown(results.result.nextN);
  }, [results, startCountdown]);

  // ── Salida con confirmación durante el juego (el round en curso se pierde) ──
  const handleExit = useCallback(() => {
    if (phase === 'playing' || phase === 'countdown') {
      Alert.alert('¿Salir de la sesión?', 'El round en curso no se guardará.', [
        { text: 'Seguir jugando', style: 'cancel' },
        {
          text: 'Salir', style: 'destructive',
          onPress: () => { clearTimers(); router.back(); },
        },
      ]);
      return;
    }
    router.back();
  }, [phase, router, clearTimers]);

  const round = roundRef.current;
  const totalTrials = round ? round.positions.length : stimuliCountFor(n);

  // ── Render ──
  return (
    <View style={[s.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <AnimatedPressable style={s.headerBtn} onPress={handleExit}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </AnimatedPressable>
        <EliteText style={s.headerTitle}>
          Nivel {n}{isTutorial ? ' · Tutorial' : ''}
        </EliteText>
        <View style={s.headerBtn}>
          {phase === 'playing' && (
            <EliteText style={s.trialCounter}>{Math.min(trialIdx + 1, totalTrials)}/{totalTrials}</EliteText>
          )}
        </View>
      </View>

      {phase === 'loading' && (
        <View style={s.center}><EliteText style={s.countdownText}>…</EliteText></View>
      )}

      {phase === 'countdown' && (
        <View style={s.center}>
          <Animated.View key={countdownIdx} entering={FadeIn.duration(200)}>
            <EliteText style={s.countdownText}>{COUNTDOWN_STEPS[countdownIdx]}</EliteText>
          </Animated.View>
          {countdownIdx === 0 && (
            <EliteText style={s.countdownHint}>
              POSICIÓN si la celda se repite de hace {n} · SONIDO si la letra se repite de hace {n}
            </EliteText>
          )}
        </View>
      )}

      {(phase === 'playing' || phase === 'saving') && (
        <>
          <View style={s.center}>
            {/* Grid 3×3 con crosshair al centro */}
            <View style={s.grid}>
              {Array.from({ length: 9 }, (_, gi) => {
                if (gi === 4) {
                  return (
                    <View key={gi} style={s.gridCell}>
                      <EliteText style={s.crosshair}>+</EliteText>
                    </View>
                  );
                }
                // Celda 0..7 → índice de grid saltando el centro (mismo mapeo
                // que cellToRowCol del core).
                const lit = litCell !== null && gi === (litCell >= 4 ? litCell + 1 : litCell);
                return (
                  <View key={gi} style={[s.gridCell, lit && s.gridCellLit]} />
                );
              })}
            </View>
          </View>

          {/* Botones POSICIÓN / SONIDO */}
          <View style={s.buttonsRow}>
            <AnimatedPressable
              style={[
                s.matchBtn,
                pressedThisTrial.v && s.matchBtnPressed,
                flash?.channel === 'v' && (flash.ok ? s.matchBtnOk : s.matchBtnBad),
              ]}
              onPress={() => press('v')}
            >
              <Ionicons name="apps-outline" size={26} color="#fff" />
              <EliteText style={s.matchBtnText}>POSICIÓN</EliteText>
            </AnimatedPressable>
            <AnimatedPressable
              style={[
                s.matchBtn,
                pressedThisTrial.a && s.matchBtnPressed,
                flash?.channel === 'a' && (flash.ok ? s.matchBtnOk : s.matchBtnBad),
              ]}
              onPress={() => press('a')}
            >
              <Ionicons name="volume-high-outline" size={26} color="#fff" />
              <EliteText style={s.matchBtnText}>SONIDO</EliteText>
            </AnimatedPressable>
          </View>
        </>
      )}

      {phase === 'results' && results && (
        <Animated.View entering={FadeInUp.duration(350)} style={s.resultsWrap}>
          <EliteText style={s.resultsTitle}>
            {results.result.promoted ? 'Nivel superado' : results.result.demoted ? 'Ajustamos el reto' : 'Buen round'}
          </EliteText>

          <ResultBar label="Posición" pct={Math.round(results.result.accuracyVisual * 100)} />
          <ResultBar label="Sonido" pct={Math.round(results.result.accuracyAudio * 100)} />
          <EliteText style={s.thresholdHint}>
            &lt;{DROP_PCT}% en un canal baja el nivel · ≥{RAISE_PCT}% en ambos lo sube
          </EliteText>

          <View style={s.levelCard}>
            <EliteText style={s.levelCardTitle}>
              {results.result.promoted
                ? `Nivel sube a ${results.result.nextN}`
                : results.result.demoted
                  ? `Nivel baja a ${results.result.nextN}`
                  : `Sigues en nivel ${results.result.nextN}`}
            </EliteText>
            {results.outcome && (
              <EliteText style={s.levelCardSub}>
                {Math.max(0, NBACK_CONFIG.ROUNDS_PER_DAY - results.outcome.roundsToday)} rounds restantes hoy
              </EliteText>
            )}
            {/* Economía: e- del día + H+ (decisión #44-5) */}
            <View style={s.rewardsRow}>
              {results.outcome?.electronAwarded && (
                <View style={s.rewardChip}><EliteText style={s.rewardText}>+2.5 e- · HOY ✓</EliteText></View>
              )}
              {(results.outcome?.protons ?? []).map((p, i) => (
                <View key={i} style={s.rewardChip}>
                  <EliteText style={s.rewardText}>
                    +{p.amount} H+ {p.kind === 'daily' ? '· sesión completa' : p.kind === 'pr' ? `· récord N=${p.n ?? ''}` : p.kind === 'streak7' ? '· racha 7 días' : '· racha 30 días'}
                  </EliteText>
                </View>
              ))}
            </View>
          </View>

          <AnimatedPressable style={s.continueBtn} onPress={continueNextRound}>
            <EliteText style={s.continueText}>CONTINUAR</EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={s.endBtn} onPress={() => { haptic.light(); router.back(); }}>
            <EliteText style={s.endText}>Terminar por hoy</EliteText>
          </AnimatedPressable>
        </Animated.View>
      )}
    </View>
  );
}

function ResultBar({ label, pct }: { label: string; pct: number }) {
  return (
    <View style={s.barBlock}>
      <View style={s.barLabelRow}>
        <EliteText style={s.barLabel}>{label}</EliteText>
        <EliteText style={s.barPct}>{pct}%</EliteText>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.min(100, pct)}%` }, pct < DROP_PCT && { backgroundColor: '#f87171' }]} />
        {/* Umbrales 75/90 de la referencia */}
        <View style={[s.barMark, { left: `${DROP_PCT}%` }]} />
        <View style={[s.barMark, { left: `${RAISE_PCT}%` }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000', paddingHorizontal: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 64, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: FontSizes.lg, fontFamily: Fonts.bold, letterSpacing: 1 },
  trialCounter: { color: TEXT.tertiary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  countdownText: { color: '#fff', fontSize: 44, fontFamily: Fonts.extraBold, letterSpacing: 1 },
  countdownHint: {
    color: TEXT.tertiary, fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: Spacing.lg, paddingHorizontal: Spacing.lg, lineHeight: 20,
  },

  grid: {
    width: 300, height: 300, flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, alignContent: 'center', justifyContent: 'center',
  },
  gridCell: {
    width: 94, height: 94, borderRadius: Radius.md,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    alignItems: 'center', justifyContent: 'center',
  },
  gridCellLit: { backgroundColor: '#fff', borderColor: '#fff' },
  crosshair: { color: TEXT.tertiary, fontSize: 26, fontFamily: Fonts.regular },

  buttonsRow: { flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: Spacing.md },
  matchBtn: {
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  matchBtnPressed: { borderColor: withOpacity(ATP_BRAND.lime, 0.6) },
  matchBtnOk: { borderColor: ATP_BRAND.lime, backgroundColor: withOpacity(ATP_BRAND.lime, 0.12) },
  matchBtnBad: { borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.12)' },
  matchBtnText: { color: '#fff', fontSize: 12, fontFamily: Fonts.bold, letterSpacing: 2 },

  resultsWrap: { flex: 1, justifyContent: 'center' },
  resultsTitle: {
    color: '#fff', fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: 0.5,
    marginBottom: Spacing.lg,
  },
  barBlock: { marginBottom: Spacing.md },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, letterSpacing: 1 },
  barPct: { color: '#fff', fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)' },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: ATP_BRAND.lime },
  barMark: { position: 'absolute', top: -3, width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.45)' },
  thresholdHint: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginBottom: Spacing.md },

  levelCard: {
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm,
  },
  levelCardTitle: { color: ATP_BRAND.lime, fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  levelCardSub: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 4 },
  rewardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rewardChip: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  rewardText: { color: ATP_BRAND.lime, fontSize: FontSizes.xs, fontFamily: Fonts.bold },

  continueBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.pill,
    alignItems: 'center', paddingVertical: 14, marginTop: Spacing.lg,
  },
  continueText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2 },
  endBtn: { alignItems: 'center', paddingVertical: 14 },
  endText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
