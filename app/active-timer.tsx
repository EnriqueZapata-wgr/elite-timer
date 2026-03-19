import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularTimer } from '@/components/circular-timer';
import { Controls } from '@/components/controls';
import { BlockIndicator } from '@/components/block-indicator';
import { NextBlockPreview } from '@/components/next-block-preview';
import { EliteText } from '@/components/elite-text';
import { useBlockTimer } from '@/hooks/use-block-timer';
import { useSessions } from '@/contexts/sessions-context';
import { generateId, type Routine, type Session } from '@/types/models';
import { Colors, BlockColors, BlockTypeLabels, FontSizes, Fonts, Spacing } from '@/constants/theme';

/**
 * Pantalla Timer Activo — Timer multi-bloque con progreso visual.
 *
 * Recibe una rutina via params (JSON) y ejecuta bloque por bloque:
 * - Círculo animado con color según tipo de bloque
 * - Indicador de bloques (dots)
 * - Preview del siguiente bloque
 * - Controles: Start/Pause/Skip/Reset
 * - Al terminar → Resumen de Sesión
 */
export default function ActiveTimerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routine: string; programName?: string }>();
  const { addSession } = useSessions();

  // Parsear la rutina desde los params
  const routine: Routine = params.routine
    ? JSON.parse(params.routine)
    : { id: 'empty', name: 'Sin rutina', blocks: [], totalDuration: 0, rounds: 1 };

  const programName = params.programName ?? 'Programa';

  const {
    status,
    currentBlockIndex,
    currentBlock,
    nextBlock,
    timeLeftInBlock,
    blockProgress,
    currentRound,
    totalRounds,
    completedBlocks,
    elapsedTotal,
    start,
    pause,
    reset,
    skipBlock,
  } = useBlockTimer(routine);

  // Color del anillo según tipo de bloque actual
  const ringColor = currentBlock ? BlockColors[currentBlock.type] : Colors.neonGreen;
  const blockLabel = currentBlock ? BlockTypeLabels[currentBlock.type] : '';

  // Cuando el timer termina, guardar sesión y navegar al resumen
  if (status === 'finished' && completedBlocks.length > 0) {
    const session: Session = {
      id: generateId(),
      programName,
      routineName: routine.name,
      completedBlocks,
      totalPlannedTime: routine.totalDuration,
      totalActualTime: elapsedTotal,
      completedAt: Date.now(),
      roundsCompleted: totalRounds,
    };

    // Guardar sesión y navegar
    setTimeout(() => {
      addSession(session);
      router.replace({
        pathname: '/session-summary',
        params: { session: JSON.stringify(session) },
      });
    }, 500);
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

      {/* Ronda actual */}
      {totalRounds > 1 && (
        <EliteText variant="label" style={styles.roundLabel}>
          RONDA {currentRound} / {totalRounds}
        </EliteText>
      )}

      {/* Tipo de bloque actual */}
      <EliteText variant="subtitle" style={[styles.blockType, { color: ringColor }]}>
        {blockLabel}
      </EliteText>

      {/* Indicador de bloques (dots) */}
      <View style={styles.indicatorRow}>
        <BlockIndicator blocks={routine.blocks} currentIndex={currentBlockIndex} />
      </View>

      {/* Círculo del timer */}
      <View style={styles.timerWrapper}>
        <CircularTimer
          timeLeft={timeLeftInBlock}
          progress={blockProgress}
          color={ringColor}
        />
      </View>

      {/* Preview del siguiente bloque */}
      <NextBlockPreview block={nextBlock} />

      {/* Controles */}
      <Controls
        status={status}
        onStart={start}
        onPause={pause}
        onReset={reset}
        onSkip={skipBlock}
      />
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
  roundLabel: {
    marginTop: Spacing.xs,
    letterSpacing: 3,
    color: Colors.textSecondary,
  },
  blockType: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.lg,
    letterSpacing: 2,
  },
  indicatorRow: {
    marginTop: Spacing.md,
  },
  timerWrapper: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
});
