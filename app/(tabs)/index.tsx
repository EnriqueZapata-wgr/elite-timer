/**
 * HOY — Pantalla principal con rutinas programadas para hoy,
 * stats de la semana y actividad reciente.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Colors, Spacing, Fonts, Radius } from '@/constants/theme';
import { getWeeklyStats, type WeeklyStats } from '@/src/services/exercise-service';
import { getTodayRoutines, getRecentSessions, type TodayRoutine } from '@/src/services/schedule-service';
import { getRoutine } from '@/src/services/routine-service';

// === HELPERS ===

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatTodayDate(): string {
  const now = new Date();
  return `${DAY_NAMES[now.getDay()]} ${now.getDate()} de ${MONTH_NAMES[now.getMonth()]}`;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

// === COMPONENTE ===

export default function TodayScreen() {
  const router = useRouter();
  const [todayRoutines, setTodayRoutines] = useState<TodayRoutine[]>([]);
  const [weekStats, setWeekStats] = useState<WeeklyStats>({
    workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0,
  });
  const [recentSessions, setRecentSessions] = useState<{
    date: string; exercises: number; sets: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        try {
          const [routines, stats, sessions] = await Promise.all([
            getTodayRoutines().catch(() => [] as TodayRoutine[]),
            getWeeklyStats().catch(() => ({ workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0 })),
            getRecentSessions(3).catch(() => []),
          ]);
          if (!cancelled) {
            setTodayRoutines(routines);
            setWeekStats(stats);
            setRecentSessions(sessions);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [])
  );

  /** Navega a la ejecución de una rutina programada */
  const handlePlay = async (tr: TodayRoutine) => {
    try {
      const routine = await getRoutine(tr.routine_id);
      if (!routine) return;
      const target = routine.mode === 'routine' ? '/routine-execution' : '/execution';
      router.push({
        pathname: target as any,
        params: { routine: JSON.stringify(routine) },
      });
    } catch { /* silenciar */ }
  };

  const hasRoutines = todayRoutines.length > 0;

  return (
    <ScreenContainer centered={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={styles.header}>
            <View>
              <EliteText variant="title" style={styles.title}>HOY</EliteText>
              <EliteText variant="caption" style={styles.dateText}>
                {formatTodayDate()}
              </EliteText>
            </View>
            <AnimatedPressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
        ) : (
          <>
            {/* ── Hero: Rutinas de hoy ── */}
            <Animated.View entering={FadeInUp.delay(100).springify()}>
              {hasRoutines ? (
                <View>
                  <EliteText variant="caption" style={styles.sectionLabel}>
                    TU ENTRENAMIENTO
                  </EliteText>
                  {todayRoutines.map((tr, idx) => (
                    <AnimatedPressable key={tr.routine_id} onPress={() => handlePlay(tr)}>
                      <LinearGradient
                        colors={tr.routine_mode === 'timer'
                          ? ['#1a2a1a', '#0a1a0a'] as const
                          : ['#1a1a2a', '#0a0a1a'] as const}
                        style={styles.routineCard}
                      >
                        {/* Accent izquierdo */}
                        <View style={[
                          styles.routineAccent,
                          { backgroundColor: tr.routine_mode === 'timer' ? Colors.neonGreen : '#7F77DD' },
                        ]} />

                        <View style={styles.routineBody}>
                          {/* Badge modo */}
                          <View style={[
                            styles.modeBadge,
                            {
                              backgroundColor: (tr.routine_mode === 'timer' ? Colors.neonGreen : '#7F77DD') + '20',
                              borderColor: (tr.routine_mode === 'timer' ? Colors.neonGreen : '#7F77DD') + '40',
                            },
                          ]}>
                            <EliteText variant="caption" style={[
                              styles.modeBadgeText,
                              { color: tr.routine_mode === 'timer' ? Colors.neonGreen : '#7F77DD' },
                            ]}>
                              {tr.routine_mode === 'timer' ? 'TIMER' : 'RUTINA'}
                            </EliteText>
                          </View>

                          <EliteText variant="subtitle" style={styles.routineName} numberOfLines={2}>
                            {tr.routine_name}
                          </EliteText>

                          {tr.assigned_by_name && (
                            <View style={styles.coachBadge}>
                              <Ionicons name="person-outline" size={12} color="#EF9F27" />
                              <EliteText variant="caption" style={styles.coachText}>
                                {tr.assigned_by_name}
                              </EliteText>
                            </View>
                          )}
                        </View>

                        {/* Botón play */}
                        <View style={[
                          styles.playCircle,
                          { backgroundColor: tr.routine_mode === 'timer' ? Colors.neonGreen : '#7F77DD' },
                        ]}>
                          <Ionicons name="play" size={22} color={Colors.black} />
                        </View>
                      </LinearGradient>
                    </AnimatedPressable>
                  ))}
                </View>
              ) : (
                /* ── Estado vacío ── */
                <LinearGradient colors={['#1a1a1a', '#111111']} style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={40} color={Colors.textSecondary} />
                  <EliteText variant="body" style={styles.emptyTitle}>
                    Nada programado para hoy
                  </EliteText>
                  <EliteText variant="caption" style={styles.emptySubtitle}>
                    Programa tus rutinas o entrena directamente
                  </EliteText>
                  <View style={styles.emptyActions}>
                    <AnimatedPressable
                      onPress={() => router.push('/(tabs)/biblioteca' as any)}
                      style={styles.emptyBtn}
                    >
                      <Ionicons name="calendar" size={18} color={Colors.neonGreen} />
                      <EliteText variant="caption" style={styles.emptyBtnText}>
                        Programar rutina
                      </EliteText>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => router.push('/(tabs)/biblioteca' as any)}
                      style={styles.emptyBtn}
                    >
                      <Ionicons name="flash" size={18} color={Colors.neonGreen} />
                      <EliteText variant="caption" style={styles.emptyBtnText}>
                        Entrenar libre
                      </EliteText>
                    </AnimatedPressable>
                  </View>
                </LinearGradient>
              )}
            </Animated.View>

            {/* ── Stats de la semana ── */}
            <Animated.View entering={FadeInUp.delay(200).springify()}>
              <EliteText variant="caption" style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
                ESTA SEMANA
              </EliteText>
              <View style={styles.statsRow}>
                <StatCard
                  value={String(weekStats.workouts)}
                  label="Sesiones"
                  icon="barbell-outline"
                  color={Colors.neonGreen}
                />
                <StatCard
                  value={weekStats.volumeKg > 999
                    ? `${Math.round(weekStats.volumeKg / 1000)}k`
                    : `${weekStats.volumeKg}kg`}
                  label="Volumen"
                  icon="trending-up-outline"
                  color="#5B9BD5"
                />
                <StatCard
                  value={String(weekStats.prs)}
                  label="PRs"
                  icon="trophy-outline"
                  color="#EF9F27"
                />
              </View>
            </Animated.View>

            {/* ── Actividad reciente ── */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <View style={styles.sectionHeader}>
                <EliteText variant="caption" style={styles.sectionLabel}>
                  ACTIVIDAD RECIENTE
                </EliteText>
                <AnimatedPressable onPress={() => router.push('/history' as any)}>
                  <EliteText variant="caption" style={styles.seeAll}>Ver todo ›</EliteText>
                </AnimatedPressable>
              </View>

              {recentSessions.length > 0 ? (
                recentSessions.map((s, idx) => (
                  <View key={s.date} style={styles.activityRow}>
                    <View style={styles.activityDot} />
                    <View style={styles.activityContent}>
                      <EliteText variant="body" style={styles.activityTitle}>
                        {s.exercises} ejercicio{s.exercises !== 1 ? 's' : ''} · {s.sets} sets
                      </EliteText>
                      <EliteText variant="caption" style={styles.activityDate}>
                        {formatSessionDate(s.date)}
                      </EliteText>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyActivity}>
                  <EliteText variant="caption" style={{ color: Colors.textSecondary }}>
                    Sin actividad reciente
                  </EliteText>
                </View>
              )}
            </Animated.View>

            <View style={{ height: Spacing.xxl }} />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// === COMPONENTE AUXILIAR: Stat Card ===

function StatCard({ value, label, icon, color }: {
  value: string; label: string; icon: string; color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={20} color={color} />
      <EliteText style={[styles.statValue, { color }]}>{value}</EliteText>
      <EliteText variant="caption" style={styles.statLabel}>{label}</EliteText>
    </View>
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
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.extraBold,
    letterSpacing: 4,
  },
  dateText: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 14,
  },
  settingsBtn: {
    padding: Spacing.sm,
  },
  loader: {
    marginTop: Spacing.xxl,
  },

  // Secciones
  sectionLabel: {
    color: Colors.textSecondary,
    letterSpacing: 3,
    fontSize: 12,
    textTransform: 'uppercase',
    fontFamily: Fonts.semiBold,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  seeAll: {
    color: Colors.neonGreen,
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // Rutina card
  routineCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 6,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  routineAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  routineBody: {
    flex: 1,
  },
  routineName: {
    fontSize: 18,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  modeBadge: {
    alignSelf: 'flex-start',
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
  coachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  coachText: {
    color: '#EF9F27',
    fontSize: 12,
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },

  // Estado vacío
  emptyCard: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    marginTop: Spacing.md,
    fontSize: 16,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
  },

  // Actividad reciente
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1a1a1a',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neonGreen,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  activityDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyActivity: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
});
