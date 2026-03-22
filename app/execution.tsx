import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
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

/** Color del anillo según tipo y si es rest_between */
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

  // Mantener pantalla encendida mientras el timer está activo
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

  // Tracking de sets por ejercicio durante la ejecución
  const [setLogVisible, setSetLogVisible] = useState(false);
  const [pendingExercise, setPendingExercise] = useState<{
    exerciseId: string;
    exerciseName: string;
    blockId: string;
    setNumber: number;
  } | null>(null);
  // Contador de sets por exercise_id (acumulativo en la misma ejecución)
  const setCounters = useRef<Map<string, number>>(new Map());
  // Logs registrados durante esta ejecución
  const [sessionLogs, setSessionLogs] = useState<ExerciseLog[]>([]);
  // Step anterior para detectar transiciones
  const prevStepRef = useRef<ExecutionStep | null>(null);
  // Flag para evitar doble-trigger
  const logShownForStep = useRef<number>(-1);

  // Helper para mostrar el modal de log para un step que acaba de terminar
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

  // Detectar cuando un step de work con ejercicio termina (transición a otro step)
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

  // Detectar cuando la rutina completa y el último step tenía ejercicio
  useEffect(() => {
    if (engineState === 'completed') {
      const prev = prevStepRef.current;
      if (prev && prev.exerciseId && prev.type === 'work') {
        showLogForStep(prev);
      }
    }
  }, [engineState, showLogForStep]);

  // Guardar un set
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

      // Agregar al log local de la sesión
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
    // Continuar con el siguiente step
    play();
  }, [pendingExercise, play]);

  // Saltar registro de set
  const handleSkipSet = useCallback(() => {
    setSetLogVisible(false);
    setPendingExercise(null);
    play();
  }, [play]);

  // Generar resumen de ejercicios para la pantalla completada
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
        new_pr: false, // Se detectará por el trigger de la DB
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

          {/* Stats grid — 2 filas × 2 columnas */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>TIEMPO TOTAL</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {formatTime(stats.actualDurationSeconds)}
              </EliteText>
            </View>
            <View style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>TRABAJO</EliteText>
              <EliteText variant="subtitle" style={[styles.statValue, { color: STEP_COLORS.work }]}>
                {formatTimeHuman(stats.workSeconds)}
              </EliteText>
              <EliteText variant="caption" style={styles.statRatio}>{workRatio}%</EliteText>
            </View>
            <View style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>DESCANSO</EliteText>
              <EliteText variant="subtitle" style={[styles.statValue, { color: STEP_COLORS.rest }]}>
                {formatTimeHuman(stats.restSeconds)}
              </EliteText>
              <EliteText variant="caption" style={styles.statRatio}>{restRatio}%</EliteText>
            </View>
            <View style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>STEPS</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {stats.stepsCompleted}
              </EliteText>
              {stats.stepsSkipped > 0 && (
                <EliteText variant="caption" style={styles.statSkipped}>
                  {stats.stepsSkipped} saltados
                </EliteText>
              )}
            </View>
          </View>

          {/* Resumen de ejercicios registrados */}
          {exerciseSummaries.length > 0 && (
            <View style={styles.exerciseSummarySection}>
              <EliteText variant="label" style={styles.exerciseSummaryTitle}>
                EJERCICIOS REGISTRADOS
              </EliteText>
              {exerciseSummaries.map((summary) => (
                <View key={summary.exercise_id} style={styles.exerciseSummaryCard}>
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
                  {/* Detalle set por set */}
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
                </View>
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

  return (
    <SafeAreaView style={styles.screen}>
      {/* Botón regreso */}
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
      </Pressable>

      {/* Nombre de la rutina */}
      <EliteText variant="title" style={styles.routineName}>
        {routine.name}
      </EliteText>

      {/* Tiempo transcurrido · restante */}
      <EliteText variant="caption" style={styles.timeInfo}>
        Transcurrido {formatTime(elapsedSeconds)} · Restante {formatTime(totalRemainingSeconds)}
      </EliteText>

      {/* Contexto de rondas — pills por nivel */}
      {currentStep && currentStep.context.rounds.length > 0 && (
        <RoundsPills rounds={currentStep.context.rounds} />
      )}

      {/* Tipo de step + label prominente */}
      <View style={styles.stepInfo}>
        {/* Dot de color + tipo */}
        <View style={styles.stepTypeRow}>
          <View style={[styles.stepDot, { backgroundColor: stepColor }]} />
          <EliteText variant="label" style={[styles.stepTypeLabel, { color: stepColor }]}>
            {currentStep?.isRestBetween ? 'DESCANSO ENTRE RONDAS' : STEP_LABELS[currentStep?.type ?? 'work']}
          </EliteText>
        </View>
        {/* Label del step — prominente */}
        {currentStep && !currentStep.isRestBetween && (
          <EliteText variant="subtitle" style={styles.stepName}>
            {currentStep.label}
          </EliteText>
        )}
        {/* Nombre del ejercicio si está asignado y es diferente del label */}
        {currentStep && currentStep.exerciseName && currentStep.exerciseName !== currentStep.label && (
          <View style={styles.exerciseIndicator}>
            <Ionicons name="barbell-outline" size={12} color={Colors.neonGreen} />
            <EliteText variant="caption" style={styles.exerciseIndicatorText}>
              {currentStep.exerciseName}
            </EliteText>
          </View>
        )}
      </View>

      {/* Circular Timer — se vacía conforme pasa el tiempo */}
      <View style={[styles.timerWrapper, {
        shadowColor: isCountdown ? '#E24B4A' : stepColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      }]}>
        <CircularTimer
          timeLeft={remainingSeconds}
          progress={1 - stepProgress}
          color={isCountdown ? '#E24B4A' : stepColor}
        />
      </View>

      {/* Preview: Siguiente + Después */}
      <View style={styles.previewContainer}>
        <StepPreviewRow label="SIGUIENTE" step={nextStep} isLast={!nextStep && currentStep !== null} />
        {stepAfterNext && <StepPreviewRow label="DESPUÉS" step={stepAfterNext} />}
      </View>

      {/* Controles horizontales: ↺  ▶/⏸  ⏭ */}
      <View style={styles.controlsRow}>
        {/* Reiniciar step */}
        <Pressable
          onPress={restartStep}
          style={({ pressed }) => [styles.controlSecondary, pressed && styles.controlPressed]}
          disabled={engineState === 'idle'}
        >
          <Ionicons
            name="refresh"
            size={24}
            color={engineState === 'idle' ? Colors.disabled : Colors.neonGreen}
          />
        </Pressable>

        {/* Play / Pausa — botón principal */}
        <Pressable
          onPress={engineState === 'running' ? pause : play}
          style={({ pressed }) => [styles.controlPrimary, pressed && styles.controlPressed]}
        >
          <Ionicons
            name={engineState === 'running' ? 'pause' : 'play'}
            size={32}
            color={Colors.textOnGreen}
          />
        </Pressable>

        {/* Skip */}
        <Pressable
          onPress={skip}
          style={({ pressed }) => [styles.controlSecondary, pressed && styles.controlPressed]}
          disabled={engineState === 'idle'}
        >
          <Ionicons
            name="play-skip-forward"
            size={24}
            color={engineState === 'idle' ? Colors.disabled : Colors.neonGreen}
          />
        </Pressable>
      </View>

      {/* Barra de progreso total */}
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${totalProgress * 100}%` }]} />
        </View>
      </View>

      {/* Modal de registro de set */}
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

/** Fila de preview: Siguiente / Después */
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

  return (
    <View style={styles.previewRow}>
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
    </View>
  );
}

/** Colores por profundidad de nivel (del más externo al más interno) */
const LEVEL_COLORS = ['#9B59B6', '#a8e02a', '#EF9F27', '#5B9BD5', '#E24B4A', '#1ABC9C'];

/** Pills apilados con el contexto de rondas */
function RoundsPills({ rounds }: { rounds: ExecutionStep['context']['rounds'] }) {
  // Si solo 1 nivel → fila horizontal. Si >1 → cada uno en su línea.
  const isMulti = rounds.length > 1;

  return (
    <View style={[styles.roundsPills, isMulti && styles.roundsPillsColumn]}>
      {rounds.map((r, i) => {
        const color = LEVEL_COLORS[i % LEVEL_COLORS.length];
        return (
          <View key={i} style={styles.roundPill}>
            <View style={[styles.roundPillDot, { backgroundColor: color }]} />
            <EliteText variant="caption" style={styles.roundPillLabel} numberOfLines={1}>
              {r.label}
            </EliteText>
            <EliteText variant="caption" style={[styles.roundPillCount, { color }]}>
              {r.current} de {r.total}
            </EliteText>
          </View>
        );
      })}
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  centered: {
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.xxl,
    left: Spacing.md,
    zIndex: 10,
    padding: Spacing.sm,
  },

  // --- Zona superior ---
  routineName: {
    marginTop: Spacing.xxl,
    fontSize: FontSizes.lg,
    letterSpacing: 4,
  },
  timeInfo: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  roundsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  roundsPillsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  roundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  roundPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roundPillLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    maxWidth: 120,
  },
  roundPillCount: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'] as const,
  },

  // --- Step info ---
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
    fontSize: 13,
  },
  stepName: {
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },

  // --- Timer ---
  timerWrapper: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  // --- Preview siguiente/después ---
  previewContainer: {
    width: '100%',
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
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

  // --- Controles horizontales ---
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
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

  // --- Progreso ---
  progressRow: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: 2,
  },

  // --- Indicador de ejercicio en ejecución ---
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

  // --- Pantalla completada ---
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
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
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

  // --- Resumen de ejercicios ---
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
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
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
