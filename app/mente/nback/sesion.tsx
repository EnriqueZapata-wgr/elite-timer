/**
 * N-Back — sesión activa (norte UX: referencia de Enrique).
 *
 * Countdown (¿Listo? / En posición. / ¡Va!) → gameplay full-black (grid 3×3
 * con crosshair, cuadro que se ilumina 500ms, letra hablada, botones POSICIÓN
 * y SONIDO) → resultados (barras con umbrales 75/90, cambio de nivel, rounds
 * restantes, economía). FULL FOCUS: cero ARGOS/nav flotante (isMentePillarPath).
 *
 * Timing: 3.3s por trial a 1x (V1.5.1 #3), speed divide. Primera sesión:
 * N=1 forzado (tutorial, #44-1); después resume_mode. Al completar round:
 * nback_sessions + estado + e- (1er round del día) + claim H+ (mig 218).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  NBACK_CONFIG, generateRound, scoreChannel, evaluateRound, startingN,
  trialDurationMs, stimuliCountFor, resolvePressIndex,
  type NBackRound, type NBackRoundResult, type ChannelScore,
} from '@/src/services/nback-core';
import { createNBackAudio, type NBackAudioHandle } from '@/src/services/nback-audio';
import {
  fetchNBackState, completeNBackRound, getNBackSettings,
  DEFAULT_NBACK_SETTINGS, type NBackSettings, type RoundOutcome,
} from '@/src/services/nback-service';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

type Phase = 'loading' | 'countdown' | 'playing' | 'paused' | 'saving' | 'results';

/** Mensaje del coach del tutorial (primera sesión) — pausa el juego hasta "ENTENDIDO". */
interface CoachMsg { title: string; body: string }

const COUNTDOWN_STEPS = ['¿Listo?', 'En posición.', '¡Va!'];
// V1.5 (A3): "¡Va!" aguanta ~2.8s antes del primer trial (antes 800ms — el
// usuario no alcanzaba a ubicar la vista).
const COUNTDOWN_TOTAL_MS = 4600;
// V1.5.1 (#2): el grid respira este tiempo ANTES del primer estímulo — que el
// usuario ubique la vista con el tablero ya visible (el countdown no basta).
const FIRST_TRIAL_GRACE_MS = 2000;
const RAISE_PCT = NBACK_CONFIG.RAISE_THRESHOLD * 100;
const DROP_PCT = NBACK_CONFIG.DROP_THRESHOLD * 100;

interface ResultsView {
  result: NBackRoundResult;
  outcome: RoundOutcome | null;
  n: number;
  /** V1.5.2 (#2): breakdown por canal — LOS MISMOS ChannelScore que alimentan
   * el accuracy/score (scoreChannel en finishRound), no un recomputo. */
  visual: ChannelScore;
  audio: ChannelScore;
}

