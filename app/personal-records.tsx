/**
 * Mis Marcas — Dashboard de PRs con hero card de rendimiento global,
 * filtros por grupo muscular, y cards con gradientes por grupo.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, FlatList,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { ExerciseHistory } from '@/src/components/ExerciseHistory';
import {
  getPersonalRecords,
  getExerciseProgression,
  getExerciseSessionHistory,
  type ProgressionPoint,
  type ExerciseSessionEntry,
} from '@/src/services/exercise-service';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';
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

const CHART_WIDTH = Dimensions.get('window').width - Spacing.md * 4;
const CHART_HEIGHT = 150;
const CHART_PAD = 28;

// Colores por rep range
const REP_RANGE_COLORS: Record<number, string> = {
  1: '#a8e02a', // 1RM estimado (verde)
  3: '#EF9F27', // 3RM (amarillo)
  5: '#5B9BD5', // 5RM (azul)
  8: '#888888', // 8-10RM (gris)
};

const REP_RANGE_LABELS: Record<number, string> = {
  1: '1RM est.',
  3: '3RM',
  5: '5RM',
  8: '8-10RM',
};

function ProgressionLineChart({ data, color }: { data: ProgressionPoint[]; color: string }) {
  const [activeLines, setActiveLines] = useState<Set<number>>(new Set([1])); // 1 = 1RM estimado

  if (data.length < 2) return null;

  // Recopilar todos los valores visibles para calcular escala Y
  let allValues: number[] = [];
  if (activeLines.has(1)) allValues.push(...data.map(d => d.estimated1RM));
  for (const rr of [3, 5, 8]) {
    if (activeLines.has(rr)) {
      data.forEach(d => { if (d.maxByRepRange[rr]) allValues.push(d.maxByRepRange[rr]); });
    }
  }
  if (allValues.length === 0) allValues = data.map(d => d.estimated1RM);

  const maxY = Math.max(...allValues);
  const minY = Math.min(...allValues);
  const range = maxY - minY || 1;

  const toPoint = (i: number, val: number) => ({
    x: CHART_PAD + (i / (data.length - 1)) * (CHART_WIDTH - 2 * CHART_PAD),
    y: CHART_HEIGHT - CHART_PAD - ((val - minY) / range) * (CHART_HEIGHT - 2 * CHART_PAD),
  });

  const buildPath = (values: (number | undefined)[]) => {
    const pts = values.map((v, i) => v !== undefined ? toPoint(i, v) : null).filter(Boolean) as { x: number; y: number }[];
    if (pts.length < 2) return null;
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  // 1RM estimado (verde sólido)
  const e1rmPath = activeLines.has(1) ? buildPath(data.map(d => d.estimated1RM)) : null;
  // Area fill bajo 1RM
  const e1rmAreaPath = e1rmPath ? `${e1rmPath} L ${toPoint(data.length - 1, minY).x} ${CHART_HEIGHT - CHART_PAD} L ${CHART_PAD} ${CHART_HEIGHT - CHART_PAD} Z` : null;

  // Rep range paths
  const rrPaths: { rr: number; path: string }[] = [];
  for (const rr of [3, 5, 8]) {
    if (!activeLines.has(rr)) continue;
    const path = buildPath(data.map(d => d.maxByRepRange[rr]));
    if (path) rrPaths.push({ rr, path });
  }

  const toggleLine = (rr: number) => {
    setActiveLines(prev => {
      const next = new Set(prev);
      if (next.has(rr)) next.delete(rr);
      else next.add(rr);
      return next;
    });
  };

  // Grid lines
  const gridYCount = 3;
  const gridLines = Array.from({ length: gridYCount + 1 }, (_, i) => {
    const val = minY + (range * i) / gridYCount;
    const y = CHART_HEIGHT - CHART_PAD - (i / gridYCount) * (CHART_HEIGHT - 2 * CHART_PAD);
    return { y, label: `${Math.round(val)}` };
  });

  const labelStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Grid horizontal */}
        {gridLines.map((g, i) => (
          <Line key={i} x1={CHART_PAD} y1={g.y} x2={CHART_WIDTH - CHART_PAD} y2={g.y}
            stroke="#1A1A1A" strokeWidth={1} />
        ))}

        {/* Area fill 1RM */}
        {e1rmAreaPath && <Path d={e1rmAreaPath} fill={Colors.neonGreen} opacity={0.08} />}

        {/* Rep range lines (punteadas) */}
        {rrPaths.map(({ rr, path }) => (
          <Path key={rr} d={path} stroke={REP_RANGE_COLORS[rr]} strokeWidth={1.5}
            strokeDasharray="4,4" fill="none" />
        ))}

        {/* 1RM line (sólida) */}
        {e1rmPath && <Path d={e1rmPath} stroke={Colors.neonGreen} strokeWidth={2} fill="none" />}

        {/* Puntos 1RM */}
        {activeLines.has(1) && data.map((d, i) => {
          const p = toPoint(i, d.estimated1RM);
          const isMax = d.estimated1RM === maxY;
          return (
            <SvgCircle key={`e1rm-${i}`} cx={p.x} cy={p.y}
              r={isMax ? 5 : 3} fill={Colors.neonGreen}
              opacity={isMax ? 1 : 0.8} />
          );
        })}
      </Svg>

      {/* Y axis labels */}
      <View style={{ position: 'absolute', left: 0, top: 0, height: CHART_HEIGHT }}>
        {gridLines.map((g, i) => (
          <EliteText key={i} variant="caption" style={{
            position: 'absolute', top: g.y - 6, left: 0,
            fontSize: 8, color: Colors.textSecondary,
          }}>{g.label}</EliteText>
        ))}
      </View>

      {/* X labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: CHART_PAD - 6, marginTop: 2 }}>
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <EliteText key={i} variant="caption" style={{ fontSize: 8, color: Colors.textSecondary }}>
              {d.dateLabel}
            </EliteText>
          ) : <View key={i} />
        )}
      </View>

      {/* Toggle pills */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: Spacing.sm, flexWrap: 'wrap' }}>
        {([1, 3, 5, 8] as const).map(rr => {
          const active = activeLines.has(rr);
          const c = REP_RANGE_COLORS[rr];
          return (
            <Pressable key={rr} onPress={() => toggleLine(rr)}
              style={[styles.togglePill, active && { borderColor: c, backgroundColor: c + '15' }]}>
              <View style={[styles.toggleDot, { backgroundColor: active ? c : '#333' }]} />
              <EliteText variant="caption" style={[styles.toggleText, active && { color: c }]}>
                {REP_RANGE_LABELS[rr]}
              </EliteText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// === PANTALLA PRINCIPAL ===

export default function PersonalRecordsScreen() {
  const router = useRouter();
  const segments = useSegments();
  const isInTabs = segments[0] === '(tabs)';
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [progressionData, setProgressionData] = useState<ProgressionPoint[]>([]);
  const [sessionHistory, setSessionHistory] = useState<ExerciseSessionEntry[]>([]);
  const [progressionLoading, setProgressionLoading] = useState(false);

  // Cargar progresión y historial cuando se selecciona un ejercicio
  useEffect(() => {
    if (!selectedExerciseId) {
      setProgressionData([]);
      setSessionHistory([]);
      return;
    }
    setProgressionLoading(true);
    Promise.all([
      getExerciseProgression(selectedExerciseId),
      getExerciseSessionHistory(selectedExerciseId),
    ])
      .then(([prog, hist]) => { setProgressionData(prog); setSessionHistory(hist); })
      .catch(() => { setProgressionData([]); setSessionHistory([]); })
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
        {!isInTabs && (
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
          </Pressable>
        )}
        <EliteText variant="title" style={styles.headerTitle}>
          {isInTabs ? 'PROGRESO' : 'MIS MARCAS'}
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

                        {/* Gráfica + historial (visible cuando seleccionado) */}
                        {selectedExerciseId === entry.exerciseId && (
                          <View style={styles.progressionContainer}>
                            <EliteText variant="caption" style={styles.progressionLabel}>
                              PROGRESIÓN DE PESO
                            </EliteText>
                            {progressionLoading ? (
                              <ActivityIndicator color={Colors.neonGreen} style={{ marginVertical: Spacing.md }} />
                            ) : progressionData.length < 2 ? (
                              <View style={styles.progressionEmptyBox}>
                                <Ionicons name="barbell-outline" size={28} color={Colors.textSecondary} />
                                <EliteText variant="caption" style={styles.progressionEmpty}>
                                  Entrena más para ver tu progresión
                                </EliteText>
                              </View>
                            ) : (
                              <ProgressionLineChart data={progressionData} color={mgColor} />
                            )}

                            {/* Historial de sesiones */}
                            {sessionHistory.length > 0 && (
                              <View style={styles.sessionHistSection}>
                                <EliteText variant="caption" style={styles.progressionLabel}>
                                  HISTORIAL DE SESIONES
                                </EliteText>
                                {sessionHistory.slice(0, 8).map((session) => (
                                  <View key={session.date} style={styles.sessionHistCard}>
                                    <View style={styles.sessionHistHeader}>
                                      <EliteText variant="caption" style={styles.sessionHistDate}>
                                        {session.dateLabel}
                                      </EliteText>
                                      <EliteText variant="caption" style={[styles.sessionHist1RM, { color: mgColor }]}>
                                        1RM est. {session.estimated1RM}kg
                                      </EliteText>
                                    </View>
                                    {session.sets.map((set, si) => (
                                      <EliteText key={si} variant="caption" style={styles.sessionHistSet}>
                                        Set {si + 1}: {set.reps} reps × {set.weight_kg}kg
                                        {set.rir != null ? ` @ RIR ${set.rir}` : ''}
                                      </EliteText>
                                    ))}
                                  </View>
                                ))}
                              </View>
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
  progressionEmptyBox: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  progressionEmpty: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },

  // ── Toggle pills ──
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  toggleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.semiBold,
  },

  // ── Session history ──
  sessionHistSection: {
    marginTop: Spacing.md,
  },
  sessionHistCard: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1a1a1a',
  },
  sessionHistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionHistDate: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  sessionHist1RM: {
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  sessionHistSet: {
    color: Colors.textSecondary,
    fontSize: 10,
    paddingLeft: Spacing.sm,
    lineHeight: 16,
  },
});
