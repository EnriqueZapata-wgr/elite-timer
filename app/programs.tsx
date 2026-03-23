/**
 * Mis Rutinas — Lista con hero card de resumen, filtros por modo,
 * cards con gradientes funcionales y FAB flotante.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EmptyState } from '@/components/empty-state';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { flattenRoutine, calcRoutineStats, formatTimeHuman } from '@/src/engine';
import type { Routine } from '@/src/engine/types';
import type { RoutineCalcStats } from '@/src/engine/helpers';
import {
  getRoutines,
  deleteRoutine as deleteStoredRoutine,
  saveRoutine,
  generateUUID,
} from '@/src/services/routine-service';

type FilterMode = 'all' | 'timer' | 'routine';

export default function ProgramsScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [])
  );

  const loadRoutines = async () => {
    try {
      setError(null);
      const data = await getRoutines();
      setRoutines(data);
    } catch (err) {
      setError('No se pudieron cargar las rutinas');
    } finally {
      setLoading(false);
    }
  };

  const getStats = (routine: Routine): RoutineCalcStats | null => {
    try {
      const steps = flattenRoutine(routine);
      return calcRoutineStats(steps);
    } catch {
      return null;
    }
  };

  const playRoutine = (routine: Routine) => {
    const target = routine.mode === 'routine' ? '/routine-execution' : '/execution';
    router.push({
      pathname: target as any,
      params: { routine: JSON.stringify(routine) },
    });
  };

  const editRoutine = (routine: Routine) => {
    router.push({
      pathname: '/builder',
      params: { routineId: routine.id },
    });
  };

  const handleDelete = (routine: Routine) => {
    Alert.alert(
      'Eliminar rutina',
      `¿Eliminar "${routine.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStoredRoutine(routine.id);
              loadRoutines();
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la rutina.');
            }
          },
        },
      ],
    );
  };

  const handleDuplicate = async (routine: Routine) => {
    try {
      const idMap = new Map<string, string>();
      const cloneBlocks = (blocks: Routine['blocks']): Routine['blocks'] =>
        blocks.map(block => {
          const newId = generateUUID();
          idMap.set(block.id, newId);
          return {
            ...block,
            id: newId,
            parent_block_id: block.parent_block_id
              ? idMap.get(block.parent_block_id) ?? block.parent_block_id
              : null,
            children: block.children ? cloneBlocks(block.children) : undefined,
          };
        });

      const cloned: Routine = {
        ...routine,
        id: generateUUID(),
        name: `${routine.name} (copia)`,
        blocks: cloneBlocks(routine.blocks),
      };

      await saveRoutine(cloned);
      loadRoutines();
    } catch {
      Alert.alert('Error', 'No se pudo duplicar la rutina.');
    }
  };

  const countExercises = (routine: Routine): number => {
    let count = 0;
    const walk = (blocks: Routine['blocks']) => {
      for (const b of blocks) {
        if (b.type === 'work' && b.exercise_id) count++;
        if (b.children) walk(b.children);
      }
    };
    walk(routine.blocks);
    return count;
  };

  const getStatsLabel = (routine: Routine, stats: RoutineCalcStats | null): string => {
    if (!stats) return '';
    const time = stats.formattedTotal;
    if (routine.mode === 'routine') {
      const exercises = countExercises(routine);
      return `${exercises} ejercicio${exercises !== 1 ? 's' : ''} · ${time}`;
    }
    return time;
  };

  // Rutinas filtradas
  const filtered = routines.filter(r => {
    if (filter === 'all') return true;
    return r.mode === filter;
  });

  const timerCount = routines.filter(r => r.mode === 'timer').length;
  const routineCount = routines.filter(r => r.mode === 'routine').length;
  const hasContent = routines.length > 0;

  return (
    <ScreenContainer centered={false}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">MIS RUTINAS</EliteText>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.neonGreen} />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          actionLabel="REINTENTAR"
          onAction={loadRoutines}
        />
      ) : !hasContent ? (
        <EmptyState
          icon="layers-outline"
          message="No tienes rutinas aún. Crea una con el builder visual."
          actionLabel="CREAR RUTINA"
          onAction={() => router.push('/builder')}
        />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {/* ── Hero Summary Card ── */}
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <LinearGradient colors={['#1a2a1a', '#0a1a0a']} style={styles.summaryCard}>
              <View style={styles.summaryAccent} />
              <EliteText style={styles.summaryWatermark}>⚡</EliteText>
              <EliteText variant="subtitle" style={styles.summaryTitle}>
                MIS RUTINAS
              </EliteText>
              <EliteText variant="caption" style={styles.summaryStats}>
                {routines.length} rutinas · {timerCount} timers · {routineCount} rutinas
              </EliteText>
            </LinearGradient>
          </Animated.View>

          {/* ── Filter Pills ── */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <Pressable
                onPress={() => setFilter('all')}
                style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
              >
                <EliteText variant="caption" style={[
                  styles.filterPillText,
                  filter === 'all' && styles.filterPillTextActive,
                ]}>
                  Todas
                </EliteText>
              </Pressable>

              <Pressable
                onPress={() => setFilter('timer')}
                style={[
                  styles.filterPill,
                  filter === 'timer' && [styles.filterPillActive, { borderColor: Colors.neonGreen, backgroundColor: Colors.neonGreen + '15' }],
                ]}
              >
                <View style={[styles.filterDot, { backgroundColor: Colors.neonGreen }]} />
                <EliteText variant="caption" style={[
                  styles.filterPillText,
                  filter === 'timer' && { color: Colors.neonGreen },
                ]}>
                  Timers
                </EliteText>
              </Pressable>

              <Pressable
                onPress={() => setFilter('routine')}
                style={[
                  styles.filterPill,
                  filter === 'routine' && [styles.filterPillActive, { borderColor: '#7F77DD', backgroundColor: '#7F77DD' + '15' }],
                ]}
              >
                <View style={[styles.filterDot, { backgroundColor: '#7F77DD' }]} />
                <EliteText variant="caption" style={[
                  styles.filterPillText,
                  filter === 'routine' && { color: '#7F77DD' },
                ]}>
                  Rutinas
                </EliteText>
              </Pressable>
            </ScrollView>
          </Animated.View>

          {/* ── Cards de Rutina ── */}
          {filtered.map((routine, index) => {
            const stats = getStats(routine);
            const statsLabel = getStatsLabel(routine, stats);
            const isTimer = routine.mode === 'timer';
            const gradColors: readonly [string, string] = isTimer
              ? ['#1a2a1a', '#0a1a0a']
              : ['#1a1a2a', '#0a0a1a'];
            const accentColor = isTimer ? Colors.neonGreen : '#7F77DD';
            const modeLabel = isTimer ? 'TIMER' : 'RUTINA';

            return (
              <Animated.View key={routine.id} entering={FadeInRight.delay(index * 60).springify()}>
                <AnimatedPressable
                  onPress={() => playRoutine(routine)}
                  style={styles.card}
                >
                  <LinearGradient colors={gradColors} style={styles.cardGradient}>
                    {/* Borde izquierdo */}
                    <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

                    {/* Badge de modo */}
                    <View style={[styles.modeBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
                      <EliteText variant="caption" style={[styles.modeBadgeText, { color: accentColor }]}>
                        {modeLabel}
                      </EliteText>
                    </View>

                    {/* Menú ⋮ */}
                    <Pressable
                      onPress={() => {
                        Alert.alert(routine.name, '', [
                          { text: 'Editar', onPress: () => editRoutine(routine) },
                          { text: 'Copiar', onPress: () => handleDuplicate(routine) },
                          { text: 'Eliminar', style: 'destructive', onPress: () => handleDelete(routine) },
                          { text: 'Cancelar', style: 'cancel' },
                        ]);
                      }}
                      hitSlop={12}
                      style={styles.menuBtn}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={Colors.textSecondary} />
                    </Pressable>

                    {/* Contenido */}
                    <View style={styles.cardBody}>
                      <EliteText variant="subtitle" style={styles.cardTitle} numberOfLines={2}>
                        {routine.name}
                      </EliteText>
                      {statsLabel ? (
                        <EliteText variant="caption" style={styles.cardStats}>
                          {statsLabel}
                        </EliteText>
                      ) : null}
                      <EliteText variant="caption" style={styles.cardLastUsed}>
                        Última vez: Nunca
                      </EliteText>
                    </View>

                    {/* Botón play */}
                    <Pressable
                      onPress={() => playRoutine(routine)}
                      hitSlop={8}
                      style={[styles.playBtn, {
                        shadowColor: accentColor,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                      }]}
                    >
                      <View style={[styles.playBtnCircle, { backgroundColor: accentColor }]}>
                        <Ionicons name="play" size={22} color={Colors.black} />
                      </View>
                    </Pressable>
                  </LinearGradient>
                </AnimatedPressable>
              </Animated.View>
            );
          })}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <Pressable
        onPress={() => router.push('/builder')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="add" size={28} color={Colors.textOnGreen} />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },

  // ── Summary Card ──
  summaryCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 6,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#2a3a2a',
  },
  summaryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.neonGreen,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  summaryWatermark: {
    position: 'absolute',
    top: -10,
    right: -5,
    fontSize: 70,
    opacity: 0.06,
  },
  summaryTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  summaryStats: {
    color: Colors.textSecondary,
    fontSize: 13,
  },

  // ── Filter pills ──
  filterRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  filterPillActive: {
    borderColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '15',
  },
  filterPillText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  filterPillTextActive: {
    color: Colors.neonGreen,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Routine Card ──
  card: {
    marginBottom: Spacing.sm,
  },
  cardGradient: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 6,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  modeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.md + 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  menuBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    padding: Spacing.xs,
  },
  cardBody: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardStats: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  cardLastUsed: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  playBtn: {
    marginLeft: Spacing.sm,
  },
  playBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});