export default function NBackSessionScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

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
  // V1.5: settings espejados a estado para lo que pinta (contador de turno).
  const [showTurnNumber, setShowTurnNumber] = useState(true);
  // V1.5 (D10): coach del tutorial — pausa on-the-fly con "ENTENDIDO".
  const [coach, setCoach] = useState<CoachMsg | null>(null);

  // MB-31B3: tokens del tema — SOLO el chrome neutro. El tablero, los botones
  // POSICIÓN/SONIDO, el flash y el rojo del juego son re-skin (identidad) y
  // quedan oscuros; el acento de TEXTO en claro es teal (regla 1).
  const { kind, tokens: t } = useAppTheme();
  const secTxt = { color: t.textoSecundario };
  const priTxt = { color: t.texto };
  const tenueTxt = { color: t.textoTenue };
  const cardSurf = { backgroundColor: t.card, borderColor: t.borde };
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;

  const settingsRef = useRef<NBackSettings>(DEFAULT_NBACK_SETTINGS);
  const audioRef = useRef<NBackAudioHandle | null>(null);
  const roundRef = useRef<NBackRound | null>(null);
  const trialRef = useRef(0);
  const pressedVRef = useRef<boolean[]>([]);
  const pressedARef = useRef<boolean[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedAtRef = useRef(new Date());
  const aliveRef = useRef(true);
  // V1.5: timing absoluto — base del round (se re-ancla al reanudar/coach) y
  // arranque del trial visible (para la gracia de press tardío).
  const roundBaseRef = useRef(0);
  const trialStartRef = useRef(0);
  const phaseRef = useRef<Phase>('loading');
  const nRef = useRef<number>(NBACK_CONFIG.N_START);
  const tutorialRef = useRef(false);
  const coachShownRef = useRef({ intro: false, v: false, a: false });
  const pendingTrialRef = useRef<number | null>(null);
  const pausedFromRef = useRef<'playing' | 'countdown'>('playing');

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => { if (aliveRef.current) fn(); }, ms);
    timersRef.current.push(t);
  }, []);

  // Espejos síncronos para handlers fuera del ciclo de render (AppState/press).
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { nRef.current = n; }, [n]);

  // ── Carga inicial: settings + estado + audio ──
  useEffect(() => {
    aliveRef.current = true;
    (async () => {
      const [settings, audio] = await Promise.all([getNBackSettings(), createNBackAudio()]);
      if (!aliveRef.current) { audio.dispose(); return; }
      settingsRef.current = settings;
      setShowTurnNumber(settings.showTurnNumber);
      audioRef.current = audio;
      let startN: number = NBACK_CONFIG.N_START;
      let tutorial = false;
      if (user?.id) {
        const st = await fetchNBackState(user.id);
        tutorial = st.sessions_total === 0;
        startN = startingN(st.sessions_total, st.current_n, st.best_n, settings.resumeMode);
      }
      if (!aliveRef.current) return;
      tutorialRef.current = tutorial;
      setIsTutorial(tutorial);
      setN(startN);
      startCountdown(startN);
    })().catch(() => {
      // D-2 (MB-12): sin leer tu nivel no se arranca en N=1 "por si acaso" —
      // eso degrada a un usuario de N=5 al tutorial. Se avisa y se sale.
      if (!aliveRef.current) return;
      Alert.alert(
        'No pudimos leer tu nivel',
        'Revisa tu conexión e intenta de nuevo. Tu progreso sigue guardado.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    });
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
    later(() => startRound(forN), COUNTDOWN_TOTAL_MS);
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
    // V1.5.1 (#2): trialStart en 0 = aún no corre el primer trial — press()
    // lo usa de guardia para ignorar toques durante la gracia del tablero.
    trialStartRef.current = 0;
    setN(forN);
    setPhase('playing');
    later(() => {
      roundBaseRef.current = Date.now();
      runTrial(0);
    }, FIRST_TRIAL_GRACE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Re-ancla la base del round para que el trial `i` "empiece" ahora (tras
   * coach del tutorial o pausa por background — timing absoluto sin deuda). */
  const reanchorAt = useCallback((i: number) => {
    roundBaseRef.current = Date.now() - i * trialDurationMs(settingsRef.current.speed);
  }, []);

  const runTrial = useCallback((i: number) => {
    const round = roundRef.current;
    if (!round) return;
    if (i >= round.positions.length) { finishRound(); return; }

    // D10: tutorial on-the-fly — antes del primer match de cada canal, pausa
    // con instrucción; el trial corre al tocar ENTENDIDO.
    if (tutorialRef.current) {
      if (!coachShownRef.current.intro) {
        coachShownRef.current.intro = true;
        pendingTrialRef.current = i;
        setCoach({
          title: `Nivel N=${round.n}`,
          body: `Cada turno: se ilumina una celda Y suena una letra. Con N=${round.n} comparas contra hace ${round.n} turno${round.n > 1 ? 's' : ''}: si la celda se repite → POSICIÓN; si la letra se repite → SONIDO. Te aviso en los primeros matches.`,
        });
        return;
      }
      const needV = round.visualMatches[i] && !coachShownRef.current.v;
      const needA = round.audioMatches[i] && !coachShownRef.current.a;
      if (needV || needA) {
        if (needV) coachShownRef.current.v = true;
        if (needA) coachShownRef.current.a = true;
        pendingTrialRef.current = i;
        clearTimers();
        setLitCell(null);
        setCoach(
          needV && needA
            ? { title: 'Doble match', body: `La celda Y la letra que vienen se repiten respecto a hace ${round.n}. Presiona POSICIÓN y SONIDO: los dos cuentan.` }
            : needV
              ? { title: 'Match de posición', body: `La celda que se va a iluminar es la MISMA de hace ${round.n}. Cuando la veas, presiona POSICIÓN.` }
              : { title: 'Match de sonido', body: `La letra que vas a escuchar es la MISMA de hace ${round.n}. Cuando la oigas, presiona SONIDO.` }
        );
        return;
      }
    }

    trialRef.current = i;
    trialStartRef.current = Date.now();
    setTrialIdx(i);
    setPressedThisTrial({ v: false, a: false });
    setFlash(null);
    setLitCell(round.positions[i]);
    audioRef.current?.play(round.letters[i]);
    const trialMs = trialDurationMs(settingsRef.current.speed);
    later(() => setLitCell(null), NBACK_CONFIG.STIMULUS_VISIBLE_MS);
    // Timing absoluto (V1.5): deadline contra la base del round — el drift de
    // setTimeout no se acumula a velocidades altas.
    const deadline = roundBaseRef.current + (i + 1) * trialMs;
    later(() => runTrial(i + 1), Math.max(50, deadline - Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Cierra el coach del tutorial y corre el trial pendiente. */
  const dismissCoach = useCallback(() => {
    const i = pendingTrialRef.current;
    setCoach(null);
    haptic.light();
    if (i === null) return;
    pendingTrialRef.current = null;
    reanchorAt(i);
    runTrial(i);
  }, [reanchorAt, runTrial]);

  const press = useCallback((channel: 'v' | 'a') => {
    const round = roundRef.current;
    if (!round || phaseRef.current !== 'playing' || coach) return;
    // Gracia del tablero (#2): antes del primer trial no hay estímulo que
    // responder — un toque aquí ensuciaría el score del trial 0.
    if (trialStartRef.current === 0) return;
    const pressedArr = channel === 'v' ? pressedVRef.current : pressedARef.current;
    // Gracia (V1.5): un press en los primeros ms del trial se acredita al
    // estímulo anterior si ese canal no registró press ahí (lógica pura, testeada).
    const cur = trialRef.current;
    const elapsed = Date.now() - trialStartRef.current;
    const i = resolvePressIndex(cur, elapsed, NBACK_CONFIG.GRACE_PRESS_MS, pressedArr[cur - 1] === true);
    if (pressedArr[i]) return; // un press por canal por trial
    pressedArr[i] = true;
    if (i === cur) setPressedThisTrial(prev => ({ ...prev, [channel]: true }));
    const isMatch = channel === 'v' ? round.visualMatches[i] : round.audioMatches[i];
    // V1.5 (#C8): flash visual y háptico acierto/error separados en settings.
    if (settingsRef.current.feedbackFlash) {
      setFlash({ channel, ok: isMatch });
      later(() => setFlash(null), 350);
    }
    if (settingsRef.current.feedbackSound) {
      if (isMatch) haptic.light(); else haptic.warning();
    } else {
      haptic.light();
    }
  }, [coach, later]);

  // V1.5.1 (#1): un detector RNGH por botón (nativo, fuera del responder único
  // de RN) — dos dedos simultáneos registran ambos canales. onPressIn de
  // Pressable no bastó en device: el JSResponder sigue siendo global y el
  // segundo touch-down simultáneo se perdía. Registramos en onTouchesDown
  // (equivalente touch-down) y marcamos ambos taps como simultáneos entre sí.
  const [tapV, tapA] = useMemo(() => {
    const v = Gesture.Tap().runOnJS(true).maxDuration(10000).onTouchesDown(() => press('v'));
    const a = Gesture.Tap().runOnJS(true).maxDuration(10000).onTouchesDown(() => press('a'));
    v.simultaneousWithExternalGesture(a);
    a.simultaneousWithExternalGesture(v);
    return [v, a] as const;
  }, [press]);

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
    setResults({ result, outcome, n: round.n, visual, audio });
    setPhase('results');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const continueNextRound = useCallback(() => {
    if (!results) return;
    haptic.medium();
    setResults(null);
    startCountdown(results.result.nextN);
  }, [results, startCountdown]);

  // ── Background (V1.5 · 2.7): los timers JS se pausan y el timing se
  // descompone — pausamos el round y ofrecemos reanudar o salir. ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') return;
      const ph = phaseRef.current;
      if (ph !== 'playing' && ph !== 'countdown') return;
      pausedFromRef.current = ph;
      clearTimers();
      setLitCell(null);
      setFlash(null);
      setPhase('paused');
    });
    return () => sub.remove();
  }, [clearTimers]);

  const resumeFromPause = useCallback(() => {
    haptic.medium();
    if (pausedFromRef.current === 'countdown') { startCountdown(nRef.current); return; }
    setPhase('playing');
    // Si el coach del tutorial estaba abierto, su ENTENDIDO reanuda.
    if (pendingTrialRef.current !== null) return;
    const i = trialRef.current;
    reanchorAt(i);
    runTrial(i);
  }, [startCountdown, reanchorAt, runTrial]);

  // ── Salida con confirmación durante el juego (el round en curso se pierde) ──
  const handleExit = useCallback(() => {
    if (phase === 'playing' || phase === 'countdown' || phase === 'paused') {
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
    <ThemeReady>
    <View style={[s.screen, { backgroundColor: t.fondo, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />

      {/* Header */}
      <View style={s.header}>
        <AnimatedPressable style={s.headerBtn} onPress={handleExit}>
          <Ionicons name="chevron-back" size={24} color={t.texto} />
        </AnimatedPressable>
        <EliteText style={[s.headerTitle, priTxt]}>
          Nivel {n}{isTutorial ? ' · Tutorial' : ''}
        </EliteText>
        <View style={s.headerBtn}>
          {/* V1.5 (#C9): contador apagable desde Personalizar. */}
          {phase === 'playing' && showTurnNumber && (
            <EliteText style={[s.trialCounter, tenueTxt]}>{Math.min(trialIdx + 1, totalTrials)}/{totalTrials}</EliteText>
          )}
        </View>
      </View>

      {phase === 'loading' && (
        <View style={s.center}><EliteText style={[s.countdownText, priTxt]}>…</EliteText></View>
      )}

      {phase === 'countdown' && (
        <View style={s.center}>
          <Animated.View key={countdownIdx} entering={FadeIn.duration(200)}>
            <EliteText style={[s.countdownText, priTxt]}>{COUNTDOWN_STEPS[countdownIdx]}</EliteText>
          </Animated.View>
          {/* V1.5 (A3): el hint acompaña TODO el countdown (antes solo 900ms). */}
          <EliteText style={[s.countdownHint, tenueTxt]}>
            POSICIÓN si la celda se repite de hace {n} · SONIDO si la letra se repite de hace {n}
          </EliteText>
        </View>
      )}

      {(phase === 'playing' || phase === 'saving' || phase === 'paused') && (
        <>
          <View style={s.center}>
            {/* Grid 3×3 con crosshair al centro */}
            <View style={s.grid}>
              {Array.from({ length: 9 }, (_, gi) => {
                if (gi === 4) {
                  // V1.5 (B4): centro transparente — solo la cruz, mismo footprint.
                  return (
                    <View key={gi} style={s.gridCellCenter}>
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

          {/* Botones POSICIÓN / SONIDO — V1.5.1 (#1): GestureDetector RNGH por
              botón (multitouch real; onPressIn de RN seguía perdiendo el 2º
              dedo simultáneo en device). El relleno pasa a sólido al presionar
              (B5) con contenido en negro. */}
          <View style={s.buttonsRow}>
            {([
              { channel: 'v' as const, icon: 'apps-outline' as const, label: 'POSICIÓN', pressed: pressedThisTrial.v, tap: tapV },
              { channel: 'a' as const, icon: 'volume-high-outline' as const, label: 'SONIDO', pressed: pressedThisTrial.a, tap: tapA },
            ]).map(btn => {
              const flashing = flash?.channel === btn.channel;
              const solid = btn.pressed || flashing;
              return (
                <GestureDetector key={btn.channel} gesture={btn.tap}>
                  <View
                    style={[
                      s.matchBtn,
                      btn.pressed && s.matchBtnPressed,
                      flashing && (flash!.ok ? s.matchBtnOk : s.matchBtnBad),
                    ]}
                  >
                    <Ionicons name={btn.icon} size={26} color={solid ? '#000' : '#fff'} />
                    <EliteText style={[s.matchBtnText, solid && { color: '#000' }]}>{btn.label}</EliteText>
                  </View>
                </GestureDetector>
              );
            })}
          </View>
        </>
      )}

      {/* Coach del tutorial (D10): pausa on-the-fly hasta ENTENDIDO. */}
      {coach && phase === 'playing' && (
        <View style={s.overlay}>
          <Animated.View entering={FadeIn.duration(200)} style={[s.coachCard, cardSurf]}>
            <EliteText style={[s.coachTitle, { color: acento }]}>{coach.title}</EliteText>
            <EliteText style={[s.coachBody, secTxt]}>{coach.body}</EliteText>
            <AnimatedPressable style={s.coachBtn} onPress={dismissCoach}>
              <LinearGradient colors={ATP_BRAND.moleculeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.coachBtnInner}>
                <EliteText style={[s.coachBtnText, { color: t.textoSobreLima }]}>ENTENDIDO</EliteText>
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>
        </View>
      )}

      {/* Pausa por background (2.7): reanudar o salir. */}
      {phase === 'paused' && (
        <View style={s.overlay}>
          <Animated.View entering={FadeIn.duration(200)} style={[s.coachCard, cardSurf]}>
            <EliteText style={[s.coachTitle, { color: acento }]}>Sesión en pausa</EliteText>
            <EliteText style={[s.coachBody, secTxt]}>
              La app pasó a segundo plano y el round se detuvo para no ensuciar tu score.
            </EliteText>
            <AnimatedPressable style={s.coachBtn} onPress={resumeFromPause}>
              <LinearGradient colors={ATP_BRAND.moleculeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.coachBtnInner}>
                <EliteText style={[s.coachBtnText, { color: t.textoSobreLima }]}>REANUDAR</EliteText>
              </LinearGradient>
            </AnimatedPressable>
            <AnimatedPressable style={s.endBtn} onPress={() => { haptic.light(); clearTimers(); router.back(); }}>
              <EliteText style={[s.endText, secTxt]}>Salir (el round se pierde)</EliteText>
            </AnimatedPressable>
          </Animated.View>
        </View>
      )}

      {phase === 'results' && results && (
        <Animated.View entering={FadeInUp.duration(350)} style={s.resultsWrap}>
          <EliteText style={[s.resultsTitle, priTxt]}>
            {results.result.promoted ? 'Nivel superado' : results.result.demoted ? 'Ajustamos el reto' : 'Buen round'}
          </EliteText>

          <ResultBar label="Posición" pct={Math.round(results.result.accuracyVisual * 100)} score={results.visual} />
          <ResultBar label="Sonido" pct={Math.round(results.result.accuracyAudio * 100)} score={results.audio} />
          <EliteText style={[s.thresholdHint, tenueTxt]}>
            &lt;{DROP_PCT}% en un canal baja el nivel · ≥{RAISE_PCT}% en ambos lo sube
          </EliteText>

          <View style={[s.levelCard, cardSurf]}>
            <EliteText style={[s.levelCardTitle, { color: acento }]}>
              {results.result.promoted
                ? `Nivel sube a ${results.result.nextN}`
                : results.result.demoted
                  ? `Nivel baja a ${results.result.nextN}`
                  : `Sigues en nivel ${results.result.nextN}`}
            </EliteText>
            {results.outcome && (
              <EliteText style={[s.levelCardSub, secTxt]}>
                {Math.max(0, NBACK_CONFIG.ROUNDS_PER_DAY - results.outcome.roundsToday)} rounds restantes hoy
              </EliteText>
            )}
            {/* Economía: e- del día + H+ (decisión #44-5) */}
            <View style={s.rewardsRow}>
              {results.outcome?.electronAwarded && (
                <View style={s.rewardChip}><EliteText style={[s.rewardText, { color: acento }]}>+2.5 e- · HOY ✓</EliteText></View>
              )}
              {(results.outcome?.protons ?? []).map((p, i) => (
                <View key={i} style={s.rewardChip}>
                  <EliteText style={[s.rewardText, { color: acento }]}>
                    +{p.amount} H+ {p.kind === 'daily' ? '· sesión completa' : p.kind === 'pr' ? `· récord N=${p.n ?? ''}` : p.kind === 'streak7' ? '· racha 7 días' : '· racha 30 días'}
                  </EliteText>
                </View>
              ))}
            </View>
          </View>

          <AnimatedPressable style={s.continueBtn} onPress={continueNextRound}>
            <LinearGradient colors={ATP_BRAND.moleculeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.continueBtnInner}>
              <EliteText style={[s.continueText, { color: t.textoSobreLima }]}>CONTINUAR</EliteText>
            </LinearGradient>
          </AnimatedPressable>
          <AnimatedPressable style={s.endBtn} onPress={() => { haptic.light(); router.back(); }}>
            <EliteText style={[s.endText, secTxt]}>Terminar por hoy</EliteText>
          </AnimatedPressable>
        </Animated.View>
      )}
    </View>
    </ThemeReady>
  );
}

function ResultBar({ label, pct, score }: { label: string; pct: number; score: ChannelScore }) {
  // MB-31B3: tokens del tema (el fill lima/rojo del juego se queda).
  const { kind, tokens: t } = useAppTheme();
  const tenueTxt = { color: t.textoTenue };
  return (
    <View style={s.barBlock}>
      <View style={s.barLabelRow}>
        <EliteText style={[s.barLabel, { color: t.textoSecundario }]}>{label}</EliteText>
        <EliteText style={[s.barPct, { color: t.texto }]}>{pct}%</EliteText>
      </View>
      <View style={s.barTrack}>
        {/* V1.5.2 (#1): fill en gradiente molécula (fuera lime plano); rojo si cae bajo umbral */}
        {pct < DROP_PCT ? (
          <View style={[s.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: '#f87171' }]} />
        ) : (
          <LinearGradient
            colors={ATP_BRAND.moleculeGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.barFill, { width: `${Math.min(100, pct)}%` }]}
          />
        )}
        {/* Umbrales 75/90 de la referencia */}
        <View style={[s.barMark, { left: `${DROP_PCT}%` }]} />
        <View style={[s.barMark, { left: `${RAISE_PCT}%` }]} />
      </View>
      {/* V1.5.2 (#2): breakdown de errores del canal — +comisión / −omisión,
          de los mismos conteos que produjeron el score. */}
      <View style={s.breakdownRow}>
        <EliteText style={[s.breakdownText, tenueTxt, score.falses > 0 && s.breakdownBad]}>
          +{score.falses} de más
        </EliteText>
        <EliteText style={[s.breakdownSep, tenueTxt]}>·</EliteText>
        <EliteText style={[s.breakdownText, tenueTxt, score.misses > 0 && s.breakdownBad]}>
          −{score.misses} sin marcar
        </EliteText>
        {score.falses === 0 && score.misses === 0 && (
          <EliteText style={[s.breakdownClean, { color: kind === 'dark' ? withOpacity(ATP_BRAND.lime, 0.8) : t.tealTexto }]}>  canal limpio ✓</EliteText>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 64, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, letterSpacing: 1 },
  trialCounter: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  countdownText: { fontSize: 44, fontFamily: Fonts.extraBold, letterSpacing: 1 },
  countdownHint: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular,
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
  // V1.5 (B4): mismo footprint que gridCell pero sin fondo ni borde.
  gridCellCenter: { width: 94, height: 94, alignItems: 'center', justifyContent: 'center' },
  crosshair: { color: TEXT.tertiary, fontSize: 26, fontFamily: Fonts.regular },

  buttonsRow: { flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: Spacing.md },
  matchBtn: {
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  // V1.5 (B5): presionado debe distinguirse AL INSTANTE. V1.5.2 (#1 re-skin):
  // fuera el bloque lime sólido — relleno translúcido fuerte + borde grueso
  // del acento (igual de visible sobre negro, sin brutalist plano).
  matchBtnPressed: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.35), borderColor: ATP_BRAND.lime, borderWidth: 2 },
  matchBtnOk: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.35), borderColor: ATP_BRAND.lime, borderWidth: 2 },
  matchBtnBad: { backgroundColor: withOpacity('#f87171', 0.35), borderColor: '#f87171', borderWidth: 2 },
  matchBtnText: { color: '#fff', fontSize: 12, fontFamily: Fonts.bold, letterSpacing: 2 },

  // V1.5: overlay compartido coach tutorial / pausa background.
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, zIndex: 10,
  },
  coachCard: {
    width: '100%',
    borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.lg,
  },
  coachTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, letterSpacing: 0.5 },
  coachBody: {
    fontSize: FontSizes.md, fontFamily: Fonts.regular,
    lineHeight: 22, marginTop: Spacing.sm,
  },
  // V1.5.2 (#1): CTA en gradiente molécula (BUTTON_STYLES: gradiente para
  // superficies, lime sólido solo botones compactos).
  coachBtn: { borderRadius: Radius.pill, overflow: 'hidden', marginTop: Spacing.lg },
  coachBtnInner: { alignItems: 'center', paddingVertical: 13 },
  // El color se aplica inline con t.textoSobreLima (texto sobre relleno lima).
  coachBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2 },

  resultsWrap: { flex: 1, justifyContent: 'center' },
  resultsTitle: {
    fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: 0.5,
    marginBottom: Spacing.lg,
  },
  barBlock: { marginBottom: Spacing.md },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, letterSpacing: 1 },
  barPct: { fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)' },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: ATP_BRAND.lime },
  barMark: { position: 'absolute', top: -3, width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.45)' },
  thresholdHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginBottom: Spacing.md },

  levelCard: {
    borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm,
  },
  levelCardTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  levelCardSub: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 4 },
  rewardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rewardChip: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  rewardText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold },

  continueBtn: { borderRadius: Radius.pill, overflow: 'hidden', marginTop: Spacing.lg },
  continueBtnInner: { alignItems: 'center', paddingVertical: 14 },
  // El color se aplica inline con t.textoSobreLima (texto sobre relleno lima).
  continueText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  breakdownText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  breakdownBad: { color: '#f8a5a5' },
  breakdownSep: { fontSize: FontSizes.xs },
  breakdownClean: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  endBtn: { alignItems: 'center', paddingVertical: 14 },
  endText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
