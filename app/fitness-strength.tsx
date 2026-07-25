/**
 * Fuerza (MB-3.6 Bloque 1.1) — FUSIÓN de fitness-strength + personal-records.
 *
 * Antes eran dos pantallas girando sobre el mismo dato (PRs/benchmarks) — un
 * dato en dos lugares violaba la doctrina navegación-vs-consulta. Ahora una
 * sola casa con jerarquía:
 *   1. Hero RENDIMIENTO (protagonista): nivel + PRs + mejor 1RM.
 *   2. BENCHMARKS: los ejercicios estándar con variantes → registrar.
 *   3. TUS MARCAS: todos los PRs por grupo muscular, con progresión expandible.
 * /personal-records redirige aquí (deep-links y tab Progreso viven).
 */
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import {
  ATP_BRAND, TEXT, ELEVATION, SEMANTIC, CATEGORY_COLORS, PILLAR_GRADIENTS, GLOW, withOpacity,
} from '@/src/constants/brand';
import {
  getPersonalRecords,
  getExerciseProgression,
  getExerciseSessionHistory,
  type ProgressionPoint,
  type ExerciseSessionEntry,
} from '@/src/services/exercise-service';
import { getBenchmarksWithVariants, type BenchmarkExercise } from '@/src/services/fitness-service';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_COLORS } from '@/src/types/exercise';
import type { PersonalRecord } from '@/src/types/exercise';

const LIME = CATEGORY_COLORS.fitness;

// === HELPERS ===

interface ExerciseGroup {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  records: PersonalRecord[];
  estimated1rm: number;
}

