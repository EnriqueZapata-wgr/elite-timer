/**
 * HOY — Timeline diario del protocolo del usuario.
 *
 * Muestra las actividades del día hora por hora con checkboxes,
 * stats de completados y barra de progreso.
 * Si no hay protocolo asignado, muestra el estado vacío con rutinas programadas.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/GradientCard';
import { Colors, Spacing, Fonts, Radius } from '@/constants/theme';
import {
  getTodayTimeline,
  toggleCompletion,
  getCompletionStats,
  CATEGORY_CONFIG,
  type TimelineItem,
} from '@/src/services/protocol-service';
import { getWeeklyStats, type WeeklyStats } from '@/src/services/exercise-service';

// === HELPERS ===

const DAY_NAMES = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function formatTodayHeader(): string {
  const now = new Date();
  return `${DAY_NAMES[now.getDay()]} ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
}

/** Formatea "HH:MM:SS" o "HH:MM" a "5:30 AM" */
function formatTime(timeStr: string): string {
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/** Determina si un item ya pasó según la hora */
function isPast(timeStr: string): boolean {
  const now = new Date();
  const parts = timeStr.split(':');
  const itemMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > itemMinutes;
}

// === COMPONENTE PRINCIPAL ===

export default function TodayScreen() {
  const router = useRouter();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [weekStats, setWeekStats] = useState<WeeklyStats>({
    workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        try {
          const [items, stats] = await Promise.all([
            getTodayTimeline().catch(() => []),
            getWeeklyStats().catch(() => ({ workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0 })),
          ]);
          if (!cancelled) {
            setTimeline(items);
            setWeekStats(stats);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [])
  );

  const handleToggle = async (itemId: string) => {
    setToggling(itemId);
    try {
      const newState = await toggleCompletion(itemId);
      setTimeline(prev => prev.map(item =>
        item.item_id === itemId
          ? { ...item, is_completed: newState, completed_at: newState ? new Date().toISOString() : null }
          : item
      ));
    } catch { /* silenciar */ }
    setToggling(null);
  };

  const handleItemPress = (item: TimelineItem) => {
    if (item.link_type === 'routine' && item.link_routine_id) {
      router.push({ pathname: '/execution' as any, params: { routineId: item.link_routine_id } });
    }
  };

  const completionStats = getCompletionStats(timeline);
  const hasTimeline = timeline.length > 0;

  return (
    <ScreenContainer centered={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <EliteText variant="caption" style={styles.dateLabel}>
                {formatTodayHeader()}
              </EliteText>
              <EliteText style={styles.heroTitle}>Tu día</EliteText>
            </View>
            <AnimatedPressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
        ) : hasTimeline ? (
          <>
            {/* ── Progress bar ── */}
            <Animated.View entering={FadeInUp.delay(100).springify()}>
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <EliteText variant="body" style={styles.progressText}>
                    <EliteText style={styles.progressCount}>{completionStats.completed}</EliteText>
                    /{completionStats.total} completados
                  </EliteText>
                  <EliteText variant="caption" style={styles.progressPercent}>
                    {completionStats.percentage}%
                  </EliteText>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${completionStats.percentage}%` }]} />
                </View>
              </View>
            </Animated.View>

            {/* ── Weekly stats pills ── */}
            <Animated.View entering={FadeInUp.delay(150).springify()}>
              <View style={styles.weekPills}>
                <View style={styles.weekPill}>
                  <Ionicons name="barbell-outline" size={14} color={Colors.neonGreen} />
                  <EliteText variant="caption" style={styles.weekPillText}>
                    {weekStats.workouts} entrenos
                  </EliteText>
                </View>
                <View style={styles.weekPill}>
                  <Ionicons name="trending-up-outline" size={14} color="#5B9BD5" />
                  <EliteText variant="caption" style={styles.weekPillText}>
                    {weekStats.volumeKg > 999 ? `${Math.round(weekStats.volumeKg / 1000)}k` : `${weekStats.volumeKg}kg`}
                  </EliteText>
                </View>
                <View style={styles.weekPill}>
                  <Ionicons name="trophy-outline" size={14} color="#EF9F27" />
                  <EliteText variant="caption" style={styles.weekPillText}>
                    {weekStats.prs} PRs
                  </EliteText>
                </View>
              </View>
            </Animated.View>

            {/* ── Timeline ── */}
            <View style={styles.timeline}>
              {timeline.map((item, idx) => {
                const catConfig = CATEGORY_CONFIG[item.category] ?? { label: item.category, icon: 'ellipse-outline' };
                const past = isPast(item.scheduled_time);
                const isTogglingThis = toggling === item.item_id;
                const accentColor = item.accent_color || Colors.neonGreen;

                return (
                  <Animated.View
                    key={item.item_id}
                    entering={FadeInUp.delay(200 + idx * 30).springify()}
                  >
                    <View style={styles.timelineRow}>
                      {/* Hora */}
                      <View style={styles.timeCol}>
                        <EliteText variant="caption" style={[
                          styles.timeText,
                          item.is_completed && { color: Colors.neonGreen },
                        ]}>
                          {formatTime(item.scheduled_time)}
                        </EliteText>
                      </View>

                      {/* Línea vertical + dot */}
                      <View style={styles.lineCol}>
                        {idx > 0 && <View style={styles.lineSegment} />}
                        <View style={[
                          styles.dot,
                          { backgroundColor: item.is_completed ? Colors.neonGreen : (past ? '#333' : accentColor + '40') },
                          item.is_completed && { borderColor: Colors.neonGreen },
                        ]}>
                          {item.is_completed && (
                            <Ionicons name="checkmark" size={10} color={Colors.black} />
                          )}
                        </View>
                        {idx < timeline.length - 1 && <View style={styles.lineSegmentBottom} />}
                      </View>

                      {/* Card */}
                      <GradientCard
                        color={accentColor}
                        onPress={() => handleItemPress(item)}
                        style={[
                          styles.card,
                          item.is_completed && styles.cardCompleted,
                        ]}
                      >
                        <View style={styles.cardInner}>
                          <View style={styles.cardBody}>
                            <View style={styles.cardTopRow}>
                              <View style={[styles.categoryBadge, { backgroundColor: accentColor + '20' }]}>
                                <Ionicons name={catConfig.icon as any} size={12} color={accentColor} />
                                <EliteText variant="caption" style={[styles.categoryText, { color: accentColor }]}>
                                  {catConfig.label}
                                </EliteText>
                              </View>
                              {item.duration_minutes && (
                                <EliteText variant="caption" style={styles.durationText}>
                                  {item.duration_minutes} min
                                </EliteText>
                              )}
                            </View>

                            <EliteText variant="body" style={[
                              styles.cardTitle,
                              item.is_completed && styles.cardTitleCompleted,
                            ]}>
                              {item.title}
                            </EliteText>

                            {item.description && (
                              <EliteText variant="caption" style={styles.cardDesc} numberOfLines={2}>
                                {item.description}
                              </EliteText>
                            )}
                          </View>

                          <Pressable
                            onPress={() => handleToggle(item.item_id)}
                            disabled={isTogglingThis}
                            style={styles.checkArea}
                            hitSlop={12}
                          >
                            <View style={[
                              styles.checkbox,
                              item.is_completed && styles.checkboxChecked,
                            ]}>
                              {isTogglingThis ? (
                                <ActivityIndicator size="small" color={Colors.neonGreen} />
                              ) : item.is_completed ? (
                                <Ionicons name="checkmark" size={16} color={Colors.black} />
                              ) : null}
                            </View>
                          </Pressable>
                        </View>
                      </GradientCard>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </>
        ) : (
          /* ── Estado vacío (sin protocolo) ── */
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textSecondary} />
              <EliteText variant="body" style={styles.emptyTitle}>
                Sin protocolo asignado
              </EliteText>
              <EliteText variant="caption" style={styles.emptySubtitle}>
                Tu coach puede asignarte un protocolo diario, o puedes entrenar directamente
              </EliteText>
              <View style={styles.emptyActions}>
                <AnimatedPressable
                  onPress={() => router.push('/(tabs)/biblioteca' as any)}
                  style={styles.emptyBtn}
                >
                  <Ionicons name="flash" size={18} color={Colors.neonGreen} />
                  <EliteText variant="caption" style={styles.emptyBtnText}>Entrenar</EliteText>
                </AnimatedPressable>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {},
  dateLabel: {
    color: Colors.neonGreen,
    letterSpacing: 4,
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  settingsBtn: { padding: Spacing.sm },
  loader: { marginTop: Spacing.xxl },

  // Progress
  progressSection: { marginBottom: Spacing.md },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressText: { color: Colors.textSecondary, fontSize: 13 },
  progressCount: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: 13 },
  progressPercent: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  progressBar: {
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: 2,
  },

  // Week pills
  weekPills: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  weekPillText: { color: Colors.textSecondary, fontSize: 12, fontFamily: Fonts.semiBold },

  // Timeline
  timeline: { paddingBottom: Spacing.lg },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 80,
  },

  // Time column
  timeCol: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: Spacing.sm,
    paddingTop: 14,
  },
  timeText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },

  // Line column
  lineCol: {
    width: 24,
    alignItems: 'center',
  },
  lineSegment: {
    width: 1.5,
    height: 14,
    backgroundColor: '#1a1a1a',
  },
  lineSegmentBottom: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },

  // Card
  card: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardCompleted: {
    opacity: 0.55,
  },
  cardInner: {
    flexDirection: 'row',
  },
  cardBody: {
    flex: 1,
    padding: Spacing.sm + 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  durationText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.semiBold,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },

  // Checkbox
  checkArea: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.neonGreen,
    borderColor: Colors.neonGreen,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.neonGreen + '40',
    backgroundColor: Colors.neonGreen + '10',
  },
  emptyBtnText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },
});
