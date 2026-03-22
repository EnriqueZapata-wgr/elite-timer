/**
 * Pantalla Modo Rutina — Ejecución de rutinas de fuerza/hipertrofia.
 *
 * El usuario controla el ritmo: countup en trabajo, semáforo en descanso,
 * registro de reps/peso integrado en cada set.
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { useRoutineMode } from '@/src/hooks/useRoutineMode';
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
  const prevWeightRef = useRef<number | null>(null);

  // Al completar set, pre-llenar con valores anteriores
  const handleCompleteSet = useCallback(async () => {
    await rm.completeSet(reps, weight, rpe);
    prevWeightRef.current = weight;
    // No resetear reps/weight — el usuario puede mantener los mismos valores
  }, [rm, reps, weight, rpe]);

  // Al cambiar de ejercicio, resetear inputs
  const handleStartWorking = useCallback(() => {
    setReps(10);
    setWeight(prevWeightRef.current);
    setRpe(null);
    rm.startWorking();
  }, [rm]);

  // === IDLE ===
  if (rm.phase === 'idle') {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <Ionicons name="barbell-outline" size={64} color={Colors.neonGreen} />
        <EliteText variant="title" style={styles.routineName}>{routine.name}</EliteText>
        <EliteText variant="body" style={styles.subtitle}>
          {rm.exercises.length} ejercicios
        </EliteText>

        {/* Lista de ejercicios */}
        <View style={styles.exercisePreviewList}>
          {rm.exercises.map((ex, i) => (
            <View key={ex.blockId} style={styles.exercisePreviewRow}>
              <EliteText variant="caption" style={styles.exercisePreviewNum}>{i + 1}</EliteText>
              <EliteText variant="body" style={styles.exercisePreviewName} numberOfLines={1}>
                {ex.exerciseName}
              </EliteText>
              <EliteText variant="caption" style={styles.exercisePreviewSets}>
                {ex.suggestedSets} sets
              </EliteText>
            </View>
          ))}
        </View>

        <EliteButton label="EMPEZAR" onPress={rm.start} style={{ marginTop: 24 }} />
        <EliteButton label="VOLVER" variant="outline" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </SafeAreaView>
    );
  }

  // === COMPLETADA ===
  if (rm.phase === 'completed' && rm.stats) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.completedScroll}>
          <EliteText variant="title" style={{ color: Colors.neonGreen }}>
            RUTINA COMPLETADA
          </EliteText>
          <EliteText variant="body" style={styles.subtitle}>{routine.name}</EliteText>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>TIEMPO</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {formatTime(rm.stats.totalDurationSeconds)}
              </EliteText>
            </View>
            <View style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>EJERCICIOS</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {rm.stats.exercisesCompleted}
              </EliteText>
            </View>
            <View style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>SETS</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {rm.stats.totalSets}
              </EliteText>
            </View>
            <View style={styles.statCard}>
              <EliteText variant="caption" style={styles.statLabel}>REPS TOTALES</EliteText>
              <EliteText variant="subtitle" style={styles.statValue}>
                {rm.stats.totalReps}
              </EliteText>
            </View>
          </View>

          {/* Resumen por ejercicio */}
          {rm.exercises.map((ex, i) => {
            const sets = rm.completedSets.get(i) ?? [];
            if (sets.length === 0) return null;
            const totalReps = sets.reduce((s, set) => s + (set.reps ?? 0), 0);
            const maxWeight = Math.max(0, ...sets.map(s => s.weightKg ?? 0));

            return (
              <View key={ex.blockId} style={styles.exerciseSummaryCard}>
                <View style={styles.exerciseSummaryHeader}>
                  <Ionicons name="barbell-outline" size={16} color={Colors.neonGreen} />
                  <EliteText variant="body" style={styles.exerciseSummaryName} numberOfLines={1}>
                    {ex.exerciseName}
                  </EliteText>
                </View>
                <EliteText variant="caption" style={styles.exerciseSummaryStats}>
                  {sets.length} sets · {totalReps} reps{maxWeight > 0 ? ` · Max ${maxWeight}kg` : ''}
                </EliteText>
                {sets.map(set => (
                  <View key={set.setNumber} style={styles.setDetailRow}>
                    <EliteText variant="caption" style={styles.setDetailNum}>Set {set.setNumber}:</EliteText>
                    <EliteText variant="caption" style={styles.setDetailData}>
                      {set.reps} reps{set.weightKg ? ` × ${set.weightKg}kg` : ' (BW)'}
                      {set.rpe ? ` @RPE${set.rpe}` : ''}
                    </EliteText>
                  </View>
                ))}
              </View>
            );
          })}

          <View style={{ gap: 12, alignItems: 'center', marginTop: 24 }}>
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
        {/* Tiempo de sesión */}
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

  // === TRABAJANDO / DESCANSANDO ===
  const isWorking = rm.phase === 'working';
  const isResting = rm.phase === 'resting';
  const zoneColor = isWorking ? ZONE_COLORS.green : ZONE_COLORS[rm.restZone];
  const currentSetNum = (rm.currentSets.length) + (isWorking ? 1 : 0);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <View style={styles.headerCenter}>
          <EliteText variant="caption" style={styles.sessionTime}>
            {formatTime(rm.elapsedSeconds)}
          </EliteText>
          <EliteText variant="caption" style={styles.exerciseCounter}>
            Ejercicio {rm.currentExerciseIndex + 1}/{rm.exercises.length}
          </EliteText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Nombre del ejercicio */}
      <EliteText variant="title" style={styles.exerciseTitle} numberOfLines={1}>
        {rm.currentExercise?.exerciseName}
      </EliteText>

      {/* Set indicator */}
      <EliteText variant="caption" style={[styles.setIndicator, { color: zoneColor }]}>
        {isWorking ? `Set ${currentSetNum} de ${rm.totalSuggestedSets}` :
         `Descanso · Set ${rm.currentSets.length} completado`}
      </EliteText>

      {/* Timer grande */}
      <View style={[styles.timerCircle, { borderColor: zoneColor }]}>
        {isWorking && (
          <>
            <EliteText variant="caption" style={[styles.timerLabel, { color: zoneColor }]}>TRABAJO</EliteText>
            <EliteText variant="title" style={[styles.timerValue, { color: zoneColor }]}>
              {formatTime(rm.workSeconds)}
            </EliteText>
          </>
        )}
        {isResting && rm.restCountdown > 0 && (
          <>
            <EliteText variant="caption" style={[styles.timerLabel, { color: zoneColor }]}>DESCANSO</EliteText>
            <EliteText variant="title" style={[styles.timerValue, { color: zoneColor }]}>
              {formatTime(rm.restCountdown)}
            </EliteText>
            <EliteText variant="caption" style={styles.timerSub}>
              {rm.restSeconds}s de {rm.suggestedRest}s
            </EliteText>
          </>
        )}
        {isResting && rm.restCountdown === 0 && (
          <>
            <EliteText variant="caption" style={[styles.timerLabel, { color: zoneColor }]}>
              {rm.restZone === 'yellow' ? 'DESCANSO CUMPLIDO' : 'MUCHO DESCANSO'}
            </EliteText>
            <EliteText variant="title" style={[styles.timerValue, { color: zoneColor }]}>
              +{formatTime(rm.restOvertime)}
            </EliteText>
            <EliteText variant="caption" style={styles.timerSub}>sobre sugerido</EliteText>
          </>
        )}
      </View>

      <ScrollView style={styles.bottomSection} showsVerticalScrollIndicator={false}>
        {/* === INPUTS DE REPS/PESO (solo en working) === */}
        {isWorking && (
          <View style={styles.inputsContainer}>
            {/* Reps */}
            <View style={styles.inputGroup}>
              <EliteText variant="caption" style={styles.inputLabel}>REPS</EliteText>
              <View style={styles.inputRow}>
                <Pressable onPress={() => setReps(r => Math.max(1, r - 1))} style={styles.inputBtn}>
                  <Ionicons name="remove" size={20} color={Colors.textPrimary} />
                </Pressable>
                <TextInput
                  style={styles.inputValue}
                  value={String(reps)}
                  onChangeText={t => { const n = parseInt(t, 10); if (!isNaN(n) && n > 0) setReps(n); }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Pressable onPress={() => setReps(r => r + 1)} style={styles.inputBtn}>
                  <Ionicons name="add" size={20} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            {/* Peso */}
            <View style={styles.inputGroup}>
              <EliteText variant="caption" style={styles.inputLabel}>PESO (kg)</EliteText>
              <View style={styles.inputRow}>
                <Pressable onPress={() => setWeight(w => Math.max(0, (w ?? 0) - 2.5))} style={styles.inputBtn}>
                  <Ionicons name="remove" size={20} color={Colors.textPrimary} />
                </Pressable>
                <TextInput
                  style={styles.inputValue}
                  value={weight !== null ? String(weight) : '—'}
                  onChangeText={t => {
                    if (t === '' || t === '—') { setWeight(null); return; }
                    const n = parseFloat(t);
                    if (!isNaN(n) && n >= 0) setWeight(n);
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  placeholder="BW"
                  placeholderTextColor={Colors.textSecondary}
                />
                <Pressable onPress={() => setWeight(w => (w ?? 0) + 2.5)} style={styles.inputBtn}>
                  <Ionicons name="add" size={20} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Sets completados */}
        {rm.currentSets.length > 0 && (
          <View style={styles.setsListContainer}>
            <EliteText variant="caption" style={styles.setsListTitle}>SETS COMPLETADOS</EliteText>
            {rm.currentSets.map(set => (
              <View key={set.setNumber} style={styles.completedSetRow}>
                <EliteText variant="caption" style={styles.setNum}>Set {set.setNumber}</EliteText>
                <EliteText variant="caption" style={styles.setData}>
                  {set.reps} reps{set.weightKg ? ` × ${set.weightKg}kg` : ' (BW)'}
                  {set.rpe ? ` @${set.rpe}` : ''}
                </EliteText>
                <EliteText variant="caption" style={styles.setDuration}>
                  {formatTime(set.durationSeconds)}
                </EliteText>
              </View>
            ))}
          </View>
        )}

        {/* Preview siguiente ejercicio */}
        {rm.nextExerciseData && (
          <View style={styles.nextExercisePreview}>
            <EliteText variant="caption" style={styles.nextLabel}>SIGUIENTE</EliteText>
            <EliteText variant="body" style={styles.nextName} numberOfLines={1}>
              {rm.nextExerciseData.exerciseName}
            </EliteText>
            <EliteText variant="caption" style={styles.nextSets}>
              {rm.nextExerciseData.suggestedSets} sets
            </EliteText>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* === BOTONES PRINCIPALES === */}
      <View style={styles.actionsBar}>
        {isWorking && (
          <Pressable
            onPress={handleCompleteSet}
            style={({ pressed }) => [styles.mainAction, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="checkmark-circle" size={22} color={Colors.textOnGreen} />
            <EliteText variant="body" style={styles.mainActionText}>SERIE COMPLETADA</EliteText>
          </Pressable>
        )}

        {isResting && (
          <Pressable
            onPress={rm.nextSet}
            style={({ pressed }) => [styles.mainAction, { backgroundColor: zoneColor }, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="play" size={22} color={Colors.black} />
            <EliteText variant="body" style={[styles.mainActionText, { color: Colors.black }]}>
              SIGUIENTE SERIE
            </EliteText>
          </Pressable>
        )}

        <View style={styles.secondaryActions}>
          <Pressable onPress={rm.addExtraSet} style={styles.secondaryBtn}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.neonGreen} />
            <EliteText variant="caption" style={styles.secondaryBtnText}>+ Serie extra</EliteText>
          </Pressable>
          <Pressable onPress={rm.nextExercise} style={styles.secondaryBtn}>
            <Ionicons name="play-skip-forward-outline" size={18} color={Colors.textSecondary} />
            <EliteText variant="caption" style={styles.secondaryBtnTextMuted}>Siguiente ejercicio</EliteText>
          </Pressable>
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

  // --- Idle: lista de ejercicios ---
  exercisePreviewList: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: 4,
  },
  exercisePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  exercisePreviewNum: {
    color: Colors.textSecondary,
    width: 20,
    textAlign: 'right',
  },
  exercisePreviewName: {
    flex: 1,
    color: Colors.textPrimary,
  },
  exercisePreviewSets: {
    color: Colors.textSecondary,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  backBtn: {
    padding: Spacing.xs,
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  sessionTime: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  exerciseCounter: {
    color: Colors.textSecondary,
    fontSize: 11,
  },

  // --- Ejercicio actual ---
  exerciseTitle: {
    textAlign: 'center',
    fontSize: FontSizes.lg,
    letterSpacing: 2,
    paddingHorizontal: Spacing.md,
  },
  bigExerciseName: {
    fontSize: FontSizes.xl,
    textAlign: 'center',
    letterSpacing: 2,
  },
  setIndicator: {
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: Spacing.xs,
    fontSize: 12,
  },

  // --- Timer circular ---
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timerLabel: {
    letterSpacing: 2,
    fontSize: 11,
  },
  timerValue: {
    fontSize: 40,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    color: Colors.textSecondary,
    fontSize: 11,
  },

  // --- Inputs de reps/peso ---
  bottomSection: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  inputsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  inputLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontSize: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  inputBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputValue: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    paddingVertical: Spacing.xs,
    minWidth: 50,
  },

  // --- Sets completados ---
  setsListContainer: {
    marginBottom: Spacing.md,
  },
  setsListTitle: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    fontSize: 10,
  },
  completedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  setNum: {
    color: Colors.textSecondary,
    width: 40,
    fontFamily: Fonts.semiBold,
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

  // --- Preview siguiente ---
  nextExercisePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    marginBottom: Spacing.md,
  },
  nextLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontSize: 10,
    width: 65,
  },
  nextName: {
    flex: 1,
    fontSize: 13,
  },
  nextSets: {
    color: Colors.textSecondary,
  },

  // --- Acciones principales ---
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

  // --- Completada ---
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
  exerciseSummaryCard: {
    width: '100%',
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
    marginBottom: 4,
  },
  exerciseSummaryName: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },
  exerciseSummaryStats: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: Spacing.xs,
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
});
