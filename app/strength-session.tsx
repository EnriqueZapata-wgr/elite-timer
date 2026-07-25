/**
 * Strength Session — runner UNIFICADO de sesión de fuerza (MB-3 Tracks D+E+F).
 *
 * UN solo camino de ejecución: series estándar (registro inline + timer de
 * descanso con cuenta hablada) y los 3 métodos ATP (3-5 / EMOM / Myo-reps)
 * corren aquí con voz + háptico + keep-awake. Al cerrar: sesión persistida
 * (workout_sessions + exercise_logs), PRs con celebración (brinco >15%) y la
 * señal de Edad ATP (puente Track C).
 *
 * Entrada: ?plan=<GeneratedRoutine JSON> (generador) o ?slugs=a,b,c (biblioteca).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Alert, DeviceEventEmitter } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { saveWorkoutSession, type SaveSessionResult } from '@/src/services/fitness/workout-session-service';
import type { SessionSet } from '@/src/services/fitness/workout-session-core';
import type { GeneratedRoutine, RoutineBlock } from '@/src/services/fitness/routine-generator-core';
import { clipDe, posterDe } from '@/src/constants/exercise-matrix';
import { ATP_BRAND, TEXT, ELEVATION, PILLAR_GRADIENTS, SEMANTIC, withOpacity, CATEGORY_COLORS } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';

const CARDIO_LABELS: Record<string, string> = {
  running: 'Correr', cycling: 'Ciclismo', swimming: 'Natación', rowing: 'Remo', other: 'Cardio',
};

// ── Runner de bloque estándar (registro inline + descanso hablado) ──

function StandardBlockRunner({ block, onCue, onDone }: {
  block: RoutineBlock;
  onCue: (t: string) => void;
  onDone: (sets: SessionSet[]) => void;
}) {
  const [serie, setSerie] = useState(1);
  const [resting, setResting] = useState(false);
  const [peso, setPeso] = useState('');
  const [reps, setReps] = useState(String(block.reps));
  const [logged, setLogged] = useState<SessionSet[]>([]);

  function logSerie() {
    const r = parseInt(reps, 10);
    if (!(r > 0)) {
      Alert.alert('Falta el dato', block.esIsometrico ? 'Registra los segundos del hold.' : 'Registra las repeticiones.');
      return;
    }
    haptic.medium();
    const w = parseFloat(peso);
    const nuevo: SessionSet = {
      slug: block.slug,
      nombre: block.nombre,
      setNumber: serie,
      reps: r,
      weightKg: Number.isFinite(w) && w > 0 && w <= 1000 ? w : null,
      esIsometrico: block.esIsometrico,
      metodo: 'Estándar',
      slot: block.slot,
    };
    const todos = [...logged, nuevo];
    setLogged(todos);
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
        <Animated.View entering={FadeInUp.duration(250)} style={s.serieCard}>
          <Text style={s.serieLabel}>SERIE {serie} DE {block.series}</Text>
          <Text style={s.serieMeta}>
            {block.esIsometrico ? `Hold objetivo: ${block.reps} s` : `Objetivo: ${block.reps} reps`}
            {block.esUnilateral ? ' · por lado' : ''}
          </Text>
          <View style={s.inputsRow}>
            <View style={s.inputCol}>
              <Text style={s.inputLabel}>KG</Text>
              <TextInput
                style={s.input}
                value={peso}
                onChangeText={setPeso}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#444"
                maxLength={6}
              />
            </View>
            <View style={s.inputCol}>
              <Text style={s.inputLabel}>{block.esIsometrico ? 'SEG' : 'REPS'}</Text>
              <TextInput
                style={s.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#444"
                maxLength={3}
              />
            </View>
          </View>
          <GradientCTA label="SERIE HECHA" pillar="fitness" onPress={logSerie} />
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
              <Text style={s.loggedText}>
                {l.weightKg ? `${l.weightKg} kg × ` : ''}{l.reps}{l.esIsometrico ? ' s' : ' reps'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Pantalla ──

// MB-3.5 #6: toggle rápido de voz de Fitness (todo → solo hitos → apagada).
const VOZ_CICLO: Record<FitnessVoiceMode, FitnessVoiceMode> = { todo: 'hitos', hitos: 'off', off: 'todo' };
const VOZ_ICONO: Record<FitnessVoiceMode, 'volume-high' | 'volume-low' | 'volume-mute'> = {
  todo: 'volume-high', hitos: 'volume-low', off: 'volume-mute',
};

export default function StrengthSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string; slugs?: string; name?: string }>();
  const { user } = useAuth();
  const { cue } = useMethodVoice();
  const { settings, updateSetting } = useSettings();

  const plan = useMemo((): GeneratedRoutine | null => {
    if (!params.plan) return null;
    try { return JSON.parse(params.plan) as GeneratedRoutine; } catch { return null; }
  }, [params.plan]);

  const [bloques, setBloques] = useState<RoutineBlock[] | null>(plan?.bloques ?? null);
  const [idx, setIdx] = useState(0);
  const [sets, setSets] = useState<SessionSet[]>([]);
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState<SaveSessionResult | null>(null);
  const startedAtRef = useRef(new Date());
  const anunciadoRef = useRef(-1);

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
    if (actual.metodo === 'Estándar') {
      cue(`Ejercicio ${idx + 1}: ${actual.nombre}. ${actual.series} series de ${actual.reps} ${unidad}.`, { hito: true });
    } else {
      cue(`Ejercicio ${idx + 1}: ${actual.nombre}. Método ${actual.metodo}.`, { hito: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, actual]);

  function avanzar(nuevosSets: SessionSet[]) {
    setSets((prev) => [...prev, ...nuevosSets]);
    if (bloques && idx + 1 < bloques.length) {
      setIdx(idx + 1);
    } else {
      finalizar([...sets, ...nuevosSets]);
    }
  }

  function saltarEjercicio() {
    haptic.light();
    if (bloques && idx + 1 < bloques.length) setIdx(idx + 1);
    else finalizar(sets);
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
    if (!user) { router.back(); return; }
    if (todos.filter((t) => t.reps > 0).length === 0) {
      Alert.alert('Sesión vacía', 'No registraste ninguna serie.', [
        { text: 'Seguir entrenando' },
        { text: 'Salir', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    setSaving(true);
    const res = await saveWorkoutSession({
      userId: user.id,
      sets: todos,
      startedAt: startedAtRef.current,
      endedAt: new Date(),
      source: plan ? 'generada' : 'manual',
      routineName: params.name ?? (plan ? 'Rutina generada' : 'Sesión libre'),
      plan: plan ?? undefined,
    });
    if (res.ok) {
      try { await awardBooleanElectron(user.id, 'strength'); } catch { /* fail-soft */ }
      DeviceEventEmitter.emit('electrons_changed');
      DeviceEventEmitter.emit('day_changed');
      cue('Sesión completada.', { hito: true });
    }
    setSaving(false);
    setResultado(res);
    if (!res.ok) {
      Alert.alert('No se pudo guardar', res.error ?? 'Inténtalo de nuevo.', [
        { text: 'Reintentar', onPress: () => finalizar(todos) },
        { text: 'Salir sin guardar', style: 'destructive', onPress: () => router.back() },
      ]);
    }
  }

  // ── Cierre de sesión (Track F: resumen + celebración + señal de edad) ──
  if (resultado?.ok && resultado.summary) {
    const { summary, prs = [], edadSignal, cardioHoy = [] } = resultado;
    const celebrar = prs.some((p) => p.celebrar);
    return (
      <Screen edges={[]}>
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
                  <Text style={s.statLabel}>SETS</Text>
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
            <Animated.View entering={FadeInDown.delay(60).duration(300)} style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <Ionicons name="pulse" size={16} color={SEMANTIC.info} />
                <Text style={s.sectionTitle}>CARDIO DE HOY · TAMBIÉN CUENTA</Text>
              </View>
              {cardioHoy.map((c, i) => (
                <View key={`${c.discipline}-${i}`} style={s.prRow}>
                  <Text style={s.prName}>{CARDIO_LABELS[c.discipline] ?? c.discipline}</Text>
                  <Text style={s.cardioValue}>
                    {Math.round(c.durationSeconds / 60)} min
                    {c.distanceMeters ? ` · ${(c.distanceMeters / 1000).toFixed(1)} km` : ''}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* PRs */}
          {prs.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(300)} style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <Ionicons name="trophy" size={16} color="#fbbf24" />
                <Text style={s.sectionTitle}>RÉCORDS NUEVOS</Text>
              </View>
              {prs.map((pr) => (
                <View key={pr.slug} style={s.prRow}>
                  <Text style={s.prName} numberOfLines={1}>{pr.nombre}</Text>
                  <Text style={s.prValue}>
                    {pr.new1RM.toFixed(0)} kg 1RM
                    {pr.mejoraPct != null ? `  (+${pr.mejoraPct.toFixed(0)}%)` : '  · primero'}
                  </Text>
                </View>
              ))}
              {celebrar && <Text style={s.prCelebrate}>Brinco de más de 15%. Día grande. 🔥</Text>}
            </Animated.View>
          )}

          {/* Señal Edad ATP (el bucle sudor → dato → edad) */}
          {edadSignal && (edadSignal.alimentado.length > 0 || edadSignal.proyeccion || edadSignal.avisos.length > 0) && (
            <Animated.View entering={FadeInDown.delay(160).duration(300)} style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <Ionicons name="pulse" size={16} color={ATP_BRAND.teal} />
                <Text style={s.sectionTitle}>TU EDAD ATP</Text>
              </View>
              {edadSignal.alimentado.map((a) => (
                <View key={a} style={s.edadRow}>
                  <Ionicons name="checkmark-circle" size={15} color={ATP_BRAND.lime} />
                  <Text style={s.edadText}>{a} — verdad medida, alimentó tu score de fitness.</Text>
                </View>
              ))}
              {edadSignal.proyeccion?.texto && (
                <View style={s.edadRow}>
                  <Ionicons name="trending-down" size={15} color={ATP_BRAND.teal} />
                  <Text style={s.edadText}>{edadSignal.proyeccion.texto}</Text>
                </View>
              )}
              {edadSignal.avisos.map((a) => (
                <View key={a} style={s.edadRow}>
                  <Ionicons name="information-circle-outline" size={15} color={TEXT.secondary} />
                  <Text style={[s.edadText, { color: TEXT.secondary }]}>{a}</Text>
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
      <Screen edges={[]}>
        <ScreenHeader title="Sesión" onBack={() => router.back()} />
        <View style={s.center}><Text style={s.metaText}>Cargando…</Text></View>
      </Screen>
    );
  }
  if (bloques.length === 0 || !actual) {
    return (
      <Screen edges={[]}>
        <ScreenHeader title="Sesión" onBack={() => router.back()} />
        <View style={s.center}>
          <Text style={s.metaText}>No hay ejercicios en esta sesión.</Text>
        </View>
      </Screen>
    );
  }

  // ── Ejecución ──
  const nivelMetodo = 'intermediate' as const;
  return (
    <Screen edges={[]}>
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
            style={s.voiceBtn}
          >
            <Ionicons name={VOZ_ICONO[settings.fitnessVoice]} size={17} color={settings.fitnessVoice === 'off' ? TEXT.tertiary : ATP_BRAND.lime} />
          </AnimatedPressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 140 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Progreso */}
        <View style={s.progressRow}>
          <Text style={s.progressText}>EJERCICIO {idx + 1} / {bloques.length}</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${((idx) / bloques.length) * 100}%` }]} />
          </View>
        </View>

        {/* Hero del ejercicio: CLIP en loop protagonista + degradado (molde editorial) */}
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

        {/* Cuerpo: estándar o método */}
        {actual.metodo === 'Estándar' && (
          <StandardBlockRunner key={`std-${actual.slug}-${idx}`} block={actual} onCue={cue} onDone={avanzar} />
        )}
        {actual.metodo === '3-5' && (
          <Method35 key={`m35-${idx}`} exerciseName={actual.nombre} userLevel={nivelMetodo} onComplete={(st) => onMethodComplete(actual, { sets: st })} onCue={cue} />
        )}
        {actual.metodo === 'EMOM Auto' && (
          <EMOMAuto key={`emom-${idx}`} exerciseName={actual.nombre} userLevel={nivelMetodo} onComplete={(r) => onMethodComplete(actual, r)} onCue={cue} />
        )}
        {actual.metodo === 'Myo-reps' && (
          <MyoReps key={`myo-${idx}`} exerciseName={actual.nombre} onComplete={(r) => onMethodComplete(actual, r)} onCue={cue} />
        )}

        {/* Acciones */}
        <View style={s.actionsRow}>
          <AnimatedPressable onPress={saltarEjercicio} style={s.skipExercise}>
            <Ionicons name="play-skip-forward-outline" size={15} color={TEXT.secondary} />
            <Text style={s.skipExerciseText}>Saltar ejercicio</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => finalizar(sets)} disabled={saving} style={s.endBtn}>
            <Text style={s.endBtnText}>{saving ? 'GUARDANDO…' : 'TERMINAR'}</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ──

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 14 },

  progressRow: { marginBottom: Spacing.md },
  progressText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 11, letterSpacing: 2, marginBottom: 6 },
  progressBar: { height: 3, backgroundColor: ELEVATION[1].bg, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: ATP_BRAND.lime, borderRadius: 2 },

  heroCard: {
    height: 220,
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: ELEVATION[1].bg,
    justifyContent: 'flex-end',
  },
  heroContent: { padding: Spacing.md },
  heroName: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 22 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  heroPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroPillText: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.semiBold, fontSize: 11 },

  serieCard: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  serieLabel: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: 13, letterSpacing: 2 },
  serieMeta: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 13 },
  inputsRow: { flexDirection: 'row', gap: Spacing.md, marginVertical: Spacing.sm },
  inputCol: { flex: 1 },
  inputLabel: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 10, letterSpacing: 1, marginBottom: 6, textAlign: 'center' },
  input: {
    fontFamily: Fonts.bold, fontSize: 22, color: '#fff', backgroundColor: '#0a0a0a',
    borderRadius: Radius.sm, paddingVertical: Spacing.sm, textAlign: 'center',
  },

  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  loggedDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
  },
  loggedDotText: { color: '#000', fontFamily: Fonts.bold, fontSize: 11 },
  loggedText: { color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 13 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl },
  skipExercise: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.sm },
  skipExerciseText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 13 },
  endBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: ELEVATION[2].border, backgroundColor: ELEVATION[2].bg,
  },
  endBtnText: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1 },

  voiceBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },

  summaryHero: { borderRadius: Radius.card, padding: Spacing.lg, marginBottom: Spacing.md },
  summaryTitle: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: 1, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCell: { width: '47%', paddingVertical: Spacing.sm },
  statValue: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 30, fontVariant: ['tabular-nums'] },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.semiBold, fontSize: 10, letterSpacing: 1.5 },

  sectionCard: {
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionTitle: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 2 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: Spacing.sm },
  prName: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: 14, flex: 1 },
  prValue: { color: '#fbbf24', fontFamily: Fonts.bold, fontSize: 13 },
  cardioValue: { color: SEMANTIC.info, fontFamily: Fonts.bold, fontSize: 13, fontVariant: ['tabular-nums'] },
  prCelebrate: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: 13, marginTop: Spacing.xs },
  edadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  edadText: { color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 13, flex: 1, lineHeight: 19 },
});
