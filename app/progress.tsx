/**
 * Mi Progreso — Resumen mensual, gráficas de frecuencia/volumen semanal,
 * y lista de PRs recientes.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { formatTime } from '@/src/engine/helpers';
import { Colors, Fonts, Spacing, FontSizes, Radius } from '@/constants/theme';
import { MUSCLE_GROUP_COLORS } from '@/src/types/exercise';
import {
  getMonthlyStats,
  getWeeklyFrequencyChart,
  getWeeklyVolumeChart,
  getRecentPRsList,
  type MonthlyStats,
  type WeekChartData,
} from '@/src/services/exercise-service';
import type { PersonalRecord } from '@/src/types/exercise';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// === BAR CHART COMPONENT ===

function BarChart({ data, color, height = 120 }: {
  data: WeekChartData[];
  color: string;
  height?: number;
}) {
  const maxVal = Math.max(1, ...data.map(d => d.value));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 4 }}>
      {data.map((item, i) => {
        const barHeight = item.value > 0
          ? Math.max(4, (item.value / maxVal) * (height - 24))
          : 0;

        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {item.value > 0 && (
              <EliteText variant="caption" style={{ fontSize: 9, color: Colors.textSecondary, marginBottom: 2 }}>
                {item.value > 999 ? `${Math.round(item.value / 1000)}k` : item.value}
              </EliteText>
            )}
            <View style={{
              width: '75%',
              height: barHeight,
              backgroundColor: item.isCurrent ? color : color + '50',
              borderRadius: 3,
            }} />
            <EliteText variant="caption" style={{ fontSize: 8, color: Colors.textSecondary, marginTop: 3 }}>
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

// === SCREEN ===

export default function ProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null);
  const [freqChart, setFreqChart] = useState<WeekChartData[]>([]);
  const [volChart, setVolChart] = useState<WeekChartData[]>([]);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [m, f, v, p] = await Promise.all([
        getMonthlyStats(),
        getWeeklyFrequencyChart(8),
        getWeeklyVolumeChart(8),
        getRecentPRsList(10),
      ]);
      setMonthly(m);
      setFreqChart(f);
      setVolChart(v);
      setRecentPRs(p);
    } catch { /* silencioso */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.neonGreen} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title" style={styles.headerTitle}>MI PROGRESO</EliteText>
      </View>

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
                    : monthly?.volumeKg ?? 0}kg
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
              <BarChart data={volChart} color="#EF9F27" />
            ) : (
              <View style={styles.chartEmpty}>
                <EliteText variant="caption" style={{ color: Colors.textSecondary }}>
                  Sin datos suficientes
                </EliteText>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── Sección 4: PRs recientes ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
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
            recentPRs.map((pr, i) => {
              const mgColor = MUSCLE_GROUP_COLORS[pr.muscle_group ?? ''] ?? '#888';
              return (
                <Pressable key={pr.id} onPress={() => router.push('/personal-records')}>
                  <View style={styles.prRow}>
                    <View style={[styles.prDot, { backgroundColor: mgColor }]} />
                    <View style={styles.prContent}>
                      <EliteText variant="body" style={styles.prName} numberOfLines={1}>
                        {pr.exercise_name}
                      </EliteText>
                      <EliteText variant="caption" style={styles.prMeta}>
                        {formatRelativeDate(pr.achieved_at)} · {pr.weight_kg}kg × {pr.rep_range} rep{pr.rep_range > 1 ? 's' : ''}
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
            })
          )}
        </Animated.View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
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
    backgroundColor: '#1D9E75',
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  heroWatermark: {
    position: 'absolute',
    top: -10,
    right: -5,
    fontSize: 60,
    opacity: 0.06,
  },
  heroLabel: {
    color: Colors.textSecondary,
    letterSpacing: 3,
    fontSize: 12,
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
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  heroStatLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2a2a2a',
  },

  // Chart cards
  chartCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  chartLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: 11,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  chartSublabel: {
    color: Colors.textSecondary,
    fontSize: 10,
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
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  sectionLink: {
    color: Colors.neonGreen,
    fontSize: 12,
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
    borderBottomColor: '#1a1a1a',
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
    fontSize: 14,
  },
  prMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
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
    fontSize: 10,
  },
});
