/**
 * Modo Rutina — Ejecución de rutinas de fuerza/hipertrofia.
 *
 * El usuario controla el ritmo: countup en trabajo, semáforo en descanso,
 * registro de reps/peso integrado en cada set.
 * Visual overhaul: gradientes funcionales, glow, inputs premium.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';

import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ConfettiCelebration } from '@/src/components/ui/ConfettiCelebration';
import { useRoutineMode } from '@/src/hooks/useRoutineMode';
import { getLastWeight } from '@/src/services/exercise-service';
import { formatTime } from '@/src/engine/helpers';
import { Colors, Fonts, Spacing, FontSizes, Radius } from '@/constants/theme';
import type { Routine } from '@/src/engine/types';

// === COLORES DEL SEMÁFORO ===

const ZONE_COLORS = {
  blue: '#5B9BD5',
  yellow: '#EF9F27',
  red: '#E24B4A',
  green: '#a8e02a',
};

// Gradientes oscuros por zona
const ZONE_GRADIENTS: Record<string, readonly [string, string]> = {
  green: ['#1a2a1a', '#0a1a0a'],
  blue: ['#0a1a2a', '#0a0a1a'],
  yellow: ['#2a1f0a', '#1a1a0a'],
  red: ['#2a0a0a', '#1a0a0a'],
};

// === PANTALLA PRINCIPAL ===

export default function RoutineExecutionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routine?: string }>();

  const routine = useMemo((): Routine | null => {
    if (!params.routine) return null;
    try { return JSON.parse(params.routine); } catch { return null; }
  }, [params.routine]);

  if (!routine) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <EliteText variant="title">SIN RUTINA</EliteText>
        <EliteButton label="VOLVER" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  return <RoutineContent routine={routine} />;
}

// === CONTENIDO ===

function RoutineContent({ routine }: { routine: Routine }) {
  const router = useRouter();
  useKeepAwake();

  const rm = useRoutineMode(routine);

  // Inputs del set actual
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState<number | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const [rir, setRir] = useState<number | null>(null);
  const lastWeightLoaded = useRef<string | null>(null);

  useEffect(() => {
    const exerciseId = rm.currentExercise?.exerciseId;
    if (!exerciseId || lastWeightLoaded.current === exerciseId) return;
    lastWeightLoaded.current = exerciseId;

    getLastWeight(exerciseId).then(w => {
      if (w !== null) setWeight(w);
      else setWeight(null);
    });
  }, [rm.currentExercise?.exerciseId]);

  const handleCompleteSet = useCallback(async () => {
    await rm.completeSet(reps, weight, rpe, rir);
    setRir(null);
  }, [rm, reps, weight, rpe, rir]);

  const handleStartWorking = useCallback(() => {
    setReps(10);
    setRpe(null);
    lastWeightLoaded.current = null;
    rm.startWorking();
  }, [rm]);

  // === PR CELEBRATION ===
  const [showPRCelebration, setShowPRCelebration] = useState(false);

  useEffect(() => {
    if (rm.lastPR) {
      setShowPRCelebration(true);
      const timer = setTimeout(() => {
        setShowPRCelebration(false);
        rm.clearPR();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [rm.lastPR, rm.clearPR]);

  // === IDLE ===
  if (rm.phase === 'idle') {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <Ionicons name="barbell-outline" size={64} color={Colors.neonGreen} />
        <EliteText variant="title" style={styles.routineName}>{routine.name}</EliteText>
        <EliteText variant="body" style={styles.subtitle}>
          {rm.exercises.length} ejercicios
        </EliteText>

        <View style={styles.exercisePreviewList}>
          {rm.exercises.map((ex, i) => (
            <LinearGradient key={ex.blockId} colors={['#1a2a1a', '#111111']} style={styles.exercisePreviewRow}>
              <View style={styles.exercisePreviewNum}>
                <EliteText variant="caption" style={styles.exercisePreviewNumText}>{i + 1}</EliteText>
              </View>
              <EliteText variant="body" style={styles.exercisePreviewName} numberOfLines={1}>
                {ex.exerciseName}
              </EliteText>
              <EliteText variant="caption" style={styles.exercisePreviewSets}>
                {ex.suggestedSets} {ex.suggestedSets === 1 ? 'set' : 'sets'}
              </EliteText>
            </LinearGradient>
          ))}
        </View>

        <EliteButton label="EMPEZAR" onPress={rm.start} style={{ marginTop: 24 }} />
        <EliteButton label="VOLVER" variant="outline" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </SafeAreaView>
    );
  }

  // === COMPLETADA ===
  if (rm.phase === 'completed' && rm.stats) {
    // Calcular resumen general
    let totalVolume = 0;
    const prCount = rm.sessionPRs.size;

    rm.exercises.forEach((_, i) => {
      const sets = rm.completedSets.get(i) ?? [];
      for (const set of sets) {
        if (set.reps && set.weightKg && set.weightKg > 0) {
          totalVolume += set.reps * set.weightKg;
        }
      }
    });

    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ConfettiCelebration visible={true} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.completedScroll}>
          {/* Hero */}
          <EliteText variant="title" style={{ color: Colors.neonGreen, fontSize: 28 }}>
            RUTINA COMPLETADA
          </EliteText>
          <EliteText variant="body" style={styles.subtitle}>{routine.name}</EliteText>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>TIEMPO</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {formatTime(rm.stats.totalDurationSeconds)}
              </EliteText>
            </LinearGradient>
            <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>SETS</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {rm.stats.totalSets}
              </EliteText>
            </LinearGradient>
            <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>REPS</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {rm.stats.totalReps}
              </EliteText>
            </LinearGradient>
            <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>VOLUMEN</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {totalVolume > 0 ? `${totalVolume.toLocaleString()}kg` : '—'}
              </EliteText>
            </LinearGradient>
          </View>

          {/* PRs de la sesión */}
          {prCount > 0 && (
            <View style={styles.prSummaryBanner}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
              <EliteText variant="body" style={styles.prSummaryText}>
                {prCount} {prCount === 1 ? 'NUEVO RECORD' : 'NUEVOS RECORDS'}
              </EliteText>
            </View>
          )}

          {/* Resumen por ejercicio */}
          <EliteText variant="caption" style={styles.completedSectionLabel}>
            DESGLOSE POR EJERCICIO
          </EliteText>

          {rm.exercises.map((ex, i) => {
            const sets = rm.completedSets.get(i) ?? [];
            if (sets.length === 0) return null;
            const totalReps = sets.reduce((s, set) => s + (set.reps ?? 0), 0);
            const maxWeight = Math.max(0, ...sets.map(s => s.weightKg ?? 0));
            const exVolume = sets.reduce((s, set) => {
              if (set.reps && set.weightKg && set.weightKg > 0) return s + set.reps * set.weightKg;
              return s;
            }, 0);
            const hasPR = rm.sessionPRs.has(ex.exerciseId);

            return (
              <LinearGradient key={ex.blockId} colors={['#1a2a1a', '#111111']} style={styles.exerciseSummaryCard}>
                <View style={styles.exerciseSummaryHeader}>
                  <Ionicons name="barbell-outline" size={16} color={Colors.neonGreen} />
                  <EliteText variant="body" style={styles.exerciseSummaryName} numberOfLines={1}>
                    {ex.exerciseName}
                  </EliteText>
                  {hasPR && (
                    <View style={styles.prBadgeSmall}>
                      <Ionicons name="trophy" size={10} color="#FFD700" />
                      <EliteText variant="caption" style={styles.prBadgeSmallText}>PR!</EliteText>
                    </View>
                  )}
                </View>
                <View style={styles.exerciseSummaryStatsRow}>
                  <EliteText variant="caption" style={styles.exerciseSummaryStat}>
                    {sets.length}/{ex.suggestedSets} sets
                  </EliteText>
                  <EliteText variant="caption" style={styles.exerciseSummaryDot}>·</EliteText>
                  <EliteText variant="caption" style={styles.exerciseSummaryStat}>
                    {totalReps} reps
                  </EliteText>
                  {maxWeight > 0 && (
                    <>
                      <EliteText variant="caption" style={styles.exerciseSummaryDot}>·</EliteText>
                      <EliteText variant="caption" style={styles.exerciseSummaryStat}>
                        Max {maxWeight}kg
                      </EliteText>
                    </>
                  )}
                  {exVolume > 0 && (
                    <>
                      <EliteText variant="caption" style={styles.exerciseSummaryDot}>·</EliteText>
                      <EliteText variant="caption" style={styles.exerciseSummaryStat}>
                        Vol {exVolume.toLocaleString()}kg
                      </EliteText>
                    </>
                  )}
                </View>
                {sets.map(set => (
                  <View key={set.setNumber} style={styles.setDetailRow}>
                    <EliteText variant="caption" style={styles.setDetailNum}>Set {set.setNumber}:</EliteText>
                    <EliteText variant="caption" style={styles.setDetailData}>
                      {set.reps} reps{set.weightKg != null ? ` × ${set.weightKg}kg` : ''}{set.rir != null ? ` @ RIR ${set.rir}` : ''}
                      {set.rpe ? ` @RPE${set.rpe}` : ''}
                    </EliteText>
                  </View>
                ))}
              </LinearGradient>
            );
          })}

          {/* Botones */}
          <View style={{ gap: 12, alignItems: 'center', marginTop: 24, width: '100%' }}>
            <AnimatedPressable
              onPress={() => router.push('/personal-records')}
              style={styles.completedOutlineBtn}
            >
              <Ionicons name="trophy-outline" size={18} color={Colors.neonGreen} />
              <EliteText variant="body" style={styles.completedOutlineBtnText}>VER MIS MARCAS</EliteText>
            </AnimatedPressable>
            <EliteButton label="VOLVER AL INICIO" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // === TRANSICIÓN ===
  if (rm.phase === 'transition') {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <EliteText variant="caption" style={styles.sessionTime}>
          Sesión {formatTime(rm.elapsedSeconds)}
        </EliteText>
        <EliteText variant="caption" style={styles.exerciseCounter}>
          Ejercicio {rm.currentExerciseIndex + 1} de {rm.exercises.length}
        </EliteText>
        <Ionicons name="barbell-outline" size={48} color={Colors.neonGreen} style={{ marginVertical: 16 }} />
        <EliteText variant="title" style={styles.bigExerciseName}>
          {rm.currentExercise?.exerciseName}
        </EliteText>
        <EliteText variant="body" style={styles.subtitle}>
          {rm.totalSuggestedSets} series sugeridas · {rm.currentExercise?.suggestedRestSeconds}s descanso
        </EliteText>
        <EliteButton label="EMPEZAR" onPress={handleStartWorking} style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }

  // === AWAITING_NEXT ===
  if (rm.phase === 'awaiting_next') {
    const nextEx = rm.nextExerciseData;
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <EliteText variant="caption" style={styles.sessionTime}>
          Sesión {formatTime(rm.elapsedSeconds)}
        </EliteText>
        <EliteText variant="title" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
          ¿Pasamos al siguiente ejercicio?
        </EliteText>
        {nextEx ? (
          <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.transitionCard}>
            <Ionicons name="barbell-outline" size={32} color={Colors.neonGreen} />
            <EliteText variant="subtitle" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
              {nextEx.exerciseName}
            </EliteText>
            <EliteText variant="caption" style={styles.subtitle}>
              {nextEx.suggestedSets} series sugeridas
            </EliteText>
          </LinearGradient>
        ) : (
          <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.transitionCard}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.neonGreen} />
            <EliteText variant="subtitle" style={{ marginTop: Spacing.sm }}>
              Último ejercicio completado
            </EliteText>
          </LinearGradient>
        )}

        <View style={{ width: '100%', gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Pressable
            onPress={rm.confirmNextExercise}
            style={({ pressed }) => [styles.mainAction, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="play" size={22} color={Colors.textOnGreen} />
            <EliteText variant="body" style={styles.mainActionText}>
              {nextEx ? 'EMPEZAR' : 'FINALIZAR RUTINA'}
            </EliteText>
          </Pressable>

          <Pressable
            onPress={() => rm.addExtraSet()}
            style={({ pressed }) => [styles.outlineAction, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.neonGreen} />
            <EliteText variant="body" style={styles.outlineActionText}>+ Serie extra</EliteText>
          </Pressable>

          <Pressable
            onPress={rm.cancelNextExercise}
            style={({ pressed }) => [styles.outlineAction, { borderColor: Colors.textSecondary }, pressed && { opacity: 0.7 }]}
          >
            <EliteText variant="body" style={[styles.outlineActionText, { color: Colors.textSecondary }]}>
              Volver
            </EliteText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // === TRABAJANDO / DESCANSANDO ===
  const isWorking = rm.phase === 'working';
  const isResting = rm.phase === 'resting';
  const zoneColor = isWorking ? ZONE_COLORS.green : ZONE_COLORS[rm.restZone];
  const zoneGrad = isWorking ? ZONE_GRADIENTS.green : (ZONE_GRADIENTS[rm.restZone] ?? ZONE_GRADIENTS.blue);
  const currentSetNum = (rm.currentSets.length) + (isWorking ? 1 : 0);

  // Dots de progreso de sets
  const setDots = [];
  for (let i = 0; i < rm.totalSuggestedSets; i++) {
    const isCompleted = i < rm.currentSets.length;
    const isActive = i === rm.currentSets.length && isWorking;
    setDots.push({ isCompleted, isActive, index: i });
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── PR Celebration Overlay ── */}
      <ConfettiCelebration visible={showPRCelebration} />
      {showPRCelebration && rm.lastPR && (
        <View style={styles.prOverlay} pointerEvents="none">
          <View style={styles.prOverlayBadge}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <EliteText style={styles.prOverlayText}>NUEVO RECORD!</EliteText>
            <EliteText variant="caption" style={styles.prOverlayDetail}>
              {rm.lastPR.exerciseName} · {rm.lastPR.weightKg}kg × {rm.lastPR.reps}
            </EliteText>
          </View>
        </View>
      )}

      {/* ── Hero Bar ── */}
      <LinearGradient colors={zoneGrad} style={styles.heroBar}>
        <View style={[styles.heroBarAccent, { backgroundColor: Colors.neonGreen }]} />

        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.neonGreen} />
        </Pressable>

        <View style={styles.heroBarContent}>
          <EliteText variant="body" style={styles.heroBarName} numberOfLines={1}>
            {routine.name}
          </EliteText>
          <EliteText variant="caption" style={styles.heroBarSession}>
            Sesión {formatTime(rm.elapsedSeconds)}
          </EliteText>
        </View>

        {/* Progress info */}
        <View style={styles.heroBarProgress}>
          <EliteText variant="caption" style={styles.heroBarProgressText}>
            Ejercicio {rm.currentExerciseIndex + 1} de {rm.exercises.length} · {Math.round(((rm.currentExerciseIndex) / rm.exercises.length) * 100)}%
          </EliteText>
          <View style={styles.heroProgressBar}>
            <View style={[styles.heroProgressFill, { width: `${((rm.currentExerciseIndex) / rm.exercises.length) * 100}%` }]} />
          </View>
        </View>
      </LinearGradient>

      {/* ── Ejercicio + Set ── */}
      <View style={styles.exerciseSection}>
        <EliteText variant="subtitle" style={styles.exerciseTitle} numberOfLines={1}>
          {rm.currentExercise?.exerciseName}
        </EliteText>
        <EliteText variant="caption" style={[styles.setIndicator, { color: zoneColor }]}>
          SET {currentSetNum} DE {rm.totalSuggestedSets}
        </EliteText>
        {/* Set dots */}
        <View style={styles.setDotsRow}>
          {setDots.map((dot) => (
            <View
              key={dot.index}
              style={[
                styles.setDot,
                dot.isCompleted && { backgroundColor: Colors.neonGreen },
                dot.isActive && { backgroundColor: zoneColor, borderWidth: 2, borderColor: zoneColor },
                !dot.isCompleted && !dot.isActive && { backgroundColor: '#2a2a2a' },
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Timer Circular ── */}
      <View style={[styles.timerCircleOuter, {
        shadowColor: zoneColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      }]}>
        {/* Aura */}
        <View style={[styles.timerAura, { backgroundColor: zoneColor + '08' }]} />

        <View style={[styles.timerCircle, { borderColor: zoneColor }]}>
          {isWorking && (
            <>
              <EliteText variant="caption" style={[styles.timerLabel, { color: zoneColor }]}>TRABAJO</EliteText>
              <EliteText style={[styles.timerValue, { color: zoneColor }]}>
                {formatTime(rm.workSeconds)}
              </EliteText>
            </>
          )}
          {isResting && rm.restCountdown > 0 && (
            <>
              <EliteText variant="caption" style={[styles.timerLabel, { color: zoneColor }]}>DESCANSO</EliteText>
              <EliteText style={[styles.timerValue, { color: zoneColor }]}>
                {formatTime(rm.restCountdown)}
              </EliteText>
              <EliteText variant="caption" style={styles.timerSub}>
                {rm.restSeconds}s de {rm.suggestedRest}s
              </EliteText>
            </>
          )}
          {isResting && rm.restCountdown === 0 && (
            <>
              {/* Badge de zona */}
              <View style={[styles.zoneBadge, { backgroundColor: zoneColor + '20', borderColor: zoneColor + '40' }]}>
                <EliteText variant="caption" style={[styles.zoneBadgeText, { color: zoneColor }]}>
                  {rm.restZone === 'yellow' ? '⚠ DESCANSO CUMPLIDO' : 'MUCHO DESCANSO'}
                </EliteText>
              </View>
              <EliteText style={[styles.timerValue, { color: zoneColor }]}>
                +{formatTime(rm.restOvertime)}
              </EliteText>
              <EliteText variant="caption" style={styles.timerSub}>
                Sugerido: {rm.suggestedRest}s
              </EliteText>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.bottomSection} showsVerticalScrollIndicator={false}>
        {/* ── Inputs de Reps/Peso/RIR (solo working) ── */}
        {isWorking && (
          <View style={styles.inputsContainer}>
            {/* Reps */}
            <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.inputCard}>
              <View style={[styles.inputAccentLine, { backgroundColor: Colors.neonGreen }]} />
              <EliteText variant="caption" style={styles.inputLabel}>REPS</EliteText>
              <View style={styles.inputRow}>
                <Pressable onPress={() => setReps(r => Math.max(1, r - 1))} style={styles.inputBtn}>
                  <Ionicons name="remove" size={18} color={Colors.textPrimary} />
                </Pressable>
                <TextInput
                  style={styles.inputValue}
                  value={String(reps)}
                  onChangeText={t => { const n = parseInt(t, 10); if (!isNaN(n) && n > 0) setReps(n); }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Pressable onPress={() => setReps(r => r + 1)} style={styles.inputBtn}>
                  <Ionicons name="add" size={18} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </LinearGradient>

            {/* Peso */}
            <LinearGradient colors={['#2a1f0a', '#111111']} style={styles.inputCard}>
              <View style={[styles.inputAccentLine, { backgroundColor: '#EF9F27' }]} />
              <EliteText variant="caption" style={styles.inputLabel}>PESO (kg)</EliteText>
              <View style={styles.inputRow}>
                <Pressable onPress={() => setWeight(w => Math.max(0, (w ?? 0) - 2.5))} style={styles.inputBtn}>
                  <Ionicons name="remove" size={18} color={Colors.textPrimary} />
                </Pressable>
                <TextInput
                  style={styles.inputValue}
                  value={weight !== null ? String(weight) : ''}
                  onChangeText={t => {
                    if (t === '') { setWeight(null); return; }
                    const n = parseFloat(t);
                    if (!isNaN(n) && n >= 0) setWeight(n);
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  placeholder="—"
                  placeholderTextColor={Colors.textSecondary}
                />
                <Pressable onPress={() => setWeight(w => (w ?? 0) + 2.5)} style={styles.inputBtn}>
                  <Ionicons name="add" size={18} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </LinearGradient>

            {/* RIR */}
            <LinearGradient colors={['#0a1a2a', '#111111']} style={styles.inputCard}>
              <View style={[styles.inputAccentLine, { backgroundColor: '#5B9BD5' }]} />
              <EliteText variant="caption" style={styles.inputLabel}>RIR</EliteText>
              <View style={styles.inputRow}>
                <Pressable onPress={() => setRir(r => r !== null ? Math.max(0, r - 1) : 2)} style={styles.inputBtn}>
                  <Ionicons name="remove" size={18} color={Colors.textPrimary} />
                </Pressable>
                <TextInput
                  style={styles.inputValue}
                  value={rir !== null ? String(rir) : ''}
                  onChangeText={t => {
                    if (t === '') { setRir(null); return; }
                    const n = parseInt(t, 10);
                    if (!isNaN(n) && n >= 0 && n <= 5) setRir(n);
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  placeholder="—"
                  placeholderTextColor={Colors.textSecondary}
                />
                <Pressable onPress={() => setRir(r => r !== null ? Math.min(5, r + 1) : 3)} style={styles.inputBtn}>
                  <Ionicons name="add" size={18} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Sets completados ── */}
        {rm.currentSets.length > 0 && (
          <View style={styles.setsListContainer}>
            <EliteText variant="caption" style={styles.setsListTitle}>SETS COMPLETADOS</EliteText>
            {rm.currentSets.map(set => (
              <View key={set.setNumber} style={styles.completedSetRow}>
                <View style={styles.setNumCircle}>
                  <EliteText variant="caption" style={styles.setNumCircleText}>{set.setNumber}</EliteText>
                </View>
                <EliteText variant="caption" style={styles.setData}>
                  {set.reps} reps{set.weightKg != null ? ` × ${set.weightKg}kg` : ''}{set.rir != null ? ` @ RIR ${set.rir}` : ''}
                </EliteText>
                <EliteText variant="caption" style={styles.setDuration}>
                  {formatTime(set.durationSeconds)}
                </EliteText>
                <Ionicons name="checkmark-circle" size={16} color={Colors.neonGreen} />
              </View>
            ))}

            {/* Set activo */}
            {isWorking && (
              <View style={[styles.completedSetRow, styles.activeSetRow]}>
                <View style={[styles.setNumCircle, { borderColor: zoneColor }]}>
                  <EliteText variant="caption" style={[styles.setNumCircleText, { color: zoneColor }]}>
                    {currentSetNum}
                  </EliteText>
                </View>
                <EliteText variant="caption" style={[styles.setData, { color: zoneColor }]}>
                  En progreso...
                </EliteText>
              </View>
            )}

            {/* Sets pendientes */}
            {Array.from({ length: Math.max(0, rm.totalSuggestedSets - currentSetNum) }).map((_, i) => (
              <View key={`pending-${i}`} style={styles.completedSetRow}>
                <View style={[styles.setNumCircle, { borderColor: '#2a2a2a' }]}>
                  <EliteText variant="caption" style={[styles.setNumCircleText, { color: '#2a2a2a' }]}>
                    {currentSetNum + i + 1}
                  </EliteText>
                </View>
                <EliteText variant="caption" style={[styles.setData, { color: '#2a2a2a' }]}>—</EliteText>
              </View>
            ))}
          </View>
        )}

        {/* ── Preview siguiente ejercicio ── */}
        {rm.nextExerciseData && (
          <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.nextExercisePreview}>
            <View style={[styles.nextDot, { backgroundColor: Colors.neonGreen }]} />
            <EliteText variant="caption" style={styles.nextLabel}>SIGUIENTE</EliteText>
            <EliteText variant="body" style={styles.nextName} numberOfLines={1}>
              {rm.nextExerciseData.exerciseName}
            </EliteText>
            <EliteText variant="caption" style={styles.nextSets}>
              {rm.nextExerciseData.suggestedSets} sets
            </EliteText>
          </LinearGradient>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* === BOTONES PRINCIPALES === */}
      <View style={styles.actionsBar}>
        {isWorking && (
          <AnimatedPressable onPress={handleCompleteSet} scaleDown={0.95} style={styles.mainAction}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.textOnGreen} />
            <EliteText variant="body" style={styles.mainActionText}>SERIE COMPLETADA</EliteText>
          </AnimatedPressable>
        )}

        {isResting && (
          <AnimatedPressable onPress={rm.nextSet} scaleDown={0.95} style={[styles.mainAction, { backgroundColor: zoneColor }]}>
            <Ionicons name="play" size={22} color={Colors.black} />
            <EliteText variant="body" style={[styles.mainActionText, { color: Colors.black }]}>
              SIGUIENTE SERIE
            </EliteText>
          </AnimatedPressable>
        )}

        <View style={styles.secondaryActions}>
          <AnimatedPressable onPress={rm.addExtraSet} style={styles.secondaryBtn}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.neonGreen} />
            <EliteText variant="caption" style={styles.secondaryBtnText}>+ Serie extra</EliteText>
          </AnimatedPressable>
          <AnimatedPressable onPress={rm.requestNextExercise} style={styles.secondaryBtn}>
            <Ionicons name="play-skip-forward-outline" size={18} color={Colors.textSecondary} />
            <EliteText variant="caption" style={styles.secondaryBtnTextMuted}>Siguiente ejercicio</EliteText>
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  routineName: {
    marginTop: Spacing.md,
    fontSize: FontSizes.xl,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // ── Idle: lista de ejercicios ──
  exercisePreviewList: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  exercisePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  exercisePreviewNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.neonGreen + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercisePreviewNumText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  exercisePreviewName: {
    flex: 1,
    color: Colors.textPrimary,
  },
  exercisePreviewSets: {
    color: Colors.textSecondary,
  },

  // ── Hero Bar ──
  heroBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    overflow: 'hidden',
  },
  heroBarAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.sm,
    top: Spacing.sm,
    padding: Spacing.xs,
    zIndex: 10,
  },
  heroBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: Spacing.xl,
  },
  heroBarName: {
    fontFamily: Fonts.bold,
    color: Colors.neonGreen,
    fontSize: 15,
    flex: 1,
  },
  heroBarSession: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontSize: 12,
  },
  heroBarProgress: {
    paddingLeft: Spacing.xl,
    marginTop: Spacing.xs,
  },
  heroBarProgressText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 3,
  },
  heroProgressBar: {
    width: '100%',
    height: 2,
    backgroundColor: '#2a2a2a',
    borderRadius: 1,
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: 1,
  },

  // ── Ejercicio + Set ──
  exerciseSection: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  exerciseTitle: {
    textAlign: 'center',
    fontSize: 24,
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
  },
  bigExerciseName: {
    fontSize: FontSizes.xl,
    textAlign: 'center',
    letterSpacing: 2,
  },
  setIndicator: {
    letterSpacing: 2,
    marginTop: Spacing.xs,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  setDotsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  setDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // ── Timer ──
  timerCircleOuter: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timerAura: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -20,
    left: -20,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLabel: {
    letterSpacing: 2,
    fontSize: 12,
  },
  timerValue: {
    fontSize: 44,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  zoneBadge: {
    position: 'absolute',
    top: -14,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  zoneBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },

  // ── Inputs ──
  bottomSection: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  inputsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  inputCard: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  inputAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  inputLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontSize: 10,
    marginTop: 2,
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputValue: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
    fontSize: 22,
    paddingVertical: 0,
    minWidth: 24,
  },

  // ── Sets completados ──
  setsListContainer: {
    marginBottom: Spacing.md,
  },
  setsListTitle: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    fontSize: 11,
  },
  completedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: Colors.neonGreen,
    paddingLeft: Spacing.sm,
    marginBottom: 2,
  },
  activeSetRow: {
    borderLeftColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '08',
    borderRadius: Radius.sm,
  },
  setNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumCircleText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  setData: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
  },
  setDuration: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontSize: 11,
  },

  // ── Preview siguiente ──
  nextExercisePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    marginBottom: Spacing.md,
  },
  nextDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontSize: 10,
  },
  nextName: {
    flex: 1,
    fontSize: 13,
  },
  nextSets: {
    color: Colors.textSecondary,
  },

  // ── Acciones ──
  actionsBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    backgroundColor: Colors.black,
  },
  mainAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neonGreen,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    height: 60,
  },
  mainActionText: {
    color: Colors.textOnGreen,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  secondaryBtnTextMuted: {
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  outlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.neonGreen,
  },
  outlineActionText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
  },
  transitionCard: {
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },

  // ── Completada ──
  completedScroll: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    width: '47%',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  statLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    fontSize: 10,
  },
  statValue: {
    color: Colors.neonGreen,
    fontSize: 20,
  },
  exerciseSummaryCard: {
    width: '100%',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  exerciseSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  exerciseSummaryName: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },
  exerciseSummaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
  },
  exerciseSummaryStat: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  exerciseSummaryDot: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  setDetailRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingLeft: Spacing.md + Spacing.xs,
    paddingVertical: 1,
  },
  setDetailNum: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    width: 45,
  },
  setDetailData: {
    color: Colors.textPrimary,
    fontSize: 10,
  },

  // ── Misc ──
  sessionTime: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  exerciseCounter: {
    color: Colors.textSecondary,
    fontSize: 11,
  },

  // ── PR Celebration ──
  prOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prOverlayBadge: {
    backgroundColor: '#1a2a1a',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  prOverlayText: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    color: '#FFD700',
    letterSpacing: 2,
    marginTop: Spacing.sm,
  },
  prOverlayDetail: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontSize: 13,
  },

  // ── Completed: PR summary ──
  prSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFD700' + '15',
    borderWidth: 1,
    borderColor: '#FFD700' + '40',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  prSummaryText: {
    color: '#FFD700',
    fontFamily: Fonts.bold,
    fontSize: 14,
    letterSpacing: 1,
  },
  completedSectionLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  prBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFD700' + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  prBadgeSmallText: {
    color: '#FFD700',
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  completedOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.neonGreen,
    width: '100%',
  },
  completedOutlineBtnText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
  },
});
