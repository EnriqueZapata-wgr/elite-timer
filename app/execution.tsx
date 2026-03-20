import { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularTimer } from '@/components/circular-timer';
import { Controls } from '@/components/controls';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { useRoutineEngine } from '@/hooks/use-routine-engine';
import { formatTime, formatTimeHuman } from '@/src/engine/helpers';
import { TABATA_ROUTINE, GUINNESS_ROUTINE } from '@/src/engine/testData';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Routine as EngineRoutine } from '@/src/engine/types';

/** Colores por tipo de step */
const STEP_COLORS: Record<string, string> = {
  work: '#a8e02a',
  rest: '#4a90d9',
  prep: '#f5a623',
};

/** Labels por tipo de step */
const STEP_LABELS: Record<string, string> = {
  work: 'TRABAJO',
  rest: 'DESCANSO',
  prep: 'PREPARACIÓN',
};

/**
 * Pantalla de Ejecución — Conecta el RoutineEngine con UI.
 *
 * Acepta params:
 *   testId: 'tabata' | 'guinness' (datos de prueba)
 *   routine: JSON string de EngineRoutine
 */
export default function ExecutionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ testId?: string; routine?: string }>();

  // Resolver rutina desde params
  const routine = useMemo((): EngineRoutine | null => {
    if (params.testId === 'tabata') return TABATA_ROUTINE;
    if (params.testId === 'guinness') return GUINNESS_ROUTINE;
    if (params.routine) {
      try { return JSON.parse(params.routine); } catch { return null; }
    }
    return null;
  }, [params.testId, params.routine]);

  // Pantalla de error si no hay rutina
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

/** Componente interno — solo se monta cuando routine es válida */
function ExecutionContent({ routine }: { routine: EngineRoutine }) {
  const router = useRouter();

  const {
    engineState,
    currentStep,
    nextStep,
    remainingSeconds,
    stepProgress,
    totalProgress,
    currentStepNumber,
    totalSteps,
    stats,
    routineStats,
    play,
    pause,
    skip,
    restart,
  } = useRoutineEngine(routine);

  // Color del anillo según tipo de step actual
  const stepColor = currentStep ? (STEP_COLORS[currentStep.type] ?? Colors.neonGreen) : Colors.neonGreen;
  const stepLabel = currentStep ? (STEP_LABELS[currentStep.type] ?? currentStep.type) : '';

  // Info de rondas del contexto
  const roundsInfo = currentStep?.context.rounds ?? [];
  const roundsText = roundsInfo.map(r => `${r.label} ${r.current}/${r.total}`).join(' · ');

  // Mapear engine state → Controls status
  const controlsStatus = engineState === 'completed' ? 'finished' as const : engineState;

  // Pantalla de completado
  if (engineState === 'completed' && stats) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <EliteText variant="title" style={styles.completedCheck}>✓</EliteText>
        <EliteText variant="title">COMPLETADA</EliteText>
        <EliteText variant="body" style={styles.completedRoutine}>
          {routine.name}
        </EliteText>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <EliteText variant="caption" style={styles.statLabel}>TIEMPO</EliteText>
            <EliteText variant="subtitle" style={styles.statValue}>
              {formatTime(stats.totalDurationSeconds)}
            </EliteText>
          </View>
          <View style={styles.statCard}>
            <EliteText variant="caption" style={styles.statLabel}>TRABAJO</EliteText>
            <EliteText variant="subtitle" style={styles.statValue}>
              {formatTimeHuman(stats.workSeconds)}
            </EliteText>
          </View>
          <View style={styles.statCard}>
            <EliteText variant="caption" style={styles.statLabel}>STEPS</EliteText>
            <EliteText variant="subtitle" style={styles.statValue}>
              {stats.stepsCompleted}
            </EliteText>
          </View>
        </View>

        <View style={styles.completedButtons}>
          <EliteButton label="REPETIR" onPress={restart} />
          <EliteButton label="VOLVER" variant="outline" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

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

      {/* Info de duración total */}
      <EliteText variant="caption" style={styles.totalInfo}>
        {formatTimeHuman(routineStats.totalSeconds)} · {totalSteps} steps
      </EliteText>

      {/* Info de rondas */}
      {roundsText.length > 0 && (
        <EliteText variant="label" style={styles.roundsText}>
          {roundsText}
        </EliteText>
      )}

      {/* Label del tipo de step actual */}
      <EliteText variant="subtitle" style={[styles.stepType, { color: stepColor }]}>
        {currentStep?.isRestBetween ? 'DESCANSO ENTRE RONDAS' : stepLabel}
      </EliteText>

      {/* Label del step */}
      {currentStep && !currentStep.isRestBetween && (
        <EliteText variant="body" style={styles.stepLabel}>
          {currentStep.label}
        </EliteText>
      )}

      {/* Circular Timer — progress va de 1→0 */}
      <View style={styles.timerWrapper}>
        <CircularTimer
          timeLeft={remainingSeconds}
          progress={1 - stepProgress}
          color={stepColor}
        />
      </View>

      {/* Preview del siguiente step */}
      {nextStep && (
        <View style={styles.nextPreview}>
          <EliteText variant="caption" style={styles.nextLabel}>SIGUIENTE</EliteText>
          <EliteText variant="body" style={[styles.nextName, { color: STEP_COLORS[nextStep.type] ?? Colors.textPrimary }]}>
            {nextStep.isRestBetween ? 'Descanso' : nextStep.label}
            {' · '}{formatTime(nextStep.durationSeconds)}
          </EliteText>
        </View>
      )}

      {/* Controles */}
      <Controls
        status={controlsStatus}
        onStart={play}
        onPause={pause}
        onReset={restart}
        onSkip={skip}
      />

      {/* Contador de steps + barra de progreso */}
      <View style={styles.progressRow}>
        <EliteText variant="caption" style={styles.stepCounter}>
          Step {currentStepNumber} de {totalSteps}
        </EliteText>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${totalProgress * 100}%` }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

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
  routineName: {
    marginTop: Spacing.xxl,
    fontSize: FontSizes.lg,
    letterSpacing: 4,
  },
  totalInfo: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  roundsText: {
    marginTop: Spacing.sm,
    letterSpacing: 2,
    color: Colors.textSecondary,
  },
  stepType: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.lg,
    letterSpacing: 2,
  },
  stepLabel: {
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  timerWrapper: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  // Next step preview
  nextPreview: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  nextLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  nextName: {
    fontVariant: ['tabular-nums'],
  },
  // Progreso
  progressRow: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  stepCounter: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: 2,
  },
  // Pantalla completada
  completedCheck: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  completedRoutine: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  statLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  statValue: {
    color: Colors.neonGreen,
    fontSize: 20,
  },
  completedButtons: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
});
