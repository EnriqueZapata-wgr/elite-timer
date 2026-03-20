import { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { CircularTimer } from '@/components/circular-timer';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { useRoutineEngine } from '@/hooks/use-routine-engine';
import { formatTime, formatTimeHuman } from '@/src/engine/helpers';
import { TABATA_ROUTINE, GUINNESS_ROUTINE } from '@/src/engine/testData';
import { Colors, Fonts, Spacing, FontSizes, Radius } from '@/constants/theme';
import type { Routine as EngineRoutine, ExecutionStep } from '@/src/engine/types';

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
      try { return JSON.parse(params.routine); } catch { return null; }
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

        <View style={styles.completedButtons}>
          <EliteButton label="REPETIR" onPress={restart} />
          <EliteButton label="VOLVER AL INICIO" variant="outline" onPress={() => router.back()} />
        </View>
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
      </View>

      {/* Circular Timer — se vacía conforme pasa el tiempo */}
      <View style={styles.timerWrapper}>
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
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
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
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: 2,
  },

  // --- Pantalla completada ---
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
});
