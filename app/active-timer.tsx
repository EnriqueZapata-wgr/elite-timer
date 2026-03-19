import { useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularTimer } from '@/components/circular-timer';
import { Controls } from '@/components/controls';
import { BlockIndicator } from '@/components/block-indicator';
import { NextBlockPreview } from '@/components/next-block-preview';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { useBlockTimer } from '@/hooks/use-block-timer';
import { usePrograms } from '@/contexts/programs-context';
import { useSessions } from '@/contexts/sessions-context';
import { STANDARD_ROUTINES } from '@/constants/standard-programs';
import { generateId, type Routine, type Session } from '@/types/models';
import { Colors, BlockColors, BlockTypeLabels, FontSizes, Spacing } from '@/constants/theme';

/** Rutina fallback cuando no se puede resolver */
const FALLBACK_ROUTINE: Routine = {
  id: 'empty', name: 'Sin rutina', blocks: [], totalDuration: 0, rounds: 1,
};

/**
 * Pantalla Timer Activo — Timer multi-bloque con progreso visual.
 *
 * Recibe rutina por ID (routineId) o por JSON (routine).
 * Busca primero en el context del usuario, luego en programas estándar.
 */
export default function ActiveTimerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    routineId?: string;
    routine?: string;
    programName?: string;
  }>();
  const { getRoutineById } = usePrograms();
  const { addSession } = useSessions();

  // Resolver la rutina: por ID (preferido) o por JSON (legacy/estándar)
  const routine = resolveRoutine(params.routineId, params.routine, getRoutineById);
  const programName = params.programName ?? 'Programa';

  // Ref para evitar doble-navegación al terminar
  const navigatedRef = useRef(false);

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
  if (status === 'finished' && completedBlocks.length > 0 && !navigatedRef.current) {
    navigatedRef.current = true;

    const session: Session = {
      id: generateId(),
      routineId: routine.id,
      routineSnapshot: routine,
      programName,
      completedBlocks,
      totalPlannedTime: routine.totalDuration,
      totalActualTime: elapsedTotal,
      completedAt: Date.now(),
      roundsCompleted: totalRounds,
    };

    setTimeout(() => {
      addSession(session);
      router.replace({
        pathname: '/session-summary',
        params: { session: JSON.stringify(session) },
      });
    }, 500);
  }

  // Sin bloques — mostrar error
  if (routine.blocks.length === 0) {
    return (
      <SafeAreaView style={[styles.screen, { justifyContent: 'center' }]}>
        <EliteText variant="title">SIN BLOQUES</EliteText>
        <EliteText variant="body" style={{ color: Colors.textSecondary, marginTop: 8 }}>
          Esta rutina no tiene bloques configurados.
        </EliteText>
        <EliteButton label="VOLVER" onPress={() => router.back()} style={{ marginTop: 24 }} />
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

/**
 * Resuelve la rutina desde los params de navegación.
 * Prioridad: routineId (context → estándar) > routine JSON > fallback
 */
function resolveRoutine(
  routineId: string | undefined,
  routineJson: string | undefined,
  getRoutineById: (id: string) => Routine | undefined,
): Routine {
  // 1. Buscar por ID en el context del usuario
  if (routineId) {
    const fromContext = getRoutineById(routineId);
    if (fromContext) return fromContext;

    // 2. Buscar en rutinas estándar
    const fromStandard = STANDARD_ROUTINES[routineId];
    if (fromStandard) return fromStandard;
  }

  // 3. Parsear JSON (legacy o params directos)
  if (routineJson) {
    try {
      return JSON.parse(routineJson) as Routine;
    } catch {
      // JSON malformado — usar fallback
    }
  }

  return FALLBACK_ROUTINE;
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
