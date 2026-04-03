/**
 * Mi Progreso — Resumen mensual, gráficas de frecuencia/volumen semanal,
 * y lista de PRs recientes.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { formatTime } from '@/src/engine/helpers';
import { Colors, Fonts, Spacing, FontSizes, Radius } from '@/constants/theme';
import { CATEGORY_COLORS, SEMANTIC } from '@/src/constants/brand';
import { MUSCLE_GROUP_COLORS } from '@/src/types/exercise';
import {
  getMonthlyStats,
  getWeeklyFrequencyChart,
  getWeeklyVolumeChart,
  getRecentPRsList,
  getTopExercises,
  type MonthlyStats,
  type WeekChartData,
  type TopExercise,
} from '@/src/services/exercise-service';
import { MUSCLE_GROUP_LABELS } from '@/src/types/exercise';
import type { PersonalRecord } from '@/src/types/exercise';
import Svg, { Polyline } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// === BAR CHART COMPONENT ===

function BarChart({ data: rawData, color, height = 120 }: {
  data: WeekChartData[];
  color: string;
  height?: number;
}) {
  // Si hay datos en pocas semanas, mostrar solo las que tienen datos + 1 vacía a cada lado
  const hasData = rawData.some(d => d.value > 0);
  let data = rawData;
  if (hasData) {
    const firstIdx = rawData.findIndex(d => d.value > 0);
    const lastIdx = rawData.length - 1 - [...rawData].reverse().findIndex(d => d.value > 0);
    const start = Math.max(0, firstIdx - 1);
    const end = Math.min(rawData.length - 1, lastIdx + 1);
    data = rawData.slice(start, end + 1);
  }

  const maxVal = Math.max(1, ...data.map(d => d.value));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 4 }}>
      {data.map((item, i) => {
        const barHeight = item.value > 0
          ? Math.max(6, (item.value / maxVal) * (height - 28))
          : 0;

        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <EliteText variant="caption" style={{
              fontSize: FontSizes.xs, fontFamily: Fonts.bold, marginBottom: 2,
              color: item.value > 0 ? (item.isCurrent ? color : Colors.textSecondary) : 'transparent',
            }}>
              {item.value > 999 ? `${Math.round(item.value / 1000)}k` : item.value}
            </EliteText>
            <View style={{
              width: '70%',
              height: barHeight,
              backgroundColor: item.isCurrent ? color : color + '50',
              borderRadius: 4,
              minHeight: item.value > 0 ? 6 : 2,
            }} />
            {item.value === 0 && <View style={{ width: '70%', height: 2, backgroundColor: Colors.surfaceLight, borderRadius: 1 }} />}
            <EliteText variant="caption" style={{ fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 4 }}>
              {item.label}
            </EliteText>
          </View>
        );
      })}
    </View>
  );
}

// === FORMAT HELPERS ===

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
  return `${m}m`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

// === MINI SPARKLINE ===

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const w = 50;
  const h = 20;
  const maxV = Math.max(...points);
  const minV = Math.min(...points);
  const range = maxV - minV || 1;

  const svgPoints = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - minV) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={w} height={h} style={{ marginRight: 6 }}>
      <Polyline points={svgPoints} stroke={color} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

// === SCREEN ===

export default function ProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null);
  const [freqChart, setFreqChart] = useState<WeekChartData[]>([]);
  const [volChart, setVolChart] = useState<WeekChartData[]>([]);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);
  const [topExercises, setTopExercises] = useState<TopExercise[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [m, f, v, p, t] = await Promise.all([
        getMonthlyStats(),
        getWeeklyFrequencyChart(8),
        getWeeklyVolumeChart(8),
        getRecentPRsList(10),
        getTopExercises(5),
      ]);
      setMonthly(m);
      setFreqChart(f);
      setVolChart(v);
      setRecentPRs(p);
      setTopExercises(t);
    } catch { /* silencioso */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ScreenHeader title="Progreso" />
        <ActivityIndicator size="large" color={Colors.neonGreen} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <ScreenHeader title="Progreso" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Sección 1: Resumen del mes ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <LinearGradient colors={['#0a2a2a', '#0a1a1a']} style={styles.heroCard}>
            <View style={styles.heroAccent} />
            <EliteText style={styles.heroWatermark}>📊</EliteText>

            <EliteText variant="caption" style={styles.heroLabel}>
              {monthly?.monthLabel ?? ''}
            </EliteText>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <EliteText style={styles.heroStatNum}>{monthly?.workouts ?? 0}</EliteText>
                <EliteText variant="caption" style={styles.heroStatLabel}>entrenos</EliteText>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <EliteText style={styles.heroStatNum}>{formatHours(monthly?.totalSeconds ?? 0)}</EliteText>
                <EliteText variant="caption" style={styles.heroStatLabel}>horas</EliteText>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <EliteText style={styles.heroStatNum}>
                  {(monthly?.volumeKg ?? 0) > 999
                    ? `${Math.round((monthly?.volumeKg ?? 0) / 1000)}k`
                    : `${monthly?.volumeKg ?? 0}kg`}
                </EliteText>
                <EliteText variant="caption" style={styles.heroStatLabel}>volumen</EliteText>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <EliteText style={styles.heroStatNum}>{monthly?.prs ?? 0}</EliteText>
                <EliteText variant="caption" style={styles.heroStatLabel}>PRs</EliteText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Sección 2: Frecuencia semanal ── */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <LinearGradient colors={['#1a2a1a', '#111111']} style={styles.chartCard}>
            <EliteText variant="caption" style={styles.chartLabel}>FRECUENCIA SEMANAL</EliteText>
            <EliteText variant="caption" style={styles.chartSublabel}>Sesiones por semana · 8 semanas</EliteText>
            {freqChart.length > 0 ? (
              <BarChart data={freqChart} color={Colors.neonGreen} />
            ) : (
              <View style={styles.chartEmpty}>
                <EliteText variant="caption" style={{ color: Colors.textSecondary }}>
                  Sin datos suficientes
                </EliteText>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── Sección 3: Volumen semanal ── */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <LinearGradient colors={['#2a1f0a', '#111111']} style={styles.chartCard}>
            <EliteText variant="caption" style={styles.chartLabel}>VOLUMEN SEMANAL</EliteText>
            <EliteText variant="caption" style={styles.chartSublabel}>kg totales por semana · 8 semanas</EliteText>
            {volChart.length > 0 ? (
              <BarChart data={volChart} color={SEMANTIC.warning} />
            ) : (
              <View style={styles.chartEmpty}>
                <EliteText variant="caption" style={{ color: Colors.textSecondary }}>
                  Sin datos suficientes
                </EliteText>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── Sección 4: Ejercicios más trabajados ── */}
        {topExercises.length > 0 && (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <EliteText variant="caption" style={[styles.sectionLabel, { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }]}>
              MÁS TRABAJADOS ESTE MES
            </EliteText>
            {topExercises.map((ex, i) => {
              const mgColor = MUSCLE_GROUP_COLORS[ex.muscleGroup] ?? Colors.textSecondary;
              const trendIcon = ex.trend === 'up' ? 'arrow-up' : ex.trend === 'down' ? 'arrow-down' : 'remove';
              const trendColor = ex.trend === 'up' ? Colors.neonGreen : ex.trend === 'down' ? SEMANTIC.error : Colors.textSecondary;

              return (
                <Pressable key={ex.exerciseId} onPress={() => router.push('/personal-records')}>
                  <View style={styles.topExRow}>
                    <EliteText variant="caption" style={styles.topExRank}>{i + 1}</EliteText>
                    <View style={[styles.topExDot, { backgroundColor: mgColor }]} />
                    <View style={styles.topExContent}>
                      <EliteText variant="body" style={styles.topExName} numberOfLines={1}>
                        {ex.exerciseName}
                      </EliteText>
                      <EliteText variant="caption" style={styles.topExMeta}>
                        {ex.totalSets} sets · {Math.round(ex.latestEstimated1RM)}kg 1RM
                      </EliteText>
                    </View>
                    {/* Mini sparkline */}
                    {ex.last5Points.length >= 2 && (
                      <MiniSparkline points={ex.last5Points} color={mgColor} />
                    )}
                    <Ionicons name={trendIcon as any} size={14} color={trendColor} />
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        )}

        {/* ── Sección 5: PRs recientes agrupados por día ── */}
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <View style={styles.sectionHeader}>
            <EliteText variant="caption" style={styles.sectionLabel}>PRs RECIENTES</EliteText>
            <Pressable onPress={() => router.push('/personal-records')}>
              <EliteText variant="caption" style={styles.sectionLink}>Ver todos ›</EliteText>
            </Pressable>
          </View>

          {recentPRs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={32} color={Colors.textSecondary} />
              <EliteText variant="caption" style={{ color: Colors.textSecondary, marginTop: Spacing.sm }}>
                Aún no tienes records. ¡A entrenar!
              </EliteText>
            </View>
          ) : (
            (() => {
              // Agrupar PRs por día
              const grouped = new Map<string, PersonalRecord[]>();
              for (const pr of recentPRs) {
                const dayLabel = formatRelativeDate(pr.achieved_at);
                const existing = grouped.get(dayLabel) ?? [];
                existing.push(pr);
                grouped.set(dayLabel, existing);
              }

              return Array.from(grouped.entries()).map(([dayLabel, prs]) => (
                <View key={dayLabel} style={styles.prDayGroup}>
                  <EliteText variant="caption" style={styles.prDayLabel}>{dayLabel}</EliteText>
                  {prs.map(pr => {
                    const mgColor = MUSCLE_GROUP_COLORS[pr.muscle_group ?? ''] ?? Colors.textSecondary;
                    return (
                      <Pressable key={pr.id} onPress={() => router.push('/personal-records')}>
                        <View style={styles.prRow}>
                          <View style={[styles.prDot, { backgroundColor: mgColor }]} />
                          <View style={styles.prContent}>
                            <EliteText variant="body" style={styles.prName} numberOfLines={1}>
                              {pr.exercise_name}
                            </EliteText>
                            <EliteText variant="caption" style={styles.prMeta}>
                              {pr.weight_kg}kg × {pr.rep_range} rep{pr.rep_range > 1 ? 's' : ''}
                            </EliteText>
                          </View>
                          <View style={styles.prBadge}>
                            <EliteText variant="caption" style={styles.prBadgeText}>
                              {pr.rep_range}RM
                            </EliteText>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ));
            })()
          )}
        </Animated.View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, letterSpacing: 3 },

  // Hero card
  heroCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 6,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#1a3a3a',
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: CATEGORY_COLORS.metrics,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  heroWatermark: {
    position: 'absolute',
    top: -10,
    right: -5,
    fontSize: FontSizes.timer,
    opacity: 0.06,
  },
  heroLabel: {
    color: Colors.textSecondary,
    letterSpacing: 3,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    marginBottom: Spacing.md,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNum: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  heroStatLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },

  // Chart cards
  chartCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  chartLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  chartSublabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.md,
    opacity: 0.6,
  },
  chartEmpty: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
  },
  sectionLink: {
    color: Colors.neonGreen,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  // PR rows
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  prDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  prContent: {
    flex: 1,
  },
  prName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  prMeta: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  prBadge: {
    backgroundColor: Colors.neonGreen + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  prBadgeText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
  },

  // Top exercises
  topExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  topExRank: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    width: 16,
    textAlign: 'center',
  },
  topExDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topExContent: {
    flex: 1,
  },
  topExName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  topExMeta: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 1,
  },

  // PR day groups
  prDayGroup: {
    marginBottom: Spacing.sm,
  },
  prDayLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
    fontSize: FontSizes.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
  },
});
