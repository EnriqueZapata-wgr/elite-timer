/**
 * Mis Marcas — Dashboard de PRs con hero card de rendimiento global,
 * filtros por grupo muscular, y cards con gradientes por grupo.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, FlatList,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { ExerciseHistory } from '@/src/components/ExerciseHistory';
import { getPersonalRecords, getExerciseProgression, type ProgressionPoint } from '@/src/services/exercise-service';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_COLORS,
} from '@/src/types/exercise';
import type { PersonalRecord } from '@/src/types/exercise';

// === HELPERS ===

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

function getPRRecency(achievedAt: string): 'today' | 'week' | null {
  const date = new Date(achievedAt);
  const now = new Date();

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return 'today';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 'week';

  return null;
}

// Gradientes oscuros por grupo muscular
function getMuscleGroupGradient(mg: string): readonly [string, string] {
  switch (mg) {
    case 'chest': return ['#2a1515', '#1a0a0a'];
    case 'back': return ['#0a1a2a', '#0a0a1a'];
    case 'shoulders': return ['#2a1f0a', '#1a1a0a'];
    case 'legs': return ['#1a2a1a', '#0a1a0a'];
    case 'arms': return ['#1a1a2a', '#0a0a1a'];
    case 'core': return ['#2a2a0a', '#1a1a0a'];
    case 'full_body': return ['#0a2a2a', '#0a1a1a'];
    default: return ['#1a1a1a', '#111111'];
  }
}

// Descripciones de grupo
const MUSCLE_GROUP_DESCRIPTIONS: Record<string, string> = {
  chest: 'UPPER BODY',
  back: 'UPPER BODY',
  shoulders: 'UPPER BODY',
  legs: 'LOWER BODY',
  arms: 'UPPER BODY',
  core: 'CORE',
  full_body: 'FULL BODY',
};

const REP_RANGES = [1, 2, 3, 4, 5];

const CHART_WIDTH = Dimensions.get('window').width - Spacing.md * 2 - Spacing.md * 2; // card padding
const CHART_HEIGHT = 130;
const CHART_PAD = 24;

function ProgressionLineChart({ data, color }: { data: ProgressionPoint[]; color: string }) {
  if (data.length < 2) return null;

  const maxW = Math.max(...data.map(d => d.maxWeight));
  const minW = Math.min(...data.map(d => d.maxWeight));
  const range = maxW - minW || 1;

  const points = data.map((d, i) => ({
    x: CHART_PAD + (i / (data.length - 1)) * (CHART_WIDTH - 2 * CHART_PAD),
    y: CHART_HEIGHT - CHART_PAD - ((d.maxWeight - minW) / range) * (CHART_HEIGHT - 2 * CHART_PAD),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Mostrar max 6 labels en el eje X
  const labelStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Path d={pathD} stroke={color} strokeWidth={2} fill="none" />
        {points.map((p, i) => (
          <SvgCircle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}
        {/* Highlight del PR actual (el punto más alto) */}
        {(() => {
          const maxIdx = data.findIndex(d => d.maxWeight === maxW);
          if (maxIdx < 0) return null;
          const p = points[maxIdx];
          return <SvgCircle cx={p.x} cy={p.y} r={6} fill={color} opacity={0.3} />;
        })()}
      </Svg>
      {/* Labels X */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: CHART_PAD - 8, marginTop: 2 }}>
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <EliteText key={i} variant="caption" style={{ fontSize: 8, color: Colors.textSecondary }}>
              {d.dateLabel}
            </EliteText>
          ) : null
        )}
      </View>
      {/* Min/Max labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <EliteText variant="caption" style={{ fontSize: 9, color: Colors.textSecondary }}>
          Min: {minW}kg
        </EliteText>
        <EliteText variant="caption" style={{ fontSize: 9, color }}>
          Max: {maxW}kg
        </EliteText>
      </View>
    </View>
  );
}

// === PANTALLA PRINCIPAL ===

export default function PersonalRecordsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [progressionData, setProgressionData] = useState<ProgressionPoint[]>([]);
  const [progressionLoading, setProgressionLoading] = useState(false);

  // Cargar progresión cuando se selecciona un ejercicio
  useEffect(() => {
    if (!selectedExerciseId) {
      setProgressionData([]);
      return;
    }
    setProgressionLoading(true);
    getExerciseProgression(selectedExerciseId)
      .then(setProgressionData)
      .catch(() => setProgressionData([]))
      .finally(() => setProgressionLoading(false));
  }, [selectedExerciseId]);

  const loadRecords = useCallback(async () => {
    try {
      const data = await getPersonalRecords({
        muscle_group: selectedGroup ?? undefined,
      });
      setRecords(data);
    } catch (err) {
      if (__DEV__) console.error('Error al cargar PRs:', err);
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
  const totalPRs = records.length;

  // PR más reciente
  const mostRecentPR = records.length > 0
    ? records.reduce((latest, pr) =>
        new Date(pr.achieved_at) > new Date(latest.achieved_at) ? pr : latest
      )
    : null;

  // Nivel basado en PRs
  const getLevel = (count: number): string => {
    if (count >= 26) return 'ELITE';
    if (count >= 11) return 'AVANZADO';
    if (count >= 4) return 'INTERMEDIO';
    return 'PRINCIPIANTE';
  };

  // Percentil placeholder (consistente con nivel)
  const percentile = Math.min(99, totalPRs * 5 + 20);

  // Mayor 1RM estimado de todos los ejercicios
  const best1RM = groupedEntries.length > 0
    ? Math.round(Math.max(...groupedEntries.map(e => e.estimated1rm)))
    : 0;

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
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title" style={styles.headerTitle}>
          MIS MARCAS
        </EliteText>
      </View>

      {/* ── Hero Card — Score Global ── */}
      <Animated.View entering={FadeInUp.delay(50).springify()}>
        <LinearGradient colors={['#1a2a1a', '#0a1a0a']} style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <EliteText style={styles.heroWatermark}>★</EliteText>

          <EliteText variant="caption" style={styles.heroLabel}>RENDIMIENTO</EliteText>
          <EliteText style={styles.heroLevel}>{getLevel(totalPRs)}</EliteText>

          {/* Mini stats row */}
          <View style={styles.heroMiniStats}>
            <View style={styles.heroMiniStatItem}>
              <EliteText style={styles.heroMiniStatValue}>{totalPRs}</EliteText>
              <EliteText variant="caption" style={styles.heroMiniStatLabel}>PRs</EliteText>
            </View>
            <View style={styles.heroMiniStatDivider} />
            <View style={styles.heroMiniStatItem}>
              <EliteText style={styles.heroMiniStatValue}>{percentile}%</EliteText>
              <EliteText variant="caption" style={styles.heroMiniStatLabel}>Percentil</EliteText>
            </View>
            <View style={styles.heroMiniStatDivider} />
            <View style={styles.heroMiniStatItem}>
              <EliteText style={styles.heroMiniStatValue}>{best1RM > 0 ? `${best1RM}kg` : '—'}</EliteText>
              <EliteText variant="caption" style={styles.heroMiniStatLabel}>1RM estimado</EliteText>
            </View>
          </View>

          {mostRecentPR && (
            <LinearGradient colors={['#111111', '#0a0a0a']} style={styles.recentPRCard}>
              <View style={styles.recentPRRow}>
                <Ionicons name="trending-up" size={16} color={Colors.neonGreen} />
                <EliteText variant="caption" style={styles.recentPRLabel}>PR MÁS RECIENTE</EliteText>
              </View>
              <EliteText variant="body" style={styles.recentPRName}>
                {mostRecentPR.exercise_name}
              </EliteText>
              <EliteText variant="body" style={styles.recentPRWeight}>
                {mostRecentPR.weight_kg}kg × {mostRecentPR.rep_range} rep{mostRecentPR.rep_range > 1 ? 's' : ''}
              </EliteText>
            </LinearGradient>
          )}
        </LinearGradient>
      </Animated.View>

      {/* ── Filtros ── */}
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
                isSelected && { borderColor: color, backgroundColor: color + '15' },
              ]}
            >
              {item && <View style={[styles.filterDot, { backgroundColor: color }]} />}
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
            Aún no tienes marcas personales
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
          {Array.from(byMuscle.entries()).map(([muscleGroup, exercises]) => {
            const mgColor = MUSCLE_GROUP_COLORS[muscleGroup] ?? '#888';
            const mgGrad = getMuscleGroupGradient(muscleGroup);
            const mgDesc = MUSCLE_GROUP_DESCRIPTIONS[muscleGroup] ?? '';

            return (
              <View key={muscleGroup} style={styles.muscleGroupSection}>
                {/* Encabezado */}
                <View style={styles.muscleGroupHeader}>
                  <View style={[styles.muscleGroupDot, { backgroundColor: mgColor }]} />
                  <EliteText variant="label" style={styles.muscleGroupTitle}>
                    {MUSCLE_GROUP_LABELS[muscleGroup] ?? muscleGroup}
                  </EliteText>
                  {mgDesc && (
                    <EliteText variant="caption" style={styles.muscleGroupDesc}>
                      {mgDesc}
                    </EliteText>
                  )}
                </View>

                {/* Ejercicios */}
                {exercises.map((entry) => {
                  const prMap = new Map<number, PersonalRecord>();
                  for (const pr of entry.records) {
                    prMap.set(pr.rep_range, pr);
                  }

                  // Rep range donde se logró el mejor PR
                  const bestPRRange = entry.records.reduce((best, pr) =>
                    pr.weight_kg > (best?.weight_kg ?? 0) ? pr : best
                  ).rep_range;

                  return (
                    <Pressable
                      key={entry.exerciseId}
                      onPress={() => setSelectedExerciseId(
                        selectedExerciseId === entry.exerciseId ? null : entry.exerciseId
                      )}
                    >
                      <LinearGradient colors={mgGrad} style={styles.exerciseCard}>
                        {/* Header */}
                        <View style={styles.exerciseHeader}>
                          <EliteText variant="body" style={styles.exerciseName} numberOfLines={1}>
                            {entry.exerciseName}
                          </EliteText>
                          <EliteText variant="caption" style={styles.estimated1rm}>
                            Máximo estimado: {Math.round(entry.estimated1rm)}kg
                          </EliteText>
                        </View>

                        {/* Tabla de rep ranges */}
                        <View style={styles.repRangeTable}>
                          <View style={styles.repRangeRow}>
                            {REP_RANGES.map(rr => (
                              <View key={rr} style={styles.repRangeCell}>
                                <EliteText variant="caption" style={styles.repRangeHeader}>
                                  {rr} rep{rr > 1 ? 's' : ''}
                                </EliteText>
                              </View>
                            ))}
                          </View>
                          <View style={styles.repRangeRow}>
                            {REP_RANGES.map(rr => {
                              const pr = prMap.get(rr);
                              const recency = pr ? getPRRecency(pr.achieved_at) : null;
                              const isBestRange = rr === bestPRRange && pr;

                              return (
                                <View
                                  key={rr}
                                  style={[
                                    styles.repRangeCell,
                                    isBestRange && [styles.repRangeHighlighted, { backgroundColor: mgColor + '15' }],
                                  ]}
                                >
                                  {pr ? (
                                    <>
                                      <EliteText variant="body" style={[
                                        styles.repRangeValue,
                                        isBestRange && { color: mgColor },
                                      ]}>
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
                                            PR!
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

                        {/* Gráfica de progresión (visible cuando seleccionado) */}
                        {selectedExerciseId === entry.exerciseId && (
                          <View style={styles.progressionContainer}>
                            <EliteText variant="caption" style={styles.progressionLabel}>
                              PROGRESIÓN DE PESO
                            </EliteText>
                            {progressionLoading ? (
                              <ActivityIndicator color={Colors.neonGreen} style={{ marginVertical: Spacing.md }} />
                            ) : progressionData.length < 2 ? (
                              <EliteText variant="caption" style={styles.progressionEmpty}>
                                Necesitas al menos 2 sesiones para ver la progresión
                              </EliteText>
                            ) : (
                              <ProgressionLineChart data={progressionData} color={mgColor} />
                            )}
                          </View>
                        )}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

      {/* Modal historial */}
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

  // ── Header ──
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

  // ── Hero Card ──
  heroCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 6,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#2a3a2a',
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.neonGreen,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  heroWatermark: {
    position: 'absolute',
    top: -15,
    right: -5,
    fontSize: 80,
    opacity: 0.05,
    color: '#FFD700',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  heroLabel: {
    color: Colors.textSecondary,
    letterSpacing: 3,
    fontSize: 11,
    marginBottom: Spacing.xs,
  },
  heroLevel: {
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    color: Colors.neonGreen,
    letterSpacing: 3,
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  heroMiniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroMiniStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroMiniStatValue: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  heroMiniStatLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroMiniStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2a2a2a',
  },
  recentPRCard: {
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  recentPRRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  recentPRLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
  },
  recentPRName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  recentPRWeight: {
    fontFamily: Fonts.bold,
    color: Colors.neonGreen,
    fontSize: 15,
    marginTop: 2,
  },

  // ── Filtros ──
  filterList: {
    height: 40,
    minHeight: 40,
    flexGrow: 0,
    marginBottom: Spacing.md,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 48,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },

  // ── Loading / Empty ──
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

  // ── Secciones por grupo muscular ──
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
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  muscleGroupDesc: {
    color: Colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.6,
  },

  // ── Card de ejercicio ──
  exerciseCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  exerciseName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  estimated1rm: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },

  // ── Tabla de rep ranges ──
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
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  repRangeHighlighted: {
    borderRadius: Radius.sm,
  },
  repRangeHeader: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  repRangeValue: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  repRangeEmpty: {
    color: Colors.disabled,
    fontSize: 14,
  },

  // ── Badges de recencia ──
  recencyBadge: {
    backgroundColor: Colors.neonGreen + '25',
    paddingHorizontal: 5,
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

  // ── Progression chart ──
  progressionContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
  },
  progressionLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginBottom: Spacing.sm,
  },
  progressionEmpty: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
