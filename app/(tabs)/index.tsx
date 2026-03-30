/**
 * HOY — Timeline diario del protocolo del usuario.
 *
 * Muestra las actividades del día hora por hora con checkboxes,
 * stats de completados y barra de progreso.
 * Usa el sistema nuevo (daily_plans) con fallback al legacy (protocol-service).
 */
import { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { GradientCard } from '@/src/components/GradientCard';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SEMANTIC, SURFACES } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import {
  getTodayTimeline,
  toggleCompletion,
  getCompletionStats,
  type TimelineItem,
} from '@/src/services/protocol-service';
import {
  getTodayPlan,
  toggleAction,
  skipAction,
  addActionToPlan,
  removeActionFromPlan,
  resetDay,
  type DailyPlan,
  type PlanAction,
} from '@/src/services/protocol-builder-service';
import { useAuth } from '@/src/contexts/auth-context';
import { getCategoryColor, getCategoryLabel, getCategoryIcon } from '@/src/constants/categories';
import { getWeeklyStats, type WeeklyStats } from '@/src/services/exercise-service';
import { getUserChronotype } from '@/src/services/quiz-service';

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
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [dayPlan, setDayPlan] = useState<DailyPlan | null>(null);
  const [dataSource, setDataSource] = useState<'new' | 'legacy' | null>(null);
  const [weekStats, setWeekStats] = useState<WeeklyStats>({
    workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [hasChronotype, setHasChronotype] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        // Si el plan cargado es de otro día, forzar recarga visual
        const today = new Date().toISOString().split('T')[0];
        if (dayPlan && dayPlan.date !== today) {
          setDayPlan(null);
          setTimeline([]);
        }
        setLoading(true);
        try {
          // Cargar stats semanales + cronotipo en paralelo
          const statsPromise = getWeeklyStats().catch(() => ({ workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0 }));
          const chronoPromise = getUserChronotype().catch(() => null);

          // Intentar nuevo sistema → fallback legacy
          if (user?.id) {
            const [result, stats, chrono] = await Promise.all([
              getTodayPlan(user.id).catch(() => ({ source: null as 'new' | 'legacy' | null, plan: null, legacyItems: undefined })),
              statsPromise,
              chronoPromise,
            ]);
            if (!cancelled) setHasChronotype(!!chrono);
            if (!cancelled) {
              setWeekStats(stats);
              setDataSource(result.source);
              if (result.source === 'new' && result.plan) {
                setDayPlan(result.plan);
                setTimeline([]); // Limpiar legacy
              } else if (result.source === 'legacy' && result.legacyItems) {
                setTimeline(result.legacyItems);
                setDayPlan(null);
              } else {
                setTimeline([]);
                setDayPlan(null);
              }
            }
          } else {
            // Sin usuario autenticado — fallback legacy sin user_id
            const [items, stats] = await Promise.all([
              getTodayTimeline().catch(() => []),
              statsPromise,
            ]);
            if (!cancelled) {
              setTimeline(items);
              setWeekStats(stats);
              setDayPlan(null);
              setDataSource(null);
            }
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [user?.id])
  );

  /** Toggle para nuevo sistema o legacy */
  const handleToggle = async (actionId: string) => {
    haptic.light();
    setToggling(actionId);
    if (dataSource === 'new' && dayPlan && user?.id) {
      // Sistema nuevo: toggleAction en daily_plans
      try {
        const updated = await toggleAction(user.id, new Date().toISOString().split('T')[0], actionId);
        setDayPlan(updated);
      } catch { /* silenciar */ }
    } else {
      // Fallback legacy
      try {
        const newState = await toggleCompletion(actionId);
        setTimeline(prev => prev.map(item =>
          item.item_id === actionId
            ? { ...item, is_completed: newState, completed_at: newState ? new Date().toISOString() : null }
            : item
        ));
      } catch { /* silenciar */ }
    }
    setToggling(null);
  };

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  // Tipos que navegan a otra pantalla (no hacen toggle)
  const NAVIGABLE_TYPES = new Set(['routine', 'breathing', 'meditation', 'emotional_checkin']);

  const handleItemPress = (item: TimelineItem) => {
    const lt = item.link_type;

    if (lt === 'routine' && item.link_routine_id) {
      haptic.light();
      router.push({ pathname: '/execution' as any, params: { routineId: item.link_routine_id } });
    } else if (lt === 'breathing') {
      haptic.light();
      router.push({ pathname: '/breathing' as any, params: { protocolItemId: item.item_id } });
    } else if (lt === 'meditation') {
      haptic.light();
      router.push({ pathname: '/meditation' as any, params: { protocolItemId: item.item_id } });
    } else if (lt === 'emotional_checkin') {
      haptic.light();
      router.push({ pathname: '/checkin' as any, params: { protocolItemId: item.item_id } });
    } else if (lt === 'external_link' && item.link_url) {
      haptic.light();
      Linking.openURL(item.link_url).catch(() => {});
    } else if (lt === 'supplement_check') {
      haptic.success(); // feedback de éxito al registrar
      handleToggle(item.item_id);
      showToast('Suplementos registrados');
    } else if (lt === 'habit_check') {
      haptic.success();
      handleToggle(item.item_id);
      showToast('Hábito registrado');
    } else if (lt === 'fasting_window') {
      haptic.success();
      handleToggle(item.item_id);
      showToast('Registrado');
    } else if (lt === 'meal_photo') {
      haptic.success();
      handleToggle(item.item_id);
      showToast('Próximamente: foto de comida');
    } else if (lt === 'journal') {
      haptic.success();
      handleToggle(item.item_id);
      showToast('Próximamente: journaling');
    } else {
      handleToggle(item.item_id);
    }
  };

  const isNavigable = (linkType: string | null) => NAVIGABLE_TYPES.has(linkType ?? '');

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
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/settings'); }} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {loading ? (
          /* Skeleton de carga — reemplaza ActivityIndicator */
          <View style={{ padding: 16, gap: 12 }}>
            <SkeletonLoader variant="card" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SkeletonLoader variant="stat-card" />
              <SkeletonLoader variant="stat-card" />
            </View>
            {[...Array(4)].map((_, i) => <SkeletonLoader key={i} height={44} style={{ borderRadius: Radius.sm }} />)}
          </View>
        ) : dataSource === 'new' && dayPlan && dayPlan.actions.length > 0 ? (
          <>
            {/* ── Compliance header (nuevo sistema) ── */}
            <Animated.View entering={FadeInUp.delay(100).springify()}>
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <EliteText variant="body" style={styles.progressText}>
                    <EliteText style={styles.progressCount}>{dayPlan.completed_actions}</EliteText>
                    /{dayPlan.total_actions} completados
                  </EliteText>
                  <EliteText variant="caption" style={styles.progressPercent}>
                    {dayPlan.compliance_pct}%
                  </EliteText>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${dayPlan.compliance_pct}%` }]} />
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
                  <Ionicons name="trending-up-outline" size={14} color={CATEGORY_COLORS.nutrition} />
                  <EliteText variant="caption" style={styles.weekPillText}>
                    {weekStats.volumeKg > 999 ? `${Math.round(weekStats.volumeKg / 1000)}k` : `${weekStats.volumeKg}kg`}
                  </EliteText>
                </View>
                <View style={styles.weekPill}>
                  <Ionicons name="trophy-outline" size={14} color={SEMANTIC.warning} />
                  <EliteText variant="caption" style={styles.weekPillText}>
                    {weekStats.prs} PRs
                  </EliteText>
                </View>
              </View>
            </Animated.View>

            {/* ── Actions timeline (nuevo sistema) ── */}
            <View style={styles.timeline}>
              {dayPlan.actions.map((action, idx) => {
                const catColor = getCategoryColor(action.category);
                const past = isPast(action.scheduled_time);
                const isOverdue = past && !action.completed && !action.skipped;
                const isTogglingThis = toggling === action.id;

                return (
                  <StaggerItem key={action.id} index={idx} delay={40}>
                    <View style={styles.timelineRow}>
                      {/* Hora */}
                      <View style={styles.timeCol}>
                        <EliteText variant="caption" style={[
                          styles.timeText,
                          action.completed && { color: Colors.neonGreen },
                        ]}>
                          {formatTime(action.scheduled_time)}
                        </EliteText>
                      </View>

                      {/* Línea vertical + dot */}
                      <View style={styles.lineCol}>
                        {idx > 0 && <View style={styles.lineSegment} />}
                        <View style={[
                          styles.dot,
                          { backgroundColor: action.completed ? Colors.neonGreen : (past ? Colors.disabled : catColor + '40') },
                          action.completed && { borderColor: Colors.neonGreen },
                        ]}>
                          {action.completed && (
                            <Ionicons name="checkmark" size={10} color={Colors.black} />
                          )}
                        </View>
                        {idx < dayPlan.actions.length - 1 && <View style={styles.lineSegmentBottom} />}
                      </View>

                      {/* Card */}
                      <GradientCard
                        color={isOverdue ? SEMANTIC.error : catColor}
                        onPress={() => {
                          haptic.light();
                          // Navegación para link_type o toggle
                          if (action.link_type && !action.completed) {
                            const routes: Record<string, string> = {
                              meditation: '/meditation',
                              breathing: '/breathing',
                              food_scan: '/food-scan',
                              checkin: '/checkin',
                              routine: '/programs',
                            };
                            const route = routes[action.link_type];
                            if (route) {
                              router.push(route as any);
                              return;
                            }
                          }
                          handleToggle(action.id);
                        }}
                        style={[
                          styles.card,
                          action.completed && styles.cardCompleted,
                        ]}
                      >
                        <View style={styles.cardInner}>
                          <View style={styles.cardBody}>
                            <View style={styles.cardTopRow}>
                              <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                                <Ionicons name={getCategoryIcon(action.category) as any} size={12} color={catColor} />
                                <EliteText variant="caption" style={[styles.categoryText, { color: catColor }]}>
                                  {getCategoryLabel(action.category)}
                                </EliteText>
                              </View>
                              {action.duration_min > 0 && (
                                <EliteText variant="caption" style={styles.durationText}>
                                  {action.duration_min} min
                                </EliteText>
                              )}
                            </View>

                            <EliteText variant="body" style={[
                              styles.cardTitle,
                              action.completed && styles.cardTitleCompleted,
                            ]}>
                              {action.name}
                            </EliteText>

                            {action.protocol_name && action.protocol_name !== 'Manual' && (
                              <EliteText variant="caption" style={styles.cardDesc}>
                                {action.protocol_name}
                              </EliteText>
                            )}

                            {action.link_type && !action.completed && (
                              <Pressable
                                onPress={() => {
                                  haptic.light();
                                  const routes: Record<string, string> = {
                                    meditation: '/meditation',
                                    breathing: '/breathing',
                                    food_scan: '/food-scan',
                                    checkin: '/checkin',
                                    routine: '/programs',
                                  };
                                  const route = routes[action.link_type!];
                                  if (route) router.push(route as any);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                              >
                                <Ionicons name="open-outline" size={12} color={catColor} />
                                <EliteText variant="caption" style={{ color: catColor, fontSize: FontSizes.xs }}>Abrir</EliteText>
                              </Pressable>
                            )}
                          </View>

                          {/* Checkbox */}
                          <Pressable
                            onPress={() => handleToggle(action.id)}
                            disabled={isTogglingThis}
                            style={styles.checkArea}
                            hitSlop={12}
                          >
                            <View style={[
                              styles.checkbox,
                              action.completed && styles.checkboxChecked,
                            ]}>
                              {isTogglingThis ? (
                                <ActivityIndicator size="small" color={Colors.neonGreen} />
                              ) : action.completed ? (
                                <Ionicons name="checkmark" size={16} color={Colors.black} />
                              ) : null}
                            </View>
                          </Pressable>
                        </View>
                      </GradientCard>
                    </View>
                  </StaggerItem>
                );
              })}
            </View>
          </>
        ) : dataSource !== 'new' && hasTimeline ? (
          <>
            {/* ── Progress bar (legacy) ── */}
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
                  <Ionicons name="trending-up-outline" size={14} color={CATEGORY_COLORS.nutrition} />
                  <EliteText variant="caption" style={styles.weekPillText}>
                    {weekStats.volumeKg > 999 ? `${Math.round(weekStats.volumeKg / 1000)}k` : `${weekStats.volumeKg}kg`}
                  </EliteText>
                </View>
                <View style={styles.weekPill}>
                  <Ionicons name="trophy-outline" size={14} color={SEMANTIC.warning} />
                  <EliteText variant="caption" style={styles.weekPillText}>
                    {weekStats.prs} PRs
                  </EliteText>
                </View>
              </View>
            </Animated.View>

            {/* ── Timeline (legacy) ── */}
            <View style={styles.timeline}>
              {timeline.map((item, idx) => {
                const catLabel = getCategoryLabel(item.category);
                const catIcon = getCategoryIcon(item.category);
                const accentColor = getCategoryColor(item.category);
                const past = isPast(item.scheduled_time);
                const isTogglingThis = toggling === item.item_id;

                return (
                  <StaggerItem key={item.item_id} index={idx} delay={60}>
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
                          { backgroundColor: item.is_completed ? Colors.neonGreen : (past ? Colors.disabled : accentColor + '40') },
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
                                <Ionicons name={catIcon as any} size={12} color={accentColor} />
                                <EliteText variant="caption" style={[styles.categoryText, { color: accentColor }]}>
                                  {catLabel}
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

                          {isNavigable(item.link_type) && (
                            <View style={styles.navIndicator}>
                              <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
                            </View>
                          )}

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
                  </StaggerItem>
                );
              })}
            </View>
          </>
        ) : (
          /* ── Estado vacío (sin protocolo ni plan) ── */
          hasChronotype ? (
            <EmptyState
              icon="flask-outline"
              title="Sin protocolos activos"
              subtitle="Explora y activa un protocolo para llenar tu día"
              actionLabel="Explorar protocolos"
              onAction={() => router.push('/protocol-explorer' as any)}
              color="#a8e02a"
            />
          ) : (
            <EmptyState
              icon="today-outline"
              title="Tu día está vacío"
              subtitle="Completa el quiz de cronotipo para personalizar tu día"
              actionLabel="Hacer quiz"
              onAction={() => router.push('/quiz/chronotype' as any)}
              color="#a8e02a"
            />
          )
        )}

        {/* ── Accesos rápidos ── */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <EliteText variant="caption" style={styles.quickAccessLabel}>ACCESOS RÁPIDOS</EliteText>
          <View style={styles.quickAccessRow}>
            <GradientCard color={CATEGORY_COLORS.nutrition}
              onPress={() => { haptic.light(); router.push('/nutrition'); }}
              style={styles.quickAccessCard}>
              <View style={styles.quickAccessInner}>
                <Ionicons name="restaurant-outline" size={24} color={CATEGORY_COLORS.nutrition} />
                <EliteText style={{ color: CATEGORY_COLORS.nutrition, fontFamily: Fonts.bold, fontSize: FontSizes.md }}>
                  Nutrición
                </EliteText>
                <EliteText variant="caption" style={{ color: Colors.textSecondary, fontSize: FontSizes.xs }}>
                  Registra comidas
                </EliteText>
              </View>
            </GradientCard>
            <GradientCard color={CATEGORY_COLORS.mind}
              onPress={() => { haptic.light(); router.push('/mind-hub'); }}
              style={styles.quickAccessCard}>
              <View style={styles.quickAccessInner}>
                <Ionicons name="sparkles-outline" size={24} color={CATEGORY_COLORS.mind} />
                <EliteText style={{ color: CATEGORY_COLORS.mind, fontFamily: Fonts.bold, fontSize: FontSizes.md }}>
                  Mente
                </EliteText>
                <EliteText variant="caption" style={{ color: Colors.textSecondary, fontSize: FontSizes.xs }}>
                  Medita y respira
                </EliteText>
              </View>
            </GradientCard>
          </View>
        </Animated.View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Toast */}
      {toast && (
        <View style={styles.toast}>
          <EliteText variant="caption" style={styles.toastText}>{toast}</EliteText>
        </View>
      )}
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
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
  },
  heroTitle: {
    fontSize: FontSizes.hero,
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
  progressText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  progressCount: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  progressPercent: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: Radius.xs,
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
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  weekPillText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

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
    fontSize: FontSizes.sm,
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
    backgroundColor: Colors.surfaceLight,
  },
  lineSegmentBottom: {
    width: 1.5,
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
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
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  durationText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
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
    borderRadius: Radius.card,
    borderWidth: 2,
    borderColor: Colors.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.neonGreen,
    borderColor: Colors.neonGreen,
  },

  // Nav indicator (chevron en cards navegables)
  navIndicator: {
    justifyContent: 'center',
    paddingRight: 2,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  toastText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },

  // Accesos rápidos
  quickAccessLabel: {
    color: Colors.textSecondary,
    letterSpacing: 3,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickAccessCard: {
    flex: 1,
    padding: Spacing.md,
  },
  quickAccessInner: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
