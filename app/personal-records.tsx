/**
 * Personal Records — Dashboard de PRs del usuario.
 *
 * Muestra PRs agrupados por ejercicio con tabla de rep ranges.
 * Filtrable por grupo muscular. Toca un ejercicio para ver su historial.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EliteText } from '@/components/elite-text';
import { ExerciseHistory } from '@/src/components/ExerciseHistory';
import { getPersonalRecords } from '@/src/services/exercise-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_COLORS,
} from '@/src/types/exercise';
import type { PersonalRecord } from '@/src/types/exercise';

// === HELPERS ===

/** Agrupar PRs por ejercicio */
function groupByExercise(records: PersonalRecord[]): Map<string, {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  records: PersonalRecord[];
  estimated1rm: number;
}> {
  const groups = new Map<string, {
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    records: PersonalRecord[];
    estimated1rm: number;
  }>();

  for (const pr of records) {
    const existing = groups.get(pr.exercise_id);
    if (existing) {
      existing.records.push(pr);
      if (pr.estimated_1rm > existing.estimated1rm) {
        existing.estimated1rm = pr.estimated_1rm;
      }
    } else {
      groups.set(pr.exercise_id, {
        exerciseId: pr.exercise_id,
        exerciseName: pr.exercise_name ?? '',
        muscleGroup: pr.muscle_group ?? '',
        records: [pr],
        estimated1rm: pr.estimated_1rm,
      });
    }
  }

  return groups;
}

/** Detectar si un PR es de hoy o esta semana */
function getPRRecency(achievedAt: string): 'today' | 'week' | null {
  const date = new Date(achievedAt);
  const now = new Date();

  // Mismo día
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return 'today';
  }

  // Misma semana (últimos 7 días)
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 'week';

  return null;
}

// === REP RANGES A MOSTRAR ===

const REP_RANGES = [1, 2, 3, 4, 5];

// === PANTALLA PRINCIPAL ===

