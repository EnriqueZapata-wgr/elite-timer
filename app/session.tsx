/**
 * /session — runner UNIFICADO de entrenamiento (Ola 2 Fitness PR1; ex
 * strength-session, MB-3 Tracks D+E+F). /strength-session queda como alias
 * permanente de esta pantalla.
 *
 * UN solo camino de ejecución: series estándar (registro inline + timer de
 * descanso con cuenta hablada) y los 3 métodos ATP (3-5 / EMOM / Myo-reps)
 * corren aquí con voz + háptico + keep-awake. Al cerrar: sesión persistida
 * (workout_sessions + exercise_logs), PRs con celebración (brinco >15%) y la
 * señal de Edad ATP (puente Track C).
 *
 * Entrada: ?plan=<GeneratedRoutine JSON> (generador), ?slugs=a,b,c (biblioteca)
 * o ?routine=<Routine JSON> (builder — MB-7 Track C: puente vía
 * routine-bridge-core; los bloques de tiempo puro corren inline como countdown,
 * el usuario nunca sale de la sesión).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Alert, DeviceEventEmitter } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { ConfettiCelebration } from '@/src/components/ui/ConfettiCelebration';
import { Method35 } from '@/src/components/training/Method35';
import { EMOMAuto } from '@/src/components/training/EMOMAuto';
import { MyoReps } from '@/src/components/training/MyoReps';
import { RestTimer } from '@/src/components/training/RestTimer';
import { KeepAwakeActive } from '@/src/components/training/KeepAwakeActive';
import { ExerciseClip } from '@/src/components/training/ExerciseClip';
import { useMethodVoice } from '@/src/hooks/useMethodVoice';
import { useSettings, type FitnessVoiceMode } from '@/src/contexts/settings-context';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { awardBooleanElectron } from '@/src/services/electron-service';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import {
  saveWorkoutSession,
  stashPendingSession,
  removePendingSession,
  stashLiveSession,
  readLiveSession,
  clearLiveSession,
  type LiveSessionStash,
  type SaveSessionInput,
  type SaveSessionResult,
} from '@/src/services/fitness/workout-session-service';
import { generateUUID } from '@/src/utils/uuid';
import type { SessionSet } from '@/src/services/fitness/workout-session-core';
import type { GeneratedRoutine, RoutineBlock } from '@/src/services/fitness/routine-generator-core';
import { bridgeRoutineToSession, type SessionBlock } from '@/src/services/fitness/routine-bridge-core';
import type { Routine as EngineRoutine } from '@/src/engine/types';
import { clipDe, posterDe } from '@/src/constants/exercise-matrix';
import { esBenchmarkDistancia } from '@/src/services/fitness/edad-bridge-core';
import { ATP_BRAND, TEXT, TEXT_COLORS, ELEVATION, PILLAR_GRADIENTS, SEMANTIC, withOpacity, CATEGORY_COLORS } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/src/contexts/theme-context';

const CARDIO_LABELS: Record<string, string> = {
  running: 'Correr', cycling: 'Ciclismo', swimming: 'Natación', rowing: 'Remo', other: 'Cardio',
};

// ── Runner de bloque estándar (registro inline + descanso hablado) ──

function StandardBlockRunner({ block, onCue, onDone, onSetLogged, initialLogged }: {
  block: RoutineBlock;
  onCue: (t: string) => void;
  onDone: (sets: SessionSet[]) => void;
  /** C-1 (MB-12): cada serie cerrada persiste — no al final, en cada serie. */
  onSetLogged?: (partial: SessionSet[]) => void;
  /** C-1: series ya hechas de este bloque al retomar una sesión recuperada. */
  initialLogged?: SessionSet[];
}) {
  const [serie, setSerie] = useState((initialLogged?.length ?? 0) + 1);
  const [resting, setResting] = useState(false);
  const [peso, setPeso] = useState('');
  const [reps, setReps] = useState(String(block.reps));
  const [distancia, setDistancia] = useState('');
  const [logged, setLogged] = useState<SessionSet[]>(initialLogged ?? []);
  // MB-31B3: tokens del tema global (la pantalla vive dentro de <Screen themed>).
  const { kind, tokens: tk } = useAppTheme();
  // Regla 1 de la guía: lima como TEXTO no sobrevive el claro → teal calibrado.
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
  // MB-3.6 Bloque 5: broad jump es benchmark de DISTANCIA — se captura en cm
  // (activa su nudge de Edad ATP; reps no significaban nada aquí).
  const esDistancia = esBenchmarkDistancia(block.slug);

  function logSerie() {
    let nuevo: SessionSet;
    if (esDistancia) {
      const cm = parseFloat(distancia.replace(',', '.'));
      if (!(cm > 0) || cm > 500) {
        Alert.alert('Falta el dato', 'Registra la distancia del salto en centímetros.');
        return;
      }
      haptic.medium();
      nuevo = {
        slug: block.slug,
        nombre: block.nombre,
        setNumber: serie,
        reps: 1, // un intento por serie — el dato real es la distancia
        weightKg: null,
        esIsometrico: false,
        metodo: 'Estándar',
        slot: block.slot,
        distanceCm: Math.round(cm),
      };
    } else {
      const r = parseInt(reps, 10);
      if (!(r > 0)) {
        Alert.alert('Falta el dato', block.esIsometrico ? 'Registra los segundos del aguante.' : 'Registra las repeticiones.');
        return;
      }
      haptic.medium();
      const w = parseFloat(peso);
      nuevo = {
        slug: block.slug,
        nombre: block.nombre,
        setNumber: serie,
        reps: r,
        weightKg: Number.isFinite(w) && w > 0 && w <= 1000 ? w : null,
        esIsometrico: block.esIsometrico,
        metodo: 'Estándar',
        slot: block.slot,
      };
    }
    const todos = [...logged, nuevo];
    setLogged(todos);
    setDistancia('');
    onSetLogged?.(todos);
    if (serie >= block.series) {
      onDone(todos);
    } else {
      setResting(true);
    }
  }

  return (
    <View>
      {/* Serie actual */}
      {!resting && (
        <Animated.View entering={FadeInUp.duration(250)} style={[s.serieCard, { backgroundColor: tk.card, borderColor: tk.borde }]}>
          <Text style={[s.serieLabel, { color: acento }]}>{esDistancia ? `INTENTO ${serie} DE ${block.series}` : `SERIE ${serie} DE ${block.series}`}</Text>
          <Text style={[s.serieMeta, { color: tk.textoSecundario }]}>
            {esDistancia
              ? 'Salto horizontal máximo: mide la distancia talón a talón'
              : block.esIsometrico ? `Aguante objetivo: ${block.reps} s` : `Objetivo: ${block.reps} reps`}
            {!esDistancia && block.esUnilateral ? ' · por lado' : ''}
          </Text>
          {esDistancia ? (
            <View style={s.inputsRow}>
              <View style={s.inputCol}>
                <Text style={[s.inputLabel, { color: tk.textoSecundario }]}>DISTANCIA (CM)</Text>
                <TextInput
                  style={[s.input, { color: tk.texto, backgroundColor: tk.hundido }]}
                  value={distancia}
                  onChangeText={setDistancia}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={tk.sinDatos}
                  maxLength={5}
                />
              </View>
            </View>
          ) : (
            <View style={s.inputsRow}>
              <View style={s.inputCol}>
                <Text style={[s.inputLabel, { color: tk.textoSecundario }]}>KG</Text>
                <TextInput
                  style={[s.input, { color: tk.texto, backgroundColor: tk.hundido }]}
                  value={peso}
                  onChangeText={setPeso}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={tk.sinDatos}
                  maxLength={6}
                />
              </View>
              <View style={s.inputCol}>
                <Text style={[s.inputLabel, { color: tk.textoSecundario }]}>{block.esIsometrico ? 'SEG' : 'REPS'}</Text>
                <TextInput
                  style={[s.input, { color: tk.texto, backgroundColor: tk.hundido }]}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={tk.sinDatos}
                  maxLength={3}
                />
              </View>
            </View>
          )}
          <GradientCTA label={esDistancia ? 'INTENTO HECHO' : 'SERIE HECHA'} pillar="fitness" onPress={logSerie} />
        </Animated.View>
      )}

      {/* Descanso entre series (cuenta hablada) */}
      {resting && (
        <RestTimer
          seconds={block.descansoSeg}
          siguiente={`Serie ${serie + 1} de ${block.series}`}
          onCue={onCue}
          onDone={() => { setResting(false); setSerie((n) => n + 1); }}
        />
      )}

      {/* Sets logueados */}
      {logged.length > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          {logged.map((l) => (
            <View key={l.setNumber} style={s.loggedRow}>
              <View style={s.loggedDot}><Text style={s.loggedDotText}>{l.setNumber}</Text></View>
              <Text style={[s.loggedText, { color: tk.texto }]}>
                {l.distanceCm != null
                  ? `${l.distanceCm} cm`
                  : `${l.weightKg ? `${l.weightKg} kg × ` : ''}${l.reps}${l.esIsometrico ? ' s' : ' reps'}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Runner de bloque de TIEMPO (MB-7 Track C) ──
// Countdown inline para bloques de puro tiempo del builder: la mezcla corre
// dentro de la MISMA sesión, sin sacar al usuario al timer legacy.

function TiempoBlockRunner({ block, onCue, onDone }: {
  block: SessionBlock;
  onCue: (t: string, opts?: { hito?: boolean }) => void;
  onDone: () => void;
}) {
  const [restante, setRestante] = useState(block.tiempoSeg);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onCueRef = useRef(onCue);
  onCueRef.current = onCue;

  useEffect(() => {
    if (restante <= 0) {
      haptic.heavy();
      onCueRef.current?.(block.esDescansoTiempo ? '¡Vamos!' : 'Tiempo.', { hito: true });
      onDoneRef.current();
      return;
    }
    if (restante <= 3) {
      haptic.medium();
      onCueRef.current?.(String(restante));
    }
    const t = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante]);

  const min = Math.floor(restante / 60);
  const seg = restante % 60;
  // MB-31B3: tokens del tema global (la pantalla vive dentro de <Screen themed>).
  const { kind, tokens: tk } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
  return (
    <Animated.View entering={FadeInUp.duration(250)} style={[s.serieCard, { backgroundColor: tk.card, borderColor: tk.borde }]}>
      <Text style={[s.serieLabel, { color: acento }]}>{block.esDescansoTiempo ? 'DESCANSO' : 'POR TIEMPO'}</Text>
      <Text style={[s.tiempoTime, { color: block.esDescansoTiempo ? tk.tealTexto : acento }]}>
        {min}:{String(seg).padStart(2, '0')}
      </Text>
      <View style={s.tiempoActions}>
        <AnimatedPressable onPress={() => { haptic.light(); setRestante((r) => r + 30); }} style={[s.tiempoSecondary, { backgroundColor: tk.flotante, borderColor: tk.bordeMarcado }]}>
          <Text style={[s.tiempoSecondaryText, { color: tk.texto }]}>+30 s</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={() => { haptic.light(); setRestante(0); }} style={s.tiempoSkip}>
          <Ionicons name="play-skip-forward" size={16} color={TEXT_COLORS.onAccent} />
          <Text style={s.tiempoSkipText}>SALTAR</Text>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

// ── Pantalla ──

// MB-3.5 #6: toggle rápido de voz de Fitness (todo → solo hitos → apagada).
const VOZ_CICLO: Record<FitnessVoiceMode, FitnessVoiceMode> = { todo: 'hitos', hitos: 'off', off: 'todo' };
const VOZ_ICONO: Record<FitnessVoiceMode, 'volume-high' | 'volume-low' | 'volume-mute'> = {
  todo: 'volume-high', hitos: 'volume-low', off: 'volume-mute',
};

export default function SessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string; slugs?: string; name?: string; routine?: string }>();
  const { user } = useAuth();
  const { cue } = useMethodVoice();
  const { settings, updateSetting } = useSettings();
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: tk } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
  const secTxt = { color: tk.textoSecundario };

  const plan = useMemo((): GeneratedRoutine | null => {
    if (!params.plan) return null;
    try { return JSON.parse(params.plan) as GeneratedRoutine; } catch { return null; }
  }, [params.plan]);

  const [bloques, setBloques] = useState<SessionBlock[] | null>(plan?.bloques ?? null);
  const [idx, setIdx] = useState(0);
  const [sets, setSets] = useState<SessionSet[]>([]);
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState<SaveSessionResult | null>(null);
  const startedAtRef = useRef(new Date());
  const anunciadoRef = useRef(-1);
  // MB-5 0.2: id estable de la sesión — reintentos idempotentes (no duplica).
  const sessionIdRef = useRef(generateUUID());
  // C-1 (MB-12): series del bloque en curso al retomar una sesión recuperada.
  const [resumePartial, setResumePartial] = useState<SessionSet[] | null>(null);
  const recoveryChecked = useRef(false);

  // C-1 (MB-12): stash incremental — el estado persiste en AsyncStorage serie
  // a serie (no al final). Si la app muere, el trabajo sigue en el teléfono.
  function stashNow(consolidados: SessionSet[], enIdx: number, partial: SessionSet[]) {
    if (!bloques || bloques.length === 0) return;
    stashLiveSession({
      sessionId: sessionIdRef.current,
      startedAtIso: startedAtRef.current.toISOString(),
      routineName: params.name ?? undefined,
      source: plan ? 'generada' : 'manual',
      sets: consolidados,
      partialSets: partial,
      idx: enIdx,
      bloques,
      plan: plan ?? undefined,
    }).catch(() => { /* fail-soft: el stash nunca rompe la sesión */ });
  }

  // C-1 (MB-12): recuperación al montar — si quedó una sesión sin cerrar,
  // se ofrece retomarla (bloques, series y reloj tal como estaban).
  useEffect(() => {
    if (recoveryChecked.current) return;
    recoveryChecked.current = true;
    readLiveSession().then((stash: LiveSessionStash | null) => {
      if (!stash || stash.sessionId === sessionIdRef.current) return;
      const seriesHechas = stash.sets.length + (stash.partialSets?.length ?? 0);
      Alert.alert(
        'Tienes una sesión sin terminar',
        `${stash.routineName ?? 'Sesión de fuerza'} · ${seriesHechas} serie${seriesHechas === 1 ? '' : 's'} registrada${seriesHechas === 1 ? '' : 's'}. ¿La retomamos?`,
        [
          {
            text: 'Descartarla', style: 'destructive',
            onPress: () => { clearLiveSession(stash.sessionId).catch(() => {}); },
          },
          {
            text: 'Retomar',
            onPress: () => {
              sessionIdRef.current = stash.sessionId;
              startedAtRef.current = new Date(stash.startedAtIso);
              setSets(stash.sets);
              setResumePartial(stash.partialSets ?? []);
              setBloques(stash.bloques as SessionBlock[]);
              setIdx(Math.min(Math.max(0, stash.idx), stash.bloques.length - 1));
            },
          },
        ],
      );
    }).catch(() => {});
    // Solo al montar — la oferta de recuperación es una sola.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camino builder (MB-7 Track C): ?routine=<Routine> → puente al catálogo.
  // Ejercicios con matrix_slug corren con clip; bloques de tiempo, inline.
  useEffect(() => {
    if (bloques || !params.routine) return;
    let rt: EngineRoutine | null = null;
    try { rt = JSON.parse(params.routine) as EngineRoutine; } catch { rt = null; }
    if (!rt) { setBloques([]); return; }
    const parsed = rt;
    getExerciseMatrix().then((all) => {
      const map = new Map(all.map((e) => [e.slug, e]));
      setBloques(bridgeRoutineToSession(parsed, map).bloques);
    });
  }, [bloques, params.routine]);

  // Camino biblioteca: ?slugs=a,b,c → bloques estándar desde la matriz.
  useEffect(() => {
    if (bloques || !params.slugs) return;
    const wanted = params.slugs.split(',').map((s) => s.trim()).filter(Boolean);
    getExerciseMatrix().then((all) => {
      const armados: RoutineBlock[] = [];
      for (const slug of wanted) {
        const ex = all.find((e) => e.slug === slug);
        if (!ex) continue;
        const esIso = ex.dinamica === 'Isométrico';
        armados.push({
          slug: ex.slug,
          nombre: ex.nombre,
          mediaUrl: ex.mediaUrl,
          posterUrl: ex.posterUrl,
          slot: 'multi_sarcomerico',
          metodo: 'Estándar',
          series: 3,
          reps: esIso ? 40 : 10,
          esIsometrico: esIso,
          esUnilateral: ex.lateralidad === 'Unilateral',
          descansoSeg: 90,
          miniSeries: 0,
          microDescansoSeg: 0,
          tiempoSeg: 0,
          musculoPrincipal: ex.musculoPrincipal,
          patron: ex.patron,
          familia: ex.familia,
        });
      }
      setBloques(armados);
    });
  }, [bloques, params.slugs]);

  const actual = bloques && idx < bloques.length ? bloques[idx] : null;

  // Anuncio hablado del ejercicio al entrar.
  useEffect(() => {
    if (!actual || anunciadoRef.current === idx) return;
    anunciadoRef.current = idx;
    const unidad = actual.esIsometrico ? 'segundos' : 'repeticiones';
    if (actual.esTiempo) {
      cue(`${actual.nombre}: ${actual.tiempoSeg} segundos.`, { hito: true });
    } else if (actual.metodo === 'Estándar') {
      cue(`Ejercicio ${idx + 1}: ${actual.nombre}. ${actual.series} series de ${actual.reps} ${unidad}.`, { hito: true });
    } else {
      cue(`Ejercicio ${idx + 1}: ${actual.nombre}. Método ${actual.metodo}.`, { hito: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, actual]);

  function avanzar(nuevosSets: SessionSet[]) {
    const consolidados = [...sets, ...nuevosSets];
    setSets(consolidados);
    setResumePartial(null);
    if (bloques && idx + 1 < bloques.length) {
      stashNow(consolidados, idx + 1, []);
      setIdx(idx + 1);
    } else {
      finalizar(consolidados);
    }
  }

  function saltarEjercicio() {
    haptic.light();
    setResumePartial(null);
    if (bloques && idx + 1 < bloques.length) {
      stashNow(sets, idx + 1, []);
      setIdx(idx + 1);
    } else {
      finalizar(sets);
    }
  }

  // Resultados de métodos → SessionSets (mismo mapeo que log-exercise).
  function onMethodComplete(block: RoutineBlock, result: any) {
    haptic.success();
    const base = { slug: block.slug, nombre: block.nombre, esIsometrico: false, slot: block.slot };
    let nuevos: SessionSet[] = [];
    if (result.sets) {
      nuevos = result.sets.map((st: { weight: number; reps: number }, i: number) => ({
        ...base, setNumber: i + 1, reps: st.reps, weightKg: st.weight > 0 ? st.weight : null, metodo: '3-5',
      }));
    } else if (result.rounds) {
      nuevos = result.rounds.map((reps: number, i: number) => ({
        ...base, setNumber: i + 1, reps, weightKg: null, metodo: 'EMOM Auto',
      }));
    } else if (result.overloadSets) {
      nuevos = [
        { ...base, setNumber: 1, reps: result.activationReps, weightKg: null, metodo: 'Myo-reps' },
        ...result.overloadSets.map((reps: number, i: number) => ({
          ...base, setNumber: i + 2, reps, weightKg: null, metodo: 'Myo-reps',
        })),
      ];
    }
    avanzar(nuevos.filter((n) => n.reps > 0));
  }

  async function finalizar(todos: SessionSet[]) {
    if (!user) {
      // C-1 (MB-12): auth expirada tras un entreno largo — NUNCA descartar en
      // silencio. El estado queda en el stash y se explica cómo recuperarlo.
      stashNow(todos, idx, []);
      Alert.alert(
        'Tu cuenta se desconectó',
        'Tu entrenamiento NO se perdió: quedó guardado en este teléfono. Inicia sesión de nuevo y, al volver a abrir la sesión de fuerza, podrás retomarlo y guardarlo.',
        [{ text: 'Entendido', onPress: () => router.back() }],
      );
      return;
    }
    if (todos.filter((t) => t.reps > 0).length === 0) {
      Alert.alert('Sesión vacía', 'No registraste ninguna serie.', [
        { text: 'Seguir entrenando' },
        { text: 'Salir', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    setSaving(true);
    const inputSesion: SaveSessionInput = {
      userId: user.id,
      sets: todos,
      startedAt: startedAtRef.current,
      endedAt: new Date(),
      source: plan ? 'generada' : 'manual',
      routineName: params.name ?? (plan ? 'Rutina generada' : 'Sesión libre'),
      plan: plan ?? undefined,
      sessionId: sessionIdRef.current,
    };
    const res = await saveWorkoutSession(inputSesion);
    if (res.ok) {
      removePendingSession(sessionIdRef.current).catch(() => {});
      clearLiveSession(sessionIdRef.current).catch(() => {});
      try { await awardBooleanElectron(user.id, 'strength'); } catch { /* fail-soft */ }
      DeviceEventEmitter.emit('electrons_changed');
      DeviceEventEmitter.emit('day_changed');
      cue('Sesión completada.', { hito: true });
    }
    setSaving(false);
    setResultado(res);
    if (!res.ok) {
      // MB-5 0.2: el trabajo del usuario es sagrado — la sesión completa queda
      // en el teléfono y se re-sube sola (flush al abrir Fitness) o al reintentar.
      try { await stashPendingSession({ ...inputSesion, sessionId: sessionIdRef.current }); } catch { /* fail-soft */ }
      // La sesión completa ya vive en la cola de pendientes — el stash en
      // curso se retira para no ofrecer retomar algo ya cerrado.
      clearLiveSession(sessionIdRef.current).catch(() => {});
      Alert.alert(
        'No se pudo guardar',
        `${res.error ?? 'Error desconocido.'}\n\nTu entrenamiento NO se perdió: quedó guardado en este teléfono y se subirá solo la próxima vez que abras Fitness.`,
        [
          { text: 'Salir', style: 'destructive', onPress: () => router.back() },
          { text: 'Volver a la sesión' },
          { text: 'Reintentar', onPress: () => finalizar(todos) },
        ],
      );
    }
  }

  // ── Cierre de sesión (Track F: resumen + celebración + señal de edad) ──
  if (resultado?.ok && resultado.summary) {
    const { summary, prs = [], edadSignal, cardioHoy = [] } = resultado;
    const celebrar = prs.some((p) => p.celebrar);
    return (
      <Screen themed edges={[]}>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <ScreenHeader title="Sesión completa" onBack={() => router.back()} />
        <ConfettiCelebration visible={celebrar} />
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(300)}>
            <LinearGradient colors={[PILLAR_GRADIENTS.fitness.start, PILLAR_GRADIENTS.fitness.end]} style={s.summaryHero}>
              <Text style={s.summaryTitle}>ENTRENAMIENTO REGISTRADO</Text>
              <View style={s.statsGrid}>
                <View style={s.statCell}>
                  <Text style={s.statValue}>{summary.exercisesCount}</Text>
                  <Text style={s.statLabel}>EJERCICIOS</Text>
                </View>
                <View style={s.statCell}>
                  <Text style={s.statValue}>{summary.setsCount}</Text>
                  <Text style={s.statLabel}>SERIES</Text>
                </View>
                <View style={s.statCell}>
                  <Text style={s.statValue}>{Math.round(summary.volumeKg)}</Text>
                  <Text style={s.statLabel}>KG MOVIDOS</Text>
                </View>
                <View style={s.statCell}>
                  <Text style={s.statValue}>{Math.max(1, Math.round(summary.durationSeconds / 60))}</Text>
                  <Text style={s.statLabel}>MIN</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Cardio del día (MB-3.6 §3.3: la sesión unifica fuerza + cardio) */}
          {cardioHoy.length > 0 && (
            <Animated.View entering={FadeInDown.delay(60).duration(300)} style={[s.sectionCard, { backgroundColor: tk.card, borderColor: tk.borde }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="pulse" size={16} color={SEMANTIC.info} />
                <Text style={[s.sectionTitle, { color: tk.texto }]}>CARDIO DE HOY · TAMBIÉN CUENTA</Text>
              </View>
              {cardioHoy.map((c, i) => (
                <View key={`${c.discipline}-${i}`} style={s.prRow}>
                  <Text style={[s.prName, { color: tk.texto }]}>{CARDIO_LABELS[c.discipline] ?? c.discipline}</Text>
                  <Text style={[s.cardioValue, { color: tk.info }]}>
                    {Math.round(c.durationSeconds / 60)} min
                    {c.distanceMeters ? ` · ${(c.distanceMeters / 1000).toFixed(1)} km` : ''}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* PRs */}
          {prs.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(300)} style={[s.sectionCard, { backgroundColor: tk.card, borderColor: tk.borde }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="trophy" size={16} color={SEMANTIC.acceptable} />
                <Text style={[s.sectionTitle, { color: tk.texto }]}>RÉCORDS NUEVOS</Text>
              </View>
              {prs.map((pr) => (
                <View key={pr.slug} style={s.prRow}>
                  <Text style={[s.prName, { color: tk.texto }]} numberOfLines={1}>{pr.nombre}</Text>
                  <Text style={s.prValue}>
                    {pr.new1RM.toFixed(0)} kg 1RM
                    {pr.mejoraPct != null ? `  (+${pr.mejoraPct.toFixed(0)}%)` : '  · primero'}
                  </Text>
                </View>
              ))}
              {celebrar && <Text style={[s.prCelebrate, { color: acento }]}>Brinco de más de 15%. Día grande. 🔥</Text>}
            </Animated.View>
          )}

          {/* Señal Edad ATP (el bucle sudor → dato → edad) */}
          {edadSignal && (edadSignal.alimentado.length > 0 || edadSignal.proyeccion || edadSignal.avisos.length > 0) && (
            <Animated.View entering={FadeInDown.delay(160).duration(300)} style={[s.sectionCard, { backgroundColor: tk.card, borderColor: tk.borde }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="pulse" size={16} color={ATP_BRAND.teal} />
                <Text style={[s.sectionTitle, { color: tk.texto }]}>TU EDAD ATP</Text>
              </View>
              {edadSignal.alimentado.map((a) => (
                <View key={a} style={s.edadRow}>
                  <Ionicons name="checkmark-circle" size={15} color={ATP_BRAND.lime} />
                  <Text style={[s.edadText, { color: tk.texto }]}>{a} · verdad medida, alimentó tu score de fitness.</Text>
                </View>
              ))}
              {edadSignal.proyeccion?.texto && (
                <View style={s.edadRow}>
                  <Ionicons name="trending-down" size={15} color={ATP_BRAND.teal} />
                  <Text style={[s.edadText, { color: tk.texto }]}>{edadSignal.proyeccion.texto}</Text>
                </View>
              )}
              {edadSignal.avisos.map((a) => (
                <View key={a} style={s.edadRow}>
                  <Ionicons name="information-circle-outline" size={15} color={tk.textoSecundario} />
                  <Text style={[s.edadText, secTxt]}>{a}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          <View style={{ marginTop: Spacing.lg }}>
            <GradientCTA label="LISTO" pillar="fitness" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ── Carga / vacío ──
  if (!bloques) {
    return (
      <Screen themed edges={[]}>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <ScreenHeader title="Sesión" onBack={() => router.back()} />
        <View style={s.center}><Text style={[s.metaText, secTxt]}>Cargando…</Text></View>
      </Screen>
    );
  }
  if (bloques.length === 0 || !actual) {
    return (
      <Screen themed edges={[]}>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <ScreenHeader title="Sesión" onBack={() => router.back()} />
        <View style={s.center}>
          <Text style={[s.metaText, secTxt]}>No hay ejercicios en esta sesión.</Text>
        </View>
      </Screen>
    );
  }

  // ── Ejecución ──
  const nivelMetodo = 'intermediate' as const;
  return (
    <Screen themed edges={[]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <KeepAwakeActive />
      <ScreenHeader
        title={params.name ?? 'Sesión de hoy'}
        onBack={() => {
          Alert.alert('¿Salir de la sesión?', 'Se pierde lo no guardado.', [
            { text: 'Seguir' },
            { text: 'Terminar y guardar', onPress: () => finalizar(sets) },
            { text: 'Salir', style: 'destructive', onPress: () => router.back() },
          ]);
        }}
        rightAction={
          <AnimatedPressable
            hitSlop={8}
            onPress={() => { haptic.light(); updateSetting('fitnessVoice', VOZ_CICLO[settings.fitnessVoice]); }}
            style={[s.voiceBtn, { backgroundColor: tk.card, borderColor: tk.borde }]}
          >
            <Ionicons name={VOZ_ICONO[settings.fitnessVoice]} size={17} color={settings.fitnessVoice === 'off' ? tk.textoTenue : ATP_BRAND.lime} />
          </AnimatedPressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 140 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Progreso — MB-3.7 §1.2: el número manda (en el gym se lee rápido);
            la barra queda como indicador ambiental delgado, sin label propio. */}
        <View style={s.progressRow}>
          <Text style={[s.progressText, secTxt]}>{actual.esTiempo ? 'BLOQUE' : 'EJERCICIO'} {idx + 1} / {bloques.length}</Text>
          <View style={[s.progressBar, { backgroundColor: tk.card }]}>
            <View style={[s.progressFill, { width: `${((idx) / bloques.length) * 100}%` }]} />
          </View>
        </View>

        {/* Hero del ejercicio: CLIP en loop protagonista + degradado (molde
            editorial). Bloques de tiempo (sin matriz) → hero de gradiente. */}
        {actual.esTiempo ? (
          <Animated.View key={actual.slug} entering={FadeInDown.duration(300)} style={[s.heroCard, s.heroCardTiempo]}>
            <LinearGradient
              colors={[PILLAR_GRADIENTS.fitness.start, PILLAR_GRADIENTS.fitness.end]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={s.heroContent}>
              <Text style={s.heroName}>{actual.nombre}</Text>
              <View style={s.heroPills}>
                <View style={s.heroPill}>
                  <Text style={s.heroPillText}>{actual.esDescansoTiempo ? 'DESCANSO' : 'POR TIEMPO'}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key={actual.slug} entering={FadeInDown.duration(300)} style={s.heroCard}>
            <ExerciseClip
              clipUrl={clipDe(actual)}
              posterUrl={posterDe({ mediaUrl: actual.mediaUrl, posterUrl: actual.posterUrl ?? null })}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.82)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={s.heroContent}>
              <Text style={s.heroName}>{actual.nombre}</Text>
              <View style={s.heroPills}>
                <View style={s.heroPill}><Text style={s.heroPillText}>{actual.musculoPrincipal}</Text></View>
                <View style={s.heroPill}><Text style={s.heroPillText}>{actual.patron}</Text></View>
                {actual.metodo !== 'Estándar' && (
                  <View style={[s.heroPill, { backgroundColor: withOpacity(CATEGORY_COLORS.fitness, 0.25) }]}>
                    <Text style={[s.heroPillText, { color: ATP_BRAND.lime }]}>{actual.metodo}</Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Cuerpo: tiempo inline, estándar o método */}
        {actual.esTiempo && (
          <TiempoBlockRunner key={`tiempo-${idx}`} block={actual} onCue={cue} onDone={() => avanzar([])} />
        )}
        {!actual.esTiempo && actual.metodo === 'Estándar' && (
          <StandardBlockRunner
            key={`std-${actual.slug}-${idx}`}
            block={actual}
            onCue={cue}
            onDone={avanzar}
            onSetLogged={(partial) => stashNow(sets, idx, partial)}
            initialLogged={resumePartial ?? undefined}
          />
        )}
        {actual.metodo === '3-5' && (
          <Method35 key={`m35-${idx}`} exerciseName={actual.nombre} userLevel={nivelMetodo} onComplete={(st) => onMethodComplete(actual, { sets: st })} onCue={cue} />
        )}
        {actual.metodo === 'EMOM Auto' && (
          <EMOMAuto key={`emom-${idx}`} exerciseName={actual.nombre} userLevel={nivelMetodo} prescripcion={actual.emom} onComplete={(r) => onMethodComplete(actual, r)} onCue={cue} />
        )}
        {actual.metodo === 'Myo-reps' && (
          <MyoReps key={`myo-${idx}`} exerciseName={actual.nombre} onComplete={(r) => onMethodComplete(actual, r)} onCue={cue} />
        )}

        {/* Acciones */}
        <View style={s.actionsRow}>
          <AnimatedPressable onPress={saltarEjercicio} style={s.skipExercise}>
            <Ionicons name="play-skip-forward-outline" size={15} color={tk.textoSecundario} />
            <Text style={[s.skipExerciseText, secTxt]}>{actual.esTiempo ? 'Saltar bloque' : 'Saltar ejercicio'}</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => finalizar(sets)} disabled={saving} style={[s.endBtn, { backgroundColor: tk.flotante, borderColor: tk.bordeMarcado }]}>
            <Text style={[s.endBtnText, { color: tk.texto }]}>{saving ? 'GUARDANDO…' : 'TERMINAR'}</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ──

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaText: { fontFamily: Fonts.regular, fontSize: 14 },

  progressRow: { marginBottom: Spacing.md },
  progressText: { fontFamily: Fonts.semiBold, fontSize: 11, letterSpacing: 2, marginBottom: 6 },
  progressBar: { height: 2, borderRadius: 1 },
  progressFill: { height: '100%', backgroundColor: withOpacity(ATP_BRAND.lime, 0.75), borderRadius: 1 },

  heroCard: {
    height: 220,
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: ELEVATION[1].bg,
    justifyContent: 'flex-end',
  },
  heroCardTiempo: { height: 120 },
  heroContent: { padding: Spacing.md },
  heroName: { color: TEXT.primary, fontFamily: Fonts.extraBold, fontSize: 22 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  heroPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroPillText: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.semiBold, fontSize: 11 },

  serieCard: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  serieLabel: { fontFamily: Fonts.bold, fontSize: 13, letterSpacing: 2 },
  serieMeta: { fontFamily: Fonts.regular, fontSize: 13 },
  inputsRow: { flexDirection: 'row', gap: Spacing.md, marginVertical: Spacing.sm },
  inputCol: { flex: 1 },
  inputLabel: { fontFamily: Fonts.semiBold, fontSize: 10, letterSpacing: 1, marginBottom: 6, textAlign: 'center' },
  input: {
    fontFamily: Fonts.bold, fontSize: 22,
    borderRadius: Radius.sm, paddingVertical: Spacing.sm, textAlign: 'center',
  },

  // MB-7 Track C: bloque de tiempo inline
  tiempoTime: {
    fontFamily: Fonts.extraBold, fontSize: 64,
    fontVariant: ['tabular-nums'], textAlign: 'center', marginVertical: Spacing.xs,
  },
  tiempoActions: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', marginTop: Spacing.xs },
  tiempoSecondary: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill,
    borderWidth: 1,
  },
  tiempoSecondaryText: { fontFamily: Fonts.semiBold, fontSize: 13 },
  tiempoSkip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, backgroundColor: ATP_BRAND.lime,
  },
  tiempoSkipText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: 13, letterSpacing: 1 },

  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  loggedDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
  },
  loggedDotText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: 11 },
  loggedText: { fontFamily: Fonts.regular, fontSize: 13 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl },
  skipExercise: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.sm },
  skipExerciseText: { fontFamily: Fonts.semiBold, fontSize: 13 },
  endBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  endBtnText: { fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1 },

  voiceBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  summaryHero: { borderRadius: Radius.card, padding: Spacing.lg, marginBottom: Spacing.md },
  summaryTitle: { color: TEXT.primary, fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: 1, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCell: { width: '47%', paddingVertical: Spacing.sm },
  statValue: { color: TEXT.primary, fontFamily: Fonts.extraBold, fontSize: 30, fontVariant: ['tabular-nums'] },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.semiBold, fontSize: 10, letterSpacing: 1.5 },

  sectionCard: {
    borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 2 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: Spacing.sm },
  prName: { fontFamily: Fonts.semiBold, fontSize: 14, flex: 1 },
  prValue: { color: SEMANTIC.acceptable, fontFamily: Fonts.bold, fontSize: 13 },
  cardioValue: { fontFamily: Fonts.bold, fontSize: 13, fontVariant: ['tabular-nums'] },
  prCelebrate: { fontFamily: Fonts.semiBold, fontSize: 13, marginTop: Spacing.xs },
  edadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  edadText: { fontFamily: Fonts.regular, fontSize: 13, flex: 1, lineHeight: 19 },
});
