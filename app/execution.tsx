import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';

import { CircularTimer } from '@/components/circular-timer';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { SetLogModal } from '@/src/components/SetLogModal';
import { useRoutineEngine } from '@/hooks/use-routine-engine';
import { logExerciseSet } from '@/src/services/exercise-service';
import { formatTime, formatTimeHuman } from '@/src/engine/helpers';
import { TABATA_ROUTINE, GUINNESS_ROUTINE } from '@/src/engine/testData';
import { Colors, Fonts, Spacing, FontSizes, Radius } from '@/constants/theme';
import type { Routine as EngineRoutine, ExecutionStep } from '@/src/engine/types';
import type { ExerciseLog, ExerciseSummary } from '@/src/types/exercise';

// === COLORES POR TIPO DE STEP ===

const STEP_COLORS: Record<string, string> = {
  work: '#a8e02a',
  rest: '#5B9BD5',
  prep: '#EF9F27',
};

const REST_BETWEEN_COLOR = '#888888';

function getStepColor(step: ExecutionStep | null): string {
  if (!step) return Colors.neonGreen;
  if (step.isRestBetween) return REST_BETWEEN_COLOR;
  return STEP_COLORS[step.type] ?? Colors.neonGreen;
}

const STEP_LABELS: Record<string, string> = {
  work: 'TRABAJO',
  rest: 'DESCANSO',
  prep: 'PREPARACIÓN',
};

// Gradientes oscuros por tipo
function getStepGradient(step: ExecutionStep | null): readonly [string, string] {
  if (!step || step.isRestBetween) return ['#1a1a1a', '#111111'];
  switch (step.type) {
    case 'work': return ['#1a2a1a', '#0a1a0a'];
    case 'rest': return ['#0a1a2a', '#0a0a1a'];
    case 'prep': return ['#2a1f0a', '#1a1a0a'];
    default: return ['#1a1a1a', '#111111'];
  }
}

// === PANTALLA PRINCIPAL ===

export default function ExecutionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ testId?: string; routine?: string }>();

  const routine = useMemo((): EngineRoutine | null => {
    if (params.testId === 'tabata') return TABATA_ROUTINE;
    if (params.testId === 'guinness') return GUINNESS_ROUTINE;
    if (params.routine) {
      try {
        return JSON.parse(params.routine);
      } catch (err) {
        if (__DEV__) console.error('[execution] Error al parsear rutina:', err);
        return null;
      }
    }
    return null;
  }, [params.testId, params.routine]);

  if (!routine) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <EliteText variant="title">SIN RUTINA</EliteText>
        <EliteButton label="VOLVER" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  return <ExecutionContent routine={routine} />;
}

// === CONTENIDO DE EJECUCIÓN ===