export default function PersonalRecordsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      const data = await getPersonalRecords({
        muscle_group: selectedGroup ?? undefined,
      });
      setRecords(data);
    } catch (err) {
      console.error('Error al cargar PRs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    setLoading(true);
    loadRecords();
  }, [loadRecords]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  const exerciseGroups = groupByExercise(records);
  const groupedEntries = Array.from(exerciseGroups.values());

  // Agrupar por muscle_group para la UI
  const byMuscle = new Map<string, typeof groupedEntries>();
  for (const entry of groupedEntries) {
    const mg = entry.muscleGroup || 'other';
    const existing = byMuscle.get(mg) ?? [];
    existing.push(entry);
    byMuscle.set(mg, existing);
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title" style={styles.headerTitle}>
          PERSONAL RECORDS
        </EliteText>
      </View>

      {/* Filtros por grupo muscular */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[null, ...MUSCLE_GROUPS]}
        keyExtractor={(item) => item ?? 'all'}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => {
          const isSelected = selectedGroup === item;
          const label = item ? MUSCLE_GROUP_LABELS[item] : 'Todos';
          const color = item ? MUSCLE_GROUP_COLORS[item] : Colors.neonGreen;

          return (
            <Pressable
              onPress={() => setSelectedGroup(item)}
              style={[
                styles.filterPill,
                isSelected && { borderColor: color, backgroundColor: color + '20' },
              ]}
            >
              <EliteText
                variant="caption"
                style={[
                  styles.filterText,
                  isSelected && { color },
                ]}
              >
                {label}
              </EliteText>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.neonGreen} size="large" />
        </View>
      ) : groupedEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={48} color={Colors.textSecondary} />
          <EliteText variant="body" style={styles.emptyText}>
            Aún no tienes Personal Records
          </EliteText>
          <EliteText variant="caption" style={styles.emptySubtext}>
            Registra ejercicios con peso para generar PRs
          </EliteText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.neonGreen}
            />
          }
        >
          {Array.from(byMuscle.entries()).map(([muscleGroup, exercises]) => (
            <View key={muscleGroup} style={styles.muscleGroupSection}>
              {/* Encabezado de grupo muscular */}
              <View style={styles.muscleGroupHeader}>
                <View style={[
                  styles.muscleGroupDot,
                  { backgroundColor: MUSCLE_GROUP_COLORS[muscleGroup] ?? '#888' },
                ]} />
                <EliteText variant="label" style={styles.muscleGroupTitle}>
                  {MUSCLE_GROUP_LABELS[muscleGroup] ?? muscleGroup}
                </EliteText>
              </View>

              {/* Ejercicios de este grupo */}
              {exercises.map((entry) => {
                // Construir mapa de rep_range → PR
                const prMap = new Map<number, PersonalRecord>();
                for (const pr of entry.records) {
                  prMap.set(pr.rep_range, pr);
                }

                return (
                  <Pressable
                    key={entry.exerciseId}
                    onPress={() => setSelectedExerciseId(
                      selectedExerciseId === entry.exerciseId ? null : entry.exerciseId
                    )}
                    style={styles.exerciseCard}
                  >
                    {/* Nombre del ejercicio + 1RM estimado */}
                    <View style={styles.exerciseHeader}>
                      <EliteText variant="body" style={styles.exerciseName} numberOfLines={1}>
                        {entry.exerciseName}
                      </EliteText>
                      <EliteText variant="caption" style={styles.estimated1rm}>
                        Est. 1RM: {Math.round(entry.estimated1rm)}kg
                      </EliteText>
                    </View>

                    {/* Tabla de rep ranges */}
                    <View style={styles.repRangeTable}>
                      {/* Header */}
                      <View style={styles.repRangeRow}>
                        {REP_RANGES.map(rr => (
                          <View key={rr} style={styles.repRangeCell}>
                            <EliteText variant="caption" style={styles.repRangeHeader}>
                              {rr}RM
                            </EliteText>
                          </View>
                        ))}
                      </View>
                      {/* Valores */}
                      <View style={styles.repRangeRow}>
                        {REP_RANGES.map(rr => {
                          const pr = prMap.get(rr);
                          const recency = pr ? getPRRecency(pr.achieved_at) : null;

                          return (
                            <View key={rr} style={styles.repRangeCell}>
                              {pr ? (
                                <>
                                  <EliteText variant="body" style={styles.repRangeValue}>
                                    {pr.weight_kg}kg
                                  </EliteText>
                                  {recency === 'today' && (
                                    <View style={styles.recencyBadge}>
                                      <EliteText variant="caption" style={styles.recencyBadgeText}>
                                        HOY
                                      </EliteText>
                                    </View>
                                  )}
                                  {recency === 'week' && (
                                    <View style={[styles.recencyBadge, styles.recencyWeek]}>
                                      <EliteText variant="caption" style={[styles.recencyBadgeText, styles.recencyWeekText]}>
                                        NUEVO
                                      </EliteText>
                                    </View>
                                  )}
                                </>
                              ) : (
                                <EliteText variant="body" style={styles.repRangeEmpty}>
                                  —
                                </EliteText>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

      {/* Modal de historial de ejercicio */}
      {selectedExerciseId && (
        <ExerciseHistory
          visible={!!selectedExerciseId}
          exerciseId={selectedExerciseId}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </SafeAreaView>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    letterSpacing: 3,
  },

  // --- Filtros ---
  filterList: {
    maxHeight: 40,
    marginBottom: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  filterText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
    fontSize: 11,
  },

  // --- Loading / Empty ---
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
  },

  // --- Secciones por grupo muscular ---
  muscleGroupSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  muscleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  muscleGroupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  muscleGroupTitle: {
    letterSpacing: 2,
    fontSize: 12,
  },

  // --- Card de ejercicio ---
  exerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  exerciseName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  estimated1rm: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },

  // --- Tabla de rep ranges ---
  repRangeTable: {
    gap: Spacing.xs,
  },
  repRangeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  repRangeCell: {
    flex: 1,
    alignItems: 'center',
  },
  repRangeHeader: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  repRangeValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  repRangeEmpty: {
    color: Colors.disabled,
    fontSize: 13,
  },

  // --- Badges de recencia ---
  recencyBadge: {
    backgroundColor: Colors.neonGreen + '25',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    marginTop: 2,
  },
  recencyBadgeText: {
    color: Colors.neonGreen,
    fontSize: 8,
    fontFamily: Fonts.bold,
  },
  recencyWeek: {
    backgroundColor: '#5B9BD5' + '25',
  },
  recencyWeekText: {
    color: '#5B9BD5',
  },
});
