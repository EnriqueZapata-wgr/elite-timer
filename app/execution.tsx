import { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';

import { CircularTimer } from '@/components/circular-timer';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { useRoutineEngine } from '@/hooks/use-routine-engine';
import { formatTime, formatTimeHuman } from '@/src/engine/helpers';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { TABATA_ROUTINE, GUINNESS_ROUTINE } from '@/src/engine/testData';
import { Colors, Fonts, Spacing, FontSizes, Radius, BlockColors } from '@/constants/theme';
import { SEMANTIC, SURFACES, TEXT_COLORS, ATP_BRAND, BLOCK_COLORS, CATEGORY_COLORS, withOpacity } from '@/src/constants/brand';
import type { Routine as EngineRoutine, ExecutionStep } from '@/src/engine/types';

// === COLORES POR TIPO DE STEP ===

const STEP_COLORS: Record<string, string> = {
  work: BLOCK_COLORS.exercise,
  rest: BLOCK_COLORS.rest,
  prep: BLOCK_COLORS.transition,
};

const REST_BETWEEN_COLOR = TEXT_COLORS.secondary;

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
  if (!step || step.isRestBetween) return [Colors.surfaceLight, Colors.surface];
  switch (step.type) {
    case 'work': return [withOpacity(CATEGORY_COLORS.fitness, 0.04), withOpacity(CATEGORY_COLORS.fitness, 0.02)];
    case 'rest': return [withOpacity(CATEGORY_COLORS.nutrition, 0.04), withOpacity(CATEGORY_COLORS.nutrition, 0.02)];
    case 'prep': return [withOpacity(CATEGORY_COLORS.optimization, 0.04), withOpacity(CATEGORY_COLORS.optimization, 0.02)];
    default: return [Colors.surfaceLight, Colors.surface];
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

  const stepColor = getStepColor(currentStep);
  const isCountdown = remainingSeconds <= 3 && remainingSeconds > 0 && engineState === 'running';

  // Guardar sesión de timer al completar
  const savedRef = useRef(false);
  useEffect(() => {
    if (engineState !== 'completed' || !stats || !routine || savedRef.current) return;
    savedRef.current = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('mind_sessions').insert({
        user_id: user.id,
        type: 'breathing', // Reusar tipo genérico para timers
        template_name: routine.name || 'Timer',
        duration_seconds: stats.actualDurationSeconds,
        date: getLocalToday(),
        notes: `${stats.stepsCompleted} steps, ${stats.workSeconds}s trabajo`,
      });
    });
  }, [engineState]);

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
            <LinearGradient colors={[withOpacity(CATEGORY_COLORS.fitness, 0.04), SURFACES.card]} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>TIEMPO TOTAL</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {formatTime(stats.actualDurationSeconds)}
              </EliteText>
            </LinearGradient>
            <LinearGradient colors={[withOpacity(CATEGORY_COLORS.fitness, 0.04), SURFACES.card]} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>TRABAJO</EliteText>
              <EliteText variant="subtitle" style={[styles.statValue, { color: STEP_COLORS.work }]}>
                {formatTimeHuman(stats.workSeconds)}
              </EliteText>
              <EliteText variant="caption" style={styles.statRatio}>{workRatio}%</EliteText>
            </LinearGradient>
            <LinearGradient colors={[withOpacity(CATEGORY_COLORS.nutrition, 0.04), SURFACES.card]} style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>DESCANSO</EliteText>
              <EliteText variant="subtitle" style={[styles.statValue, { color: STEP_COLORS.rest }]}>
                {formatTimeHuman(stats.restSeconds)}
              </EliteText>
              <EliteText variant="caption" style={styles.statRatio}>{restRatio}%</EliteText>
            </LinearGradient>
            <LinearGradient colors={[SURFACES.cardLight, SURFACES.card]} style={styles.statCard}>
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
        shadowColor: isCountdown ? SEMANTIC.error : stepColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      }]}>
        {/* Aura sutil detrás */}
        <View style={[styles.timerAura, { backgroundColor: (isCountdown ? SEMANTIC.error : stepColor) + '08' }]} />
        <CircularTimer
          timeLeft={remainingSeconds}
          progress={1 - stepProgress}
          color={isCountdown ? SEMANTIC.error : stepColor}
        />
      </View>

      {/* ── Stats Row — 3 mini cards ── */}
      <View style={styles.statsRow}>
        <LinearGradient colors={[SURFACES.cardLight, SURFACES.card]} style={styles.miniStatCard}>
          <EliteText variant="caption" style={styles.miniStatLabel}>PASO</EliteText>
          <EliteText variant="body" style={styles.miniStatValue}>
            {currentStepNumber}/{totalSteps}
          </EliteText>
          <View style={styles.miniStatProgress}>
            <View style={[styles.miniStatProgressFill, { width: `${(currentStepNumber / totalSteps) * 100}%` }]} />
          </View>
        </LinearGradient>

        <LinearGradient colors={[withOpacity(CATEGORY_COLORS.fitness, 0.04), SURFACES.card]} style={styles.miniStatCard}>
          <EliteText variant="caption" style={styles.miniStatLabel}>TRABAJO</EliteText>
          <EliteText variant="body" style={[styles.miniStatValue, { color: STEP_COLORS.work }]}>
            {routineStats ? formatTimeHuman(routineStats.workSeconds) : '0s'}
          </EliteText>
        </LinearGradient>

        <LinearGradient colors={[withOpacity(CATEGORY_COLORS.nutrition, 0.04), SURFACES.card]} style={styles.miniStatCard}>
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
      <LinearGradient colors={['transparent', SURFACES.base]} style={styles.controlsContainer}>
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

const LEVEL_COLORS = [CATEGORY_COLORS.mind, BLOCK_COLORS.exercise, BLOCK_COLORS.transition, BLOCK_COLORS.rest, SEMANTIC.error, ATP_BRAND.teal2];

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
    fontSize: FontSizes.lg,
    flex: 1,
  },
  heroBarRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  heroBarTime: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontSize: FontSizes.sm,
  },
  miniProgressBar: {
    width: 60,
    height: 2,
    backgroundColor: Colors.border,
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
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.sm,
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
    borderColor: Colors.border,
  },
  miniStatLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    marginBottom: 2,
  },
  miniStatValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  miniStatProgress: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.border,
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
    borderColor: Colors.border,
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
    fontSize: FontSizes.xs,
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
    borderRadius: Radius.xs,
  },
  previewName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
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
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceLight,
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
    backgroundColor: Colors.surfaceLight,
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
    fontSize: FontSizes.sm,
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
    borderColor: Colors.border,
  },
  statLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    fontSize: FontSizes.xs,
  },
  statValue: {
    color: Colors.neonGreen,
    fontSize: FontSizes.xxl,
  },
  statRatio: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statSkipped: {
    color: SEMANTIC.error,
    marginTop: 2,
  },
  completedButtons: {
    gap: Spacing.sm,
    alignItems: 'center',
  },

});