function ExecutionContent({ routine }: { routine: EngineRoutine }) {
  const router = useRouter();
  useKeepAwake();

  const {
    engineState,
    currentStep,
    nextStep,
    stepAfterNext,
    remainingSeconds,
    elapsedSeconds,
    totalRemainingSeconds,
    stepProgress,
    totalProgress,
    currentStepNumber,
    totalSteps,
    stats,
    routineStats,
    play,
    pause,
    skip,
    restartStep,
    restart,
  } = useRoutineEngine(routine);

  // === SISTEMA DE LOGGING DE EJERCICIOS ===
  const [setLogVisible, setSetLogVisible] = useState(false);
  const [pendingExercise, setPendingExercise] = useState<{
    exerciseId: string;
    exerciseName: string;
    blockId: string;
    setNumber: number;
  } | null>(null);
  const setCounters = useRef<Map<string, number>>(new Map());
  const [sessionLogs, setSessionLogs] = useState<ExerciseLog[]>([]);
  const prevStepRef = useRef<ExecutionStep | null>(null);
  const logShownForStep = useRef<number>(-1);

  const showLogForStep = useCallback((step: ExecutionStep) => {
    if (logShownForStep.current === step.stepIndex) return;
    logShownForStep.current = step.stepIndex;

    const currentCount = (setCounters.current.get(step.exerciseId!) ?? 0) + 1;
    setCounters.current.set(step.exerciseId!, currentCount);

    setPendingExercise({
      exerciseId: step.exerciseId!,
      exerciseName: step.exerciseName ?? step.label,
      blockId: step.blockId,
      setNumber: currentCount,
    });
    setSetLogVisible(true);
  }, []);

  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = currentStep;

    if (
      prev &&
      prev.exerciseId &&
      prev.type === 'work' &&
      currentStep &&
      prev.stepIndex !== currentStep.stepIndex
    ) {
      pause();
      showLogForStep(prev);
    }
  }, [currentStep, pause, showLogForStep]);

  useEffect(() => {
    if (engineState === 'completed') {
      const prev = prevStepRef.current;
      if (prev && prev.exerciseId && prev.type === 'work') {
        showLogForStep(prev);
      }
    }
  }, [engineState, showLogForStep]);

  const handleSaveSet = useCallback(async (data: {
    reps: number;
    weight_kg: number | null;
    rpe: number | null;
  }) => {
    if (!pendingExercise) return;

    try {
      await logExerciseSet({
        exercise_id: pendingExercise.exerciseId,
        reps: data.reps,
        weight_kg: data.weight_kg,
        rpe: data.rpe,
        block_id: pendingExercise.blockId,
        set_number: pendingExercise.setNumber,
      });

      setSessionLogs(prev => [...prev, {
        id: `local-${Date.now()}`,
        exercise_id: pendingExercise.exerciseId,
        exercise_name: pendingExercise.exerciseName,
        set_number: pendingExercise.setNumber,
        reps: data.reps,
        weight_kg: data.weight_kg,
        rpe: data.rpe,
        notes: '',
        logged_at: new Date().toISOString(),
      }]);
    } catch (err) {
      if (__DEV__) console.error('Error al guardar set:', err);
    }

    setSetLogVisible(false);
    setPendingExercise(null);
    play();
  }, [pendingExercise, play]);

  const handleSkipSet = useCallback(() => {
    setSetLogVisible(false);
    setPendingExercise(null);
    play();
  }, [play]);

  const exerciseSummaries = useMemo((): ExerciseSummary[] => {
    if (sessionLogs.length === 0) return [];

    const byExercise = new Map<string, ExerciseLog[]>();
    for (const log of sessionLogs) {
      const existing = byExercise.get(log.exercise_id) ?? [];
      existing.push(log);
      byExercise.set(log.exercise_id, existing);
    }

    return Array.from(byExercise.entries()).map(([exerciseId, logs]) => {
      const totalReps = logs.reduce((sum, l) => sum + l.reps, 0);
      const weights = logs.filter(l => l.weight_kg !== null).map(l => l.weight_kg!);
      const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
      const totalVolume = logs.reduce((sum, l) => {
        if (l.weight_kg && l.weight_kg > 0) return sum + (l.reps * l.weight_kg);
        return sum;
      }, 0);

      return {
        exercise_id: exerciseId,
        exercise_name: logs[0].exercise_name ?? '',
        sets: logs.length,
        total_reps: totalReps,
        max_weight: maxWeight,
        total_volume: totalVolume > 0 ? totalVolume : null,
        logs,
        new_pr: false,
      };
    });
  }, [sessionLogs]);

  const stepColor = getStepColor(currentStep);
  const isCountdown = remainingSeconds <= 3 && remainingSeconds > 0 && engineState === 'running';

  // === PANTALLA COMPLETADA ===

  if (engineState === 'completed' && stats) {
    const workRatio = stats.totalDurationSeconds > 0
      ? Math.round((stats.workSeconds / stats.totalDurationSeconds) * 100)
      : 0;
    const restRatio = 100 - workRatio;

    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.completedScroll}
        >
          <EliteText variant="title" style={styles.completedTitle}>
            RUTINA COMPLETADA
          </EliteText>
          <EliteText variant="body" style={styles.completedRoutine}>
            {routine.name}
          </EliteText>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>TIEMPO TOTAL</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {formatTime(stats.actualDurationSeconds)}
              </EliteText>
            </LinearGradient>
            <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>TRABAJO</EliteText>
              <EliteText variant="subtitle" style={[styles.statValue, { color: STEP_COLORS.work }]}>
                {formatTimeHuman(stats.workSeconds)}
              </EliteText>
              <EliteText variant="caption" style={styles.statRatio}>{workRatio}%</EliteText>
            </LinearGradient>
            <LinearGradient colors={['#0a1a2a', '#111111']} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>DESCANSO</EliteText>
              <EliteText variant="subtitle" style={[styles.statValue, { color: STEP_COLORS.rest }]}>
                {formatTimeHuman(stats.restSeconds)}
              </EliteText>
              <EliteText variant="caption" style={styles.statRatio}>{restRatio}%</EliteText>
            </LinearGradient>
            <LinearGradient colors={['#1a1a1a', '#111111']} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>STEPS</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {stats.stepsCompleted}
              </EliteText>
              {stats.stepsSkipped > 0 && (
                <EliteText variant="caption" style={styles.statSkipped}>
                  {stats.stepsSkipped} saltados
                </EliteText>
              )}
            </LinearGradient>
          </View>

          {/* Resumen de ejercicios */}
          {exerciseSummaries.length > 0 && (
            <View style={styles.exerciseSummarySection}>
              <EliteText variant="label" style={styles.exerciseSummaryTitle}>
                EJERCICIOS REGISTRADOS
              </EliteText>
              {exerciseSummaries.map((summary) => (
                <LinearGradient
                  key={summary.exercise_id}
                  colors={['#1a2a1a', '#111111']}
                  style={styles.exerciseSummaryCard}
                >
                  <View style={styles.exerciseSummaryHeader}>
                    <Ionicons name="barbell-outline" size={16} color={Colors.neonGreen} />
                    <EliteText variant="body" style={styles.exerciseSummaryName} numberOfLines={1}>
                      {summary.exercise_name}
                    </EliteText>
                    {summary.new_pr && (
                      <View style={styles.prBadge}>
                        <EliteText variant="caption" style={styles.prBadgeText}>
                          NUEVO PR!
                        </EliteText>
                      </View>
                    )}
                  </View>
                  <View style={styles.exerciseSummaryStats}>
                    <EliteText variant="caption" style={styles.exerciseStatText}>
                      {summary.sets} sets
                    </EliteText>
                    <EliteText variant="caption" style={styles.exerciseStatDot}>·</EliteText>
                    <EliteText variant="caption" style={styles.exerciseStatText}>
                      {summary.total_reps} reps
                    </EliteText>
                    {summary.max_weight !== null && (
                      <>
                        <EliteText variant="caption" style={styles.exerciseStatDot}>·</EliteText>
                        <EliteText variant="caption" style={styles.exerciseStatText}>
                          Max {summary.max_weight}kg
                        </EliteText>
                      </>
                    )}
                    {summary.total_volume !== null && (
                      <>
                        <EliteText variant="caption" style={styles.exerciseStatDot}>·</EliteText>
                        <EliteText variant="caption" style={styles.exerciseStatText}>
                          Vol {summary.total_volume.toLocaleString()}kg
                        </EliteText>
                      </>
                    )}
                  </View>
                  {summary.logs.map((log) => (
                    <View key={log.id} style={styles.setDetail}>
                      <EliteText variant="caption" style={styles.setDetailNumber}>
                        Set {log.set_number}:
                      </EliteText>
                      <EliteText variant="caption" style={styles.setDetailData}>
                        {log.reps} reps
                        {log.weight_kg ? ` × ${log.weight_kg}kg` : ' (BW)'}
                        {log.rpe ? ` @RPE${log.rpe}` : ''}
                      </EliteText>
                    </View>
                  ))}
                </LinearGradient>
              ))}
            </View>
          )}

          <View style={styles.completedButtons}>
            <EliteButton label="REPETIR" onPress={restart} />
            <EliteButton label="VOLVER AL INICIO" variant="outline" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // === PANTALLA DE EJECUCIÓN ===

  const heroGradient = getStepGradient(currentStep);

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Hero Bar ── */}
      <LinearGradient colors={heroGradient} style={styles.heroBar}>
        {/* Borde izquierdo */}
        <View style={[styles.heroBarAccent, { backgroundColor: stepColor }]} />

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.neonGreen} />
        </Pressable>

        <View style={styles.heroBarContent}>
          <EliteText variant="body" style={styles.heroBarName} numberOfLines={1}>
            {routine.name}
          </EliteText>
          <View style={styles.heroBarRight}>
            <EliteText variant="caption" style={styles.heroBarTime}>
              {formatTime(elapsedSeconds)} / {formatTime(elapsedSeconds + totalRemainingSeconds)}
            </EliteText>
            {/* Mini progress */}
            <View style={styles.miniProgressBar}>
              <View style={[styles.miniProgressFill, { width: `${totalProgress * 100}%`, backgroundColor: stepColor }]} />
            </View>
          </View>
        </View>

        {/* Context pills */}
        {currentStep && currentStep.context.rounds.length > 0 && (
          <View style={styles.contextPills}>
            {currentStep.context.rounds.map((r, i) => {
              const pillColor = LEVEL_COLORS[i % LEVEL_COLORS.length];
              return (
                <View key={i} style={[styles.contextPill, { backgroundColor: pillColor + '15', borderColor: pillColor + '30' }]}>
                  <EliteText variant="caption" style={[styles.contextPillText, { color: pillColor }]}>
                    {r.label} {r.current}/{r.total}
                  </EliteText>
                </View>
              );
            })}
          </View>
        )}
      </LinearGradient>

      {/* ── Step Info ── */}
      <View style={styles.stepInfo}>
        <View style={styles.stepTypeRow}>
          <View style={[styles.stepDot, { backgroundColor: stepColor }]} />
          <EliteText variant="label" style={[styles.stepTypeLabel, { color: stepColor }]}>
            {currentStep?.isRestBetween ? 'DESCANSO ENTRE RONDAS' : STEP_LABELS[currentStep?.type ?? 'work']}
          </EliteText>
        </View>
        {currentStep && !currentStep.isRestBetween && (
          <EliteText variant="subtitle" style={styles.stepName}>
            {currentStep.label}
          </EliteText>
        )}
        {currentStep && currentStep.exerciseName && currentStep.exerciseName !== currentStep.label && (
          <View style={styles.exerciseIndicator}>
            <Ionicons name="barbell-outline" size={12} color={Colors.neonGreen} />
            <EliteText variant="caption" style={styles.exerciseIndicatorText}>
              {currentStep.exerciseName}
            </EliteText>
          </View>
        )}
      </View>

      {/* ── Timer Circular ── */}
      <View style={[styles.timerWrapper, {
        shadowColor: isCountdown ? '#E24B4A' : stepColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      }]}>
        {/* Aura sutil detrás */}
        <View style={[styles.timerAura, { backgroundColor: (isCountdown ? '#E24B4A' : stepColor) + '08' }]} />
        <CircularTimer
          timeLeft={remainingSeconds}
          progress={1 - stepProgress}
          color={isCountdown ? '#E24B4A' : stepColor}
        />
      </View>

      {/* ── Stats Row — 3 mini cards ── */}
      <View style={styles.statsRow}>
        <LinearGradient colors={['#1a1a1a', '#111111']} style={styles.miniStatCard}>
          <EliteText variant="caption" style={styles.miniStatLabel}>PASO</EliteText>
          <EliteText variant="body" style={styles.miniStatValue}>
            {currentStepNumber}/{totalSteps}
          </EliteText>
          <View style={styles.miniStatProgress}>
            <View style={[styles.miniStatProgressFill, { width: `${(currentStepNumber / totalSteps) * 100}%` }]} />
          </View>
        </LinearGradient>

        <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.miniStatCard}>
          <EliteText variant="caption" style={styles.miniStatLabel}>TRABAJO</EliteText>
          <EliteText variant="body" style={[styles.miniStatValue, { color: STEP_COLORS.work }]}>
            {routineStats ? formatTimeHuman(routineStats.workSeconds) : '0s'}
          </EliteText>
        </LinearGradient>

        <LinearGradient colors={['#0a1a2a', '#111111']} style={styles.miniStatCard}>
          <EliteText variant="caption" style={styles.miniStatLabel}>DESCANSO</EliteText>
          <EliteText variant="body" style={[styles.miniStatValue, { color: STEP_COLORS.rest }]}>
            {routineStats ? formatTimeHuman(routineStats.restSeconds) : '0s'}
          </EliteText>
        </LinearGradient>
      </View>

      {/* ── Preview: Siguiente + Después ── */}
      <View style={styles.previewContainer}>
        <StepPreviewRow label="SIGUIENTE" step={nextStep} isLast={!nextStep && currentStep !== null} />
        {stepAfterNext && <StepPreviewRow label="DESPUÉS" step={stepAfterNext} />}
      </View>

      {/* ── Controles ── */}
      <LinearGradient colors={['transparent', '#0a0a0a']} style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <Pressable
            onPress={restartStep}
            style={({ pressed }) => [styles.controlSecondary, pressed && styles.controlPressed]}
            disabled={engineState === 'idle'}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={engineState === 'idle' ? Colors.disabled : Colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={engineState === 'running' ? pause : play}
            style={({ pressed }) => [styles.controlPrimary, pressed && styles.controlPressed, {
              shadowColor: Colors.neonGreen,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 15,
            }]}
          >
            <Ionicons
              name={engineState === 'running' ? 'pause' : 'play'}
              size={32}
              color={Colors.textOnGreen}
            />
          </Pressable>

          <Pressable
            onPress={skip}
            style={({ pressed }) => [styles.controlSecondary, pressed && styles.controlPressed]}
            disabled={engineState === 'idle'}
          >
            <Ionicons
              name="play-skip-forward"
              size={24}
              color={engineState === 'idle' ? Colors.disabled : Colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Barra de progreso total */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${totalProgress * 100}%`, backgroundColor: stepColor }]} />
        </View>
      </LinearGradient>

      {/* Modal de registro */}
      <SetLogModal
        visible={setLogVisible}
        exerciseName={pendingExercise?.exerciseName ?? ''}
        setNumber={pendingExercise?.setNumber ?? 1}
        onSave={handleSaveSet}
        onSkip={handleSkipSet}
      />
    </SafeAreaView>
  );
}

// === COMPONENTES AUXILIARES ===

function StepPreviewRow({
  label,
  step,
  isLast,
}: {
  label: string;
  step: ExecutionStep | null;
  isLast?: boolean;
}) {
  if (isLast) {
    return (
      <View style={styles.previewRow}>
        <EliteText variant="caption" style={styles.previewLabel}>{label}</EliteText>
        <View style={styles.previewContent}>
          <EliteText variant="caption" style={styles.previewLast}>Último paso</EliteText>
        </View>
      </View>
    );
  }

  if (!step) return null;

  const color = getStepColor(step);
  const displayLabel = step.isRestBetween ? 'Descanso entre rondas' : step.label;
  const previewGrad = getStepGradient(step);

  return (
    <LinearGradient colors={previewGrad} style={styles.previewCard}>
      <EliteText variant="caption" style={styles.previewLabel}>{label}</EliteText>
      <View style={styles.previewContent}>
        <View style={[styles.previewDot, { backgroundColor: color }]} />
        <EliteText
          variant="body"
          style={[styles.previewName, step.isRestBetween && { color: REST_BETWEEN_COLOR }]}
          numberOfLines={1}
        >
          {displayLabel}
        </EliteText>
        <EliteText variant="caption" style={styles.previewTime}>
          {formatTime(step.durationSeconds)}
        </EliteText>
      </View>
    </LinearGradient>
  );
}

const LEVEL_COLORS = ['#9B59B6', '#a8e02a', '#EF9F27', '#5B9BD5', '#E24B4A', '#1ABC9C'];

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },

  // ── Hero Bar ──
  heroBar: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  heroBarAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  heroBarContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBarName: {
    fontFamily: Fonts.bold,
    color: Colors.neonGreen,
    fontSize: 15,
    flex: 1,
  },
  heroBarRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  heroBarTime: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontSize: 12,
  },
  miniProgressBar: {
    width: 60,
    height: 2,
    backgroundColor: '#2a2a2a',
    borderRadius: 1,
    marginTop: 3,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 1,
  },
  contextPills: {
    flexDirection: 'row',
    gap: Spacing.xs,
    width: '100%',
    paddingLeft: Spacing.xl,
    marginTop: Spacing.xs,
  },
  contextPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  contextPillText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },

  // ── Step Info ──
  stepInfo: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  stepTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepTypeLabel: {
    letterSpacing: 2,
    fontSize: 12,
  },
  stepName: {
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },

  // ── Timer ──
  timerWrapper: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  timerAura: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -20,
    left: -20,
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  miniStatCard: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  miniStatLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  miniStatValue: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  miniStatProgress: {
    width: '100%',
    height: 2,
    backgroundColor: '#2a2a2a',
    borderRadius: 1,
    marginTop: 4,
  },
  miniStatProgressFill: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: 1,
  },

  // ── Preview ──
  previewContainer: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  previewLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    width: 75,
    fontSize: 10,
  },
  previewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  previewTime: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  previewLast: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  // ── Controles ──
  controlsContainer: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    marginTop: 'auto',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  controlPrimary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPressed: {
    opacity: 0.6,
  },

  // ── Progreso ──
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ── Ejercicio en ejecución ──
  exerciseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  exerciseIndicatorText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },

  // ── Pantalla completada ──
  completedScroll: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  completedTitle: {
    color: Colors.neonGreen,
    fontSize: FontSizes.xl,
    marginBottom: Spacing.xs,
  },
  completedRoutine: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
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
  statRatio: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statSkipped: {
    color: '#E24B4A',
    marginTop: 2,
  },
  completedButtons: {
    gap: Spacing.sm,
    alignItems: 'center',
  },

  // ── Resumen de ejercicios ──
  exerciseSummarySection: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  exerciseSummaryTitle: {
    color: Colors.neonGreen,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  exerciseSummaryCard: {
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
    marginBottom: Spacing.xs,
  },
  exerciseSummaryName: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },
  prBadge: {
    backgroundColor: Colors.neonGreen + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  prBadgeText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  exerciseSummaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  exerciseStatText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  exerciseStatDot: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  setDetail: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingLeft: Spacing.md + Spacing.xs,
    paddingVertical: 1,
  },
  setDetailNumber: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    width: 45,
  },
  setDetailData: {
    color: Colors.textPrimary,
    fontSize: 10,
  },
});