function groupByExercise(records: PersonalRecord[]): Map<string, ExerciseGroup> {
  const groups = new Map<string, ExerciseGroup>();
  for (const pr of records) {
    const existing = groups.get(pr.exercise_id);
    if (existing) {
      existing.records.push(pr);
      if (pr.estimated_1rm > existing.estimated1rm) existing.estimated1rm = pr.estimated_1rm;
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
  ) return 'today';
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 'week';
  return null;
}

const MUSCLE_GROUP_DESCRIPTIONS: Record<string, string> = {
  chest: 'UPPER BODY', back: 'UPPER BODY', shoulders: 'UPPER BODY',
  legs: 'LOWER BODY', arms: 'UPPER BODY', core: 'CORE', full_body: 'FULL BODY',
};

const REP_RANGES = [1, 2, 3, 4, 5];

const CHART_WIDTH = Dimensions.get('window').width - Spacing.md * 4;
const CHART_HEIGHT = 150;
const CHART_PAD = 28;

const REP_RANGE_COLORS: Record<number, string> = {
  1: LIME,
  3: SEMANTIC.warning,
  5: SEMANTIC.info,
  8: TEXT.secondary,
};

const REP_RANGE_LABELS: Record<number, string> = {
  1: '1RM est.', 3: '3RM', 5: '5RM', 8: '8-10RM',
};

function ProgressionLineChart({ data }: { data: ProgressionPoint[] }) {
  const [activeLines, setActiveLines] = useState<Set<number>>(new Set([1]));

  if (data.length < 2) return null;

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

  const e1rmPath = activeLines.has(1) ? buildPath(data.map(d => d.estimated1RM)) : null;
  const e1rmAreaPath = e1rmPath
    ? `${e1rmPath} L ${toPoint(data.length - 1, minY).x} ${CHART_HEIGHT - CHART_PAD} L ${CHART_PAD} ${CHART_HEIGHT - CHART_PAD} Z`
    : null;

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
        {gridLines.map((g, i) => (
          <Line key={i} x1={CHART_PAD} y1={g.y} x2={CHART_WIDTH - CHART_PAD} y2={g.y}
            stroke={ELEVATION[2].bg} strokeWidth={1} />
        ))}
        {e1rmAreaPath && <Path d={e1rmAreaPath} fill={LIME} opacity={0.08} />}
        {rrPaths.map(({ rr, path }) => (
          <Path key={rr} d={path} stroke={REP_RANGE_COLORS[rr]} strokeWidth={1.5}
            strokeDasharray="4,4" fill="none" />
        ))}
        {e1rmPath && <Path d={e1rmPath} stroke={LIME} strokeWidth={2} fill="none" />}
        {activeLines.has(1) && data.map((d, i) => {
          const p = toPoint(i, d.estimated1RM);
          const isMax = d.estimated1RM === maxY;
          return (
            <SvgCircle key={`e1rm-${i}`} cx={p.x} cy={p.y}
              r={isMax ? 5 : 3} fill={LIME} opacity={isMax ? 1 : 0.8} />
          );
        })}
      </Svg>

      <View style={{ position: 'absolute', left: 0, top: 0, height: CHART_HEIGHT }}>
        {gridLines.map((g, i) => (
          <EliteText key={i} variant="caption" style={{
            position: 'absolute', top: g.y - 6, left: 0,
            fontSize: FontSizes.xs, color: TEXT.secondary,
          }}>{g.label}</EliteText>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: CHART_PAD - 6, marginTop: 2 }}>
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <EliteText key={i} variant="caption" style={{ fontSize: FontSizes.xs, color: TEXT.secondary }}>
              {d.dateLabel}
            </EliteText>
          ) : <View key={i} />
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: Spacing.sm, flexWrap: 'wrap' }}>
        {([1, 3, 5, 8] as const).map(rr => {
          const active = activeLines.has(rr);
          const c = REP_RANGE_COLORS[rr];
          return (
            <AnimatedPressable key={rr} onPress={() => { haptic.light(); toggleLine(rr); }}
              style={[styles.togglePill, active && { borderColor: c, backgroundColor: withOpacity(c, 0.08) }]}>
              <View style={[styles.toggleDot, { backgroundColor: active ? c : TEXT.muted }]} />
              <EliteText variant="caption" style={[styles.toggleText, active && { color: c }]}>
                {REP_RANGE_LABELS[rr]}
              </EliteText>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

// === DELETE + RECALCULATE PR ===

async function recalculatePR(userId: string, exerciseId: string) {
  const { data: logs } = await supabase
    .from('exercise_logs')
    .select('weight_kg, reps, estimated_1rm, rep_range')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('estimated_1rm', { ascending: false })
    .limit(1);

  if (logs && logs.length > 0) {
    const best = logs[0];
    await supabase.from('personal_records').upsert({
      user_id: userId,
      exercise_id: exerciseId,
      estimated_1rm: best.estimated_1rm,
      weight_kg: best.weight_kg,
      rep_range: best.rep_range ?? best.reps ?? 1,
    }, { onConflict: 'user_id,exercise_id,rep_range' });
  } else {
    await supabase
      .from('personal_records')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId);
  }
}

// === PANTALLA ===

export default function FitnessStrengthScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [progressionData, setProgressionData] = useState<ProgressionPoint[]>([]);
  const [sessionHistory, setSessionHistory] = useState<ExerciseSessionEntry[]>([]);
  const [progressionLoading, setProgressionLoading] = useState(false);

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
      const data = await getPersonalRecords({ muscle_group: selectedGroup ?? undefined });
      setRecords(data);
    } catch (err) {
      if (__DEV__) console.error('Error al cargar PRs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useFocusEffect(useCallback(() => {
    loadRecords();
    getBenchmarksWithVariants().then(setBenchmarks).catch(() => {});
  }, [loadRecords]));

  const exerciseGroups = groupByExercise(records);
  const groupedEntries = Array.from(exerciseGroups.values());
  const totalPRs = records.length;

  const mostRecentPR = records.length > 0
    ? records.reduce((latest, pr) =>
        new Date(pr.achieved_at) > new Date(latest.achieved_at) ? pr : latest)
    : null;

  // Nivel de rendimiento (por # de PRs registrados — criterio existente).
  const getLevel = (count: number): string => {
    if (count >= 26) return 'ELITE';
    if (count >= 11) return 'AVANZADO';
    if (count >= 4) return 'INTERMEDIO';
    return 'PRINCIPIANTE';
  };

  const best1RM = groupedEntries.length > 0
    ? Math.round(Math.max(...groupedEntries.map(e => e.estimated1rm)))
    : 0;

  const byMuscle = new Map<string, typeof groupedEntries>();
  for (const entry of groupedEntries) {
    const mg = entry.muscleGroup || 'other';
    const existing = byMuscle.get(mg) ?? [];
    existing.push(entry);
    byMuscle.set(mg, existing);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Fuerza" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {/* ── 1. HERO — Rendimiento (protagonista) ── */}
        <Animated.View entering={FadeInDown.duration(300).springify()}>
          <LinearGradient
            colors={[PILLAR_GRADIENTS.fitness.start, PILLAR_GRADIENTS.fitness.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <EliteText variant="caption" style={styles.heroLabel}>RENDIMIENTO</EliteText>
            <View style={styles.heroLevelWrap}>
              <EliteText style={styles.heroLevel}>{getLevel(totalPRs)}</EliteText>
            </View>

            <View style={styles.heroMiniStats}>
              <View style={styles.heroMiniStatItem}>
                <EliteText style={styles.heroMiniStatValue}>{totalPRs}</EliteText>
                <EliteText variant="caption" style={styles.heroMiniStatLabel}>PRs</EliteText>
              </View>
              <View style={styles.heroMiniStatDivider} />
              <View style={styles.heroMiniStatItem}>
                <EliteText style={styles.heroMiniStatValue}>{best1RM > 0 ? `${best1RM}kg` : '—'}</EliteText>
                <EliteText variant="caption" style={styles.heroMiniStatLabel}>Mejor 1RM est.</EliteText>
              </View>
              {mostRecentPR && (
                <>
                  <View style={styles.heroMiniStatDivider} />
                  <View style={styles.heroMiniStatItem}>
                    <EliteText style={styles.heroMiniStatValue} numberOfLines={1}>
                      {mostRecentPR.weight_kg}kg
                    </EliteText>
                    <EliteText variant="caption" style={styles.heroMiniStatLabel} numberOfLines={1}>
                      Último · {mostRecentPR.exercise_name}
                    </EliteText>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── 2. BENCHMARKS ── */}
        <View style={styles.sectionHeaderRow}>
          <EliteText style={styles.sectionTitle}>BENCHMARKS</EliteText>
          <AnimatedPressable
            onPress={() => {
              haptic.light();
              Alert.alert(
                'Benchmarks',
                'Los benchmarks son los ejercicios estándar que miden tu fuerza real: tu PR en ellos es tu récord oficial. Cada uno tiene variantes (máquina, mancuernas…) con su propio récord.',
              );
            }}
            hitSlop={8}
          >
            <Ionicons name="information-circle-outline" size={17} color={TEXT.secondary} />
          </AnimatedPressable>
        </View>

        {benchmarks.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <Ionicons name="barbell-outline" size={30} color={TEXT.muted} />
            <EliteText style={styles.emptyText}>Sin benchmarks disponibles todavía.</EliteText>
          </View>
        )}

        {benchmarks.map((ex, idx) => (
          <Animated.View key={ex.id} entering={FadeInUp.delay(60 + idx * 40).springify()} style={styles.benchmarkWrap}>
            <AnimatedPressable
              onPress={() => { haptic.light(); router.push({ pathname: '/log-exercise', params: { exerciseId: ex.id } }); }}
            >
              <GradientCard gradient={PILLAR_GRADIENTS.fitness} accentColor={LIME} accentPosition="left">
                <View style={styles.benchmarkHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <EliteText style={styles.benchmarkName}>{ex.name_es}</EliteText>
                      <View style={styles.benchmarkBadge}>
                        <EliteText style={styles.benchmarkBadgeText}>BENCHMARK</EliteText>
                      </View>
                    </View>
                    {ex.muscle_groups && ex.muscle_groups.length > 0 && (
                      <EliteText style={styles.benchmarkMuscles}>
                        {ex.muscle_groups.slice(0, 3).join(' · ').toUpperCase()}
                      </EliteText>
                    )}
                    {ex.currentPR != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Ionicons name="trophy" size={14} color={SEMANTIC.acceptable} />
                        <EliteText style={{ color: SEMANTIC.acceptable, fontSize: 13, fontFamily: Fonts.bold }}>
                          {ex.currentPR}kg
                        </EliteText>
                        {ex.estimated1RM != null && (
                          <EliteText style={{ color: TEXT.secondary, fontSize: 11 }}>
                            · {ex.estimated1RM}kg 1RM
                          </EliteText>
                        )}
                      </View>
                    )}
                  </View>
                  <AnimatedPressable onPress={() => {
                    haptic.medium();
                    router.push({ pathname: '/log-exercise', params: { exerciseId: ex.id } });
                  }}>
                    <View style={styles.benchmarkAddBtn}>
                      <Ionicons name="add" size={20} color={LIME} />
                    </View>
                  </AnimatedPressable>
                </View>

                {ex.variants.length > 0 && (
                  <View style={styles.variantsRow}>
                    {ex.variants.slice(0, 5).map(v => (
                      <AnimatedPressable
                        key={v.id}
                        onPress={() => { haptic.light(); router.push({ pathname: '/log-exercise', params: { exerciseId: v.id } }); }}
                      >
                        <View style={styles.variantChip}>
                          <EliteText style={styles.variantChipText}>{v.name_es}</EliteText>
                        </View>
                      </AnimatedPressable>
                    ))}
                    {ex.variants.length > 5 && (
                      <View style={styles.variantChip}>
                        <EliteText style={styles.variantChipText}>+{ex.variants.length - 5}</EliteText>
                      </View>
                    )}
                  </View>
                )}
              </GradientCard>
            </AnimatedPressable>
          </Animated.View>
        ))}

        {/* ── 3. TUS MARCAS ── */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.lg }]}>
          <EliteText style={styles.sectionTitle}>TUS MARCAS</EliteText>
        </View>

        {/* Filtros por grupo muscular */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
          contentContainerStyle={styles.filterContent}
        >
          {[null, ...MUSCLE_GROUPS].map((item) => {
            const isSelected = selectedGroup === item;
            const label = item ? MUSCLE_GROUP_LABELS[item] : 'Todos';
            const color = item ? MUSCLE_GROUP_COLORS[item] : LIME;
            return (
              <AnimatedPressable
                key={item ?? 'all'}
                onPress={() => { haptic.light(); setSelectedGroup(item); }}
                style={[styles.filterPill, isSelected && { borderColor: color, backgroundColor: withOpacity(color, 0.08) }]}
              >
                {item != null && <View style={[styles.filterDot, { backgroundColor: color }]} />}
                <EliteText variant="caption" style={[styles.filterText, isSelected && { color }]}>
                  {label}
                </EliteText>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
            <SkeletonLoader variant="card" height={80} />
            <SkeletonLoader variant="card" height={80} />
          </View>
        ) : groupedEntries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="trophy-outline" size={40} color={TEXT.tertiary} />
            <EliteText variant="body" style={styles.emptyText}>Aún no tienes marcas personales</EliteText>
            <EliteText variant="caption" style={styles.emptySubtext}>
              Registra ejercicios con peso para generar PRs
            </EliteText>
          </View>
        ) : (
          Array.from(byMuscle.entries()).map(([muscleGroup, exercises]) => {
            const mgColor = MUSCLE_GROUP_COLORS[muscleGroup] ?? TEXT.secondary;
            const mgDesc = MUSCLE_GROUP_DESCRIPTIONS[muscleGroup] ?? '';

            return (
              <View key={muscleGroup} style={styles.muscleGroupSection}>
                <View style={styles.muscleGroupHeader}>
                  <View style={[styles.muscleGroupDot, { backgroundColor: mgColor }]} />
                  <EliteText variant="label" style={styles.muscleGroupTitle}>
                    {MUSCLE_GROUP_LABELS[muscleGroup] ?? muscleGroup}
                  </EliteText>
                  {mgDesc ? (
                    <EliteText variant="caption" style={styles.muscleGroupDesc}>{mgDesc}</EliteText>
                  ) : null}
                </View>

                {exercises.map((entry) => {
                  const prMap = new Map<number, PersonalRecord>();
                  for (const pr of entry.records) prMap.set(pr.rep_range, pr);

                  const bestPRRange = entry.records.reduce((best, pr) =>
                    pr.weight_kg > (best?.weight_kg ?? 0) ? pr : best
                  ).rep_range;

                  const expanded = selectedExerciseId === entry.exerciseId;

                  return (
                    <AnimatedPressable
                      key={entry.exerciseId}
                      onPress={() => {
                        haptic.light();
                        setSelectedExerciseId(expanded ? null : entry.exerciseId);
                      }}
                      onLongPress={() => {
                        haptic.heavy();
                        const bestPR = entry.records.reduce((best, pr) =>
                          pr.estimated_1rm > (best?.estimated_1rm ?? 0) ? pr : best
                        );
                        Alert.alert(
                          'Eliminar récord',
                          `¿Eliminar PRs de ${entry.exerciseName}?\n${bestPR.weight_kg}kg × ${bestPR.rep_range} rep${bestPR.rep_range > 1 ? 's' : ''} = ${Math.round(bestPR.estimated_1rm)}kg 1RM`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Eliminar',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  if (!user) return;
                                  await supabase.from('personal_records').delete()
                                    .eq('user_id', user.id).eq('exercise_id', entry.exerciseId);
                                  await recalculatePR(user.id, entry.exerciseId);
                                  haptic.success();
                                  loadRecords();
                                } catch { /* silenciar */ }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <View style={styles.exerciseCard}>
                        <View style={styles.exerciseHeader}>
                          <EliteText variant="body" style={styles.exerciseName} numberOfLines={1}>
                            {entry.exerciseName}
                          </EliteText>
                          <EliteText variant="caption" style={styles.estimated1rm}>
                            Máximo estimado: {Math.round(entry.estimated1rm)}kg
                          </EliteText>
                        </View>

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
                                    isBestRange ? { backgroundColor: withOpacity(mgColor, 0.08), borderRadius: Radius.sm } : null,
                                  ]}
                                >
                                  {pr ? (
                                    <>
                                      <EliteText variant="body" style={[
                                        styles.repRangeValue,
                                        isBestRange ? { color: mgColor } : null,
                                      ]}>
                                        {pr.weight_kg}kg
                                      </EliteText>
                                      {recency === 'today' && (
                                        <View style={styles.recencyBadge}>
                                          <EliteText variant="caption" style={styles.recencyBadgeText}>HOY</EliteText>
                                        </View>
                                      )}
                                      {recency === 'week' && (
                                        <View style={[styles.recencyBadge, styles.recencyWeek]}>
                                          <EliteText variant="caption" style={[styles.recencyBadgeText, styles.recencyWeekText]}>PR!</EliteText>
                                        </View>
                                      )}
                                    </>
                                  ) : (
                                    <EliteText variant="body" style={styles.repRangeEmpty}>—</EliteText>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>

                        {expanded && (
                          <View style={styles.progressionContainer}>
                            <EliteText variant="caption" style={styles.progressionLabel}>
                              PROGRESIÓN DE PESO
                            </EliteText>
                            {progressionLoading ? (
                              <ActivityIndicator color={LIME} style={{ marginVertical: Spacing.md }} />
                            ) : progressionData.length < 2 ? (
                              <View style={styles.progressionEmptyBox}>
                                <Ionicons name="barbell-outline" size={28} color={TEXT.secondary} />
                                <EliteText variant="caption" style={styles.progressionEmpty}>
                                  Entrena más para ver tu progresión
                                </EliteText>
                              </View>
                            ) : (
                              <ProgressionLineChart data={progressionData} />
                            )}

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
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            );
          })
        )}

        {groupedEntries.length > 0 && (
          <EliteText variant="caption" style={styles.hintText}>
            Toca una marca para ver su progresión · mantén presionado para eliminar
          </EliteText>
        )}
      </ScrollView>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },

  // Hero
  heroCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)', letterSpacing: 3, fontSize: 10,
    fontFamily: Fonts.bold, marginBottom: Spacing.xs,
  },
  heroLevelWrap: { alignSelf: 'flex-start', ...GLOW.accent },
  heroLevel: {
    fontSize: 34, fontFamily: Fonts.extraBold, color: ATP_BRAND.lime, letterSpacing: 3,
  },
  heroMiniStats: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  heroMiniStatItem: { flex: 1, alignItems: 'flex-start' },
  heroMiniStatValue: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: TEXT.primary, fontVariant: ['tabular-nums'] },
  heroMiniStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.xs, letterSpacing: 0.5, marginTop: 2 },
  heroMiniStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: Spacing.md },

  // Secciones
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 11, fontFamily: Fonts.bold, color: TEXT.secondary, letterSpacing: 2,
  },

  // Benchmarks
  benchmarkWrap: { marginBottom: Spacing.sm, paddingHorizontal: Spacing.md },
  benchmarkHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm,
  },
  benchmarkName: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: TEXT.primary },
  benchmarkBadge: {
    backgroundColor: SEMANTIC.acceptable, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  benchmarkBadgeText: { color: ELEVATION[0].bg, fontSize: 9, fontFamily: Fonts.extraBold, letterSpacing: 0.5 },
  benchmarkMuscles: {
    fontSize: 9, fontFamily: Fonts.semiBold, color: TEXT.secondary, letterSpacing: 1, marginTop: 2,
  },
  benchmarkAddBtn: {
    backgroundColor: withOpacity(LIME, 0.15), borderRadius: 12, padding: 10,
  },
  variantsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  variantChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill,
    backgroundColor: withOpacity(LIME, 0.1),
  },
  variantChipText: { fontSize: 10, fontFamily: Fonts.semiBold, color: LIME },

  // Filtros
  filterList: { flexGrow: 0, marginBottom: Spacing.md },
  filterContent: { paddingHorizontal: Spacing.md, gap: Spacing.xs, alignItems: 'center' },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 48,
    paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  emptyText: { color: TEXT.secondary, textAlign: 'center' },
  emptySubtext: { color: TEXT.tertiary, fontSize: FontSizes.sm, textAlign: 'center' },

  // Grupos musculares
  muscleGroupSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  muscleGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  muscleGroupDot: { width: 10, height: 10, borderRadius: 5 },
  muscleGroupTitle: { letterSpacing: 2, fontSize: FontSizes.md, fontFamily: Fonts.bold },
  muscleGroupDesc: { color: TEXT.secondary, fontSize: FontSizes.xs, letterSpacing: 1, opacity: 0.6 },

  // Card de ejercicio
  exerciseCard: {
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  exerciseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm,
  },
  exerciseName: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, flex: 1 },
  estimated1rm: { color: LIME, fontFamily: Fonts.bold, fontSize: FontSizes.sm },

  // Tabla de rep ranges
  repRangeTable: { gap: Spacing.xs },
  repRangeRow: { flexDirection: 'row', gap: Spacing.xs },
  repRangeCell: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: Radius.sm },
  repRangeHeader: {
    color: TEXT.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 0.5,
  },
  repRangeValue: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: TEXT.primary },
  repRangeEmpty: { color: TEXT.muted, fontSize: FontSizes.md },

  // Recencia
  recencyBadge: {
    backgroundColor: withOpacity(LIME, 0.15), paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: Radius.pill, marginTop: 2,
  },
  recencyBadgeText: { color: LIME, fontSize: FontSizes.xs, fontFamily: Fonts.bold },
  recencyWeek: { backgroundColor: withOpacity(SEMANTIC.info, 0.15) },
  recencyWeekText: { color: SEMANTIC.info },

  // Progresión
  progressionContainer: {
    marginTop: Spacing.md, paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ELEVATION[1].border,
  },
  progressionLabel: {
    color: TEXT.secondary, letterSpacing: 2, fontSize: FontSizes.xs,
    fontFamily: Fonts.bold, marginBottom: Spacing.sm,
  },
  progressionEmptyBox: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  progressionEmpty: { color: TEXT.secondary, fontSize: FontSizes.sm, textAlign: 'center' },

  // Toggles del chart
  togglePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  toggleDot: { width: 6, height: 6, borderRadius: 3 },
  toggleText: { color: TEXT.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  // Historial
  sessionHistSection: { marginTop: Spacing.md },
  sessionHistCard: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ELEVATION[1].border,
  },
  sessionHistHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  sessionHistDate: { color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  sessionHist1RM: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  sessionHistSet: { color: TEXT.secondary, fontSize: FontSizes.xs, paddingLeft: Spacing.sm, lineHeight: 16 },

  hintText: {
    color: TEXT.muted, fontSize: 10, textAlign: 'center', marginTop: Spacing.xs, paddingHorizontal: Spacing.md,
  },
});
