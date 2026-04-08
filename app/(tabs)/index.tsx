/**
 * HOY — Timeline diario del protocolo del usuario.
 *
 * Muestra las actividades del día hora por hora con checkboxes,
 * stats de completados y barra de progreso.
 * Usa el sistema nuevo (daily_plans) con fallback al legacy (protocol-service).
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { GradientCard } from '@/src/components/GradientCard';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SEMANTIC, SURFACES, withOpacity } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { renderActionContent } from '@/src/components/hoy/ActionContentRenderer';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
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
import { isWearableAvailable, getWearableDataForDate, type WearableData } from '@/src/services/wearable-service';

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
  const parts = timeStr?.split(':') ?? [];
  let h = parseInt(parts[0] ?? '0', 10);
  const m = parts[1] ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/** Determina si un item ya pasó según la hora */
function isPast(timeStr: string): boolean {
  const now = new Date();
  const parts = timeStr?.split(':') ?? [];
  const itemMinutes = parseInt(parts[0] ?? '0', 10) * 60 + parseInt(parts[1] ?? '0', 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > itemMinutes;
}

/** Color de compliance según porcentaje */
function complianceColor(pct: number): string {
  if (pct >= 75) return SEMANTIC.success;
  if (pct >= 50) return SEMANTIC.warning;
  return SEMANTIC.error;
}

/** Determina si una acción es la próxima por completar */
function isNextAction(actions: PlanAction[], idx: number): boolean {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const action = actions[idx];
  if (action.completed || action.skipped) return false;
  const parts = action.scheduled_time?.split(':') ?? [];
  const actionMin = parseInt(parts[0] ?? '0', 10) * 60 + parseInt(parts[1] ?? '0', 10);
  // Es "próxima" si es la primera no completada cuya hora ya pasó o es la siguiente
  for (let i = 0; i < idx; i++) {
    if (!actions[i].completed && !actions[i].skipped) return false; // hay una antes sin completar
  }
  return true;
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
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [wearableData, setWearableData] = useState<WearableData | null>(null);

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
          // Cargar datos de wearable para readiness
          try {
            const today = new Date().toISOString().split('T')[0];
            const wAvailable = await isWearableAvailable();
            if (wAvailable && !cancelled) {
              const wData = await getWearableDataForDate(today);
              if (wData && !cancelled) setWearableData(wData);
            }
          } catch { /* wearable no disponible */ }
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

  /** Long press → menú de acciones rápidas */
  const handleLongPress = (action: PlanAction) => {
    if (dataSource !== 'new' || !dayPlan || !user?.id) return;
    haptic.medium();
    const today = new Date().toISOString().split('T')[0];
    Alert.alert(action.name, undefined, [
      { text: 'Completar', onPress: () => handleToggle(action.id) },
      { text: 'Saltar hoy', onPress: async () => {
        try {
          const updated = await skipAction(user.id, today, action.id);
          setDayPlan(updated);
          showToast('Acción saltada');
        } catch { /* */ }
      }},
      { text: 'Quitar del día', style: 'destructive', onPress: async () => {
        try {
          const updated = await removeActionFromPlan(user.id, today, action.id);
          setDayPlan(updated);
          showToast('Acción eliminada');
        } catch { /* */ }
      }},
      { text: 'Cancelar', style: 'cancel' },
    ]);
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
      haptic.light();
      router.push('/journal' as any);
    } else {
      handleToggle(item.item_id);
    }
  };

  const isNavigable = (linkType: string | null) => NAVIGABLE_TYPES.has(linkType ?? '');

  const completionStats = getCompletionStats(timeline);
  const hasTimeline = timeline.length > 0;

  // === NUEVO: filtro de categorías ===
  const [activeFilter, setActiveFilter] = useState<'TODO' | 'FITNESS' | 'NUTRICION' | 'MENTAL' | 'HABITOS'>('TODO');

  const filteredActions = useMemo(() => {
    const actions = dayPlan?.actions || [];
    if (activeFilter === 'TODO') return actions;
    const filterMap: Record<string, string[]> = {
      'FITNESS': ['fitness', 'exercise'],
      'NUTRICION': ['nutrition', 'meal', 'supplement'],
      'MENTAL': ['mind', 'meditation', 'breathing', 'journaling'],
      'HABITOS': ['habit', 'optimization', 'sleep', 'rest'],
    };
    const cats = filterMap[activeFilter] || [];
    return actions.filter(a => cats.some(c => (a.category || '').toLowerCase().includes(c) || (a.link_type || '').includes(c)));
  }, [dayPlan?.actions, activeFilter]);

  /** Color de categoría para el timeline mockup */
  function getTimelineCatColor(category?: string): string {
    if (!category) return '#444';
    const c = category.toLowerCase();
    if (c.includes('fitness') || c.includes('exercise')) return '#a8e02a';
    if (c.includes('nutrition') || c.includes('meal') || c.includes('supplement')) return '#5B9BD5';
    if (c.includes('mind') || c.includes('meditation') || c.includes('breathing')) return '#7F77DD';
    if (c.includes('optimization') || c.includes('habit')) return '#EF9F27';
    if (c.includes('rest') || c.includes('sleep')) return '#666';
    return '#444';
  }

  // === Datos derivados para Daily Score ===
  const totalActions = dayPlan?.actions?.length || timeline.length || 0;
  const completedActions = dayPlan
    ? dayPlan.actions.filter(a => a.completed).length
    : completionStats.completed;
  const dailyScorePct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  const sleepHours = wearableData?.sleep?.totalHours ?? null;
  const stepsCount = wearableData?.steps ?? null;
  const sleepProgress = sleepHours ? Math.min(sleepHours / 8, 1) : 0;
  const stepsProgress = stepsCount ? Math.min(stepsCount / 10000, 1) : 0;
  const actionsProgress = totalActions > 0 ? completedActions / totalActions : 0;

  const userName = user?.user_metadata?.full_name?.split(' ')[0]?.toUpperCase()
    || user?.email?.split('@')[0]?.toUpperCase()
    || 'ATLETA';
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  // === SUB-COMPONENTES INLINE ===

  /** Barra de progreso mini con label y valor */
  const MiniMetricBar = ({ label, value, progress, color }: {
    label: string; value: string; progress: number; color: string;
  }) => (
    <View style={s.miniMetric}>
      <View style={s.miniMetricHeader}>
        <EliteText variant="caption" style={s.miniMetricLabel}>{label}</EliteText>
        <EliteText variant="caption" style={[s.miniMetricValue, { color }]}>{value}</EliteText>
      </View>
      <View style={s.miniMetricTrack}>
        <View style={[s.miniMetricFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  /** Card del timeline con línea vertical + dot */
  const TimelineCard = ({ action, isFirst, isLast, isCurrent, onToggle, onExpand, isExpanded }: {
    action: PlanAction;
    isFirst: boolean;
    isLast: boolean;
    isCurrent: boolean;
    onToggle: () => void;
    onExpand: () => void;
    isExpanded: boolean;
  }) => {
    const catColor = getTimelineCatColor(action.category);
    const past = isPast(action.scheduled_time);
    const isOverdue = past && !action.completed && !action.skipped;
    const isTogglingThis = toggling === action.id;

    return (
      <View style={s.tlRow}>
        {/* Línea vertical + dot */}
        <View style={s.tlLineCol}>
          <View style={[s.tlLineSegment, isFirst && { backgroundColor: 'transparent' }]} />
          <View style={[
            s.tlDot,
            action.completed && { backgroundColor: Colors.neonGreen, borderColor: Colors.neonGreen },
            isCurrent && { borderColor: catColor, borderWidth: 2.5, backgroundColor: catColor + '30' },
            action.skipped && { backgroundColor: Colors.disabled, borderColor: Colors.disabled },
          ]}>
            {action.completed && <Ionicons name="checkmark" size={8} color={Colors.black} />}
          </View>
          <View style={[s.tlLineSegment, isLast && { backgroundColor: 'transparent' }]} />
        </View>

        {/* Card */}
        <AnimatedPressable
          onPress={() => {
            haptic.light();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onExpand();
          }}
          onLongPress={() => handleLongPress(action)}
          style={[
            s.tlCard,
            { borderLeftColor: catColor },
            action.completed && s.tlCardCompleted,
            action.skipped && s.tlCardSkipped,
            isCurrent && { borderColor: catColor + '40', borderWidth: 1 },
          ]}
        >
          {/* Hora + categoría */}
          <View style={s.tlCardHeader}>
            <EliteText variant="caption" style={[s.tlTime, action.completed && { color: Colors.neonGreen }, isOverdue && { color: SEMANTIC.error }]}>
              {formatTime(action.scheduled_time)}
            </EliteText>
            <EliteText variant="caption" style={[s.tlCategoryLabel, { color: catColor }]}>
              {getCategoryLabel(action.category)}
            </EliteText>
            {isOverdue && (
              <View style={s.tlOverdueBadge}>
                <EliteText variant="caption" style={s.tlOverdueText}>PENDIENTE</EliteText>
              </View>
            )}
            {action.duration_min > 0 && !isOverdue && (
              <EliteText variant="caption" style={s.tlDuration}>{action.duration_min} min</EliteText>
            )}
          </View>

          {/* Título + checkbox */}
          <View style={s.tlCardBody}>
            <View style={s.tlCardContent}>
              <EliteText variant="body" style={[
                s.tlTitle,
                action.completed && s.tlTitleCompleted,
                action.skipped && { color: Colors.textMuted },
              ]}>
                {action.name}
              </EliteText>

              {action.protocol_name && action.protocol_name !== 'Manual' && (
                <EliteText variant="caption" style={s.tlSubtitle}>{action.protocol_name}</EliteText>
              )}

              {/* Link de navegación */}
              {action.link_type && !action.completed && (
                <AnimatedPressable
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
                  style={s.tlOpenLink}
                >
                  <Ionicons name="open-outline" size={11} color={catColor} />
                  <EliteText variant="caption" style={{ color: catColor, fontSize: FontSizes.xs }}>Abrir</EliteText>
                </AnimatedPressable>
              )}

              {/* Expandir indicador */}
              {!isExpanded && action.instructions && (
                <Ionicons name="chevron-down" size={11} color={Colors.textMuted} style={{ marginTop: 2 }} />
              )}

              {/* Contenido expandido */}
              {isExpanded && action.instructions && (
                <View style={s.tlExpanded}>
                  <View style={s.tlExpandSep} />
                  {renderActionContent(action)}
                </View>
              )}
            </View>

            {/* Checkbox */}
            <AnimatedPressable
              onPress={() => { haptic.light(); onToggle(); }}
              disabled={isTogglingThis}
              style={s.tlCheckArea}
            >
              <View style={[
                s.tlCheckbox,
                action.completed && s.tlCheckboxChecked,
              ]}>
                {isTogglingThis ? (
                  <ActivityIndicator size="small" color={Colors.neonGreen} />
                ) : action.completed ? (
                  <Ionicons name="checkmark" size={14} color={Colors.black} />
                ) : null}
              </View>
            </AnimatedPressable>
          </View>
        </AnimatedPressable>
      </View>
    );
  };

  /** Card del timeline para sistema legacy */
  const LegacyTimelineCard = ({ item, isFirst, isLast }: {
    item: TimelineItem; isFirst: boolean; isLast: boolean;
  }) => {
    const catColor = getTimelineCatColor(item.category);
    const past = isPast(item.scheduled_time);
    const isTogglingThis = toggling === item.item_id;

    return (
      <View style={s.tlRow}>
        <View style={s.tlLineCol}>
          <View style={[s.tlLineSegment, isFirst && { backgroundColor: 'transparent' }]} />
          <View style={[
            s.tlDot,
            item.is_completed && { backgroundColor: Colors.neonGreen, borderColor: Colors.neonGreen },
          ]}>
            {item.is_completed && <Ionicons name="checkmark" size={8} color={Colors.black} />}
          </View>
          <View style={[s.tlLineSegment, isLast && { backgroundColor: 'transparent' }]} />
        </View>

        <AnimatedPressable
          onPress={() => { haptic.light(); handleItemPress(item); }}
          style={[
            s.tlCard,
            { borderLeftColor: catColor },
            item.is_completed && s.tlCardCompleted,
          ]}
        >
          <View style={s.tlCardHeader}>
            <EliteText variant="caption" style={[s.tlTime, item.is_completed && { color: Colors.neonGreen }]}>
              {formatTime(item.scheduled_time)}
            </EliteText>
            <EliteText variant="caption" style={[s.tlCategoryLabel, { color: catColor }]}>
              {getCategoryLabel(item.category)}
            </EliteText>
            {item.duration_minutes != null && (
              <EliteText variant="caption" style={s.tlDuration}>{item.duration_minutes} min</EliteText>
            )}
          </View>

          <View style={s.tlCardBody}>
            <View style={s.tlCardContent}>
              <EliteText variant="body" style={[s.tlTitle, item.is_completed && s.tlTitleCompleted]}>
                {item.title}
              </EliteText>
              {item.description && (
                <EliteText variant="caption" style={s.tlSubtitle} numberOfLines={2}>{item.description}</EliteText>
              )}
            </View>

            {isNavigable(item.link_type) && (
              <View style={s.tlNavChevron}>
                <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
              </View>
            )}

            <AnimatedPressable
              onPress={() => { haptic.light(); handleToggle(item.item_id); }}
              disabled={isTogglingThis}
              style={s.tlCheckArea}
            >
              <View style={[s.tlCheckbox, item.is_completed && s.tlCheckboxChecked]}>
                {isTogglingThis ? (
                  <ActivityIndicator size="small" color={Colors.neonGreen} />
                ) : item.is_completed ? (
                  <Ionicons name="checkmark" size={14} color={Colors.black} />
                ) : null}
              </View>
            </AnimatedPressable>
          </View>
        </AnimatedPressable>
      </View>
    );
  };

  // === Filtros de categoría ===
  const FILTER_OPTIONS = ['TODO', 'FITNESS', 'NUTRICION', 'MENTAL', 'HABITOS'] as const;

  // SVG circle params
  const CIRCLE_SIZE = 160;
  const CIRCLE_STROKE = 10;
  const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
  const scoreOffset = CIRCLE_CIRCUMFERENCE * (1 - dailyScorePct / 100);

  return (
    <TabScreen>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ── 1. Top bar ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={s.topBar}>
            <View style={s.topBarLeft}>
              <UserAvatar uri={avatarUrl} name={userName} />
              <View>
                <EliteText variant="caption" style={s.brandLabel}>ATP DAILY</EliteText>
              </View>
            </View>
            <View style={s.topBarRight}>
              <AnimatedPressable onPress={() => { haptic.light(); }} style={s.topBarIcon}>
                <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
              </AnimatedPressable>
              <AnimatedPressable onPress={() => { haptic.light(); router.push('/settings'); }} style={s.topBarIcon}>
                <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
              </AnimatedPressable>
            </View>
          </View>
        </Animated.View>

        {/* ── 2. Greeting + date ── */}
        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <EliteText style={s.greeting}>HOLA, {userName}</EliteText>
          <EliteText variant="caption" style={s.dateLabel}>{formatTodayHeader()}</EliteText>
        </Animated.View>

        {/* ── 3. Daily Score Hero ── */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <View style={s.scoreHero}>
            <View style={s.scoreCircleWrap}>
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                {/* Track */}
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={CIRCLE_RADIUS}
                  stroke="#1a1a1a"
                  strokeWidth={CIRCLE_STROKE}
                  fill="none"
                />
                {/* Progress */}
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={CIRCLE_RADIUS}
                  stroke={complianceColor(dailyScorePct)}
                  strokeWidth={CIRCLE_STROKE}
                  fill="none"
                  strokeDasharray={`${CIRCLE_CIRCUMFERENCE}`}
                  strokeDashoffset={scoreOffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                />
              </Svg>
              <View style={s.scoreTextWrap}>
                <EliteText style={s.scoreNumber}>{dailyScorePct}</EliteText>
                <EliteText variant="caption" style={s.scoreUnit}>%</EliteText>
              </View>
            </View>

            {/* Mini metric bars */}
            <View style={s.miniMetrics}>
              <MiniMetricBar
                label="ACCIONES"
                value={`${completedActions}/${totalActions}`}
                progress={actionsProgress}
                color={Colors.neonGreen}
              />
              {sleepHours != null && (
                <MiniMetricBar
                  label="SUENO"
                  value={`${sleepHours.toFixed(1)}h`}
                  progress={sleepProgress}
                  color={CATEGORY_COLORS.mind}
                />
              )}
              {stepsCount != null && (
                <MiniMetricBar
                  label="PASOS"
                  value={stepsCount >= 1000 ? `${(stepsCount / 1000).toFixed(1)}k` : `${stepsCount}`}
                  progress={stepsProgress}
                  color={CATEGORY_COLORS.nutrition}
                />
              )}
            </View>
          </View>
        </Animated.View>

        {/* ── 4. Category filters ── */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={s.filtersWrap}>
          <FilterPills
            options={FILTER_OPTIONS}
            selected={activeFilter}
            onSelect={setActiveFilter}
            withPadding={false}
          />
        </Animated.View>

        {/* ── 5. Timeline ── */}
        {loading ? (
          <View style={s.skeletonWrap}>
            <SkeletonLoader variant="card" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SkeletonLoader variant="stat-card" />
              <SkeletonLoader variant="stat-card" />
            </View>
            {[...Array(4)].map((_, i) => <SkeletonLoader key={i} height={44} style={{ borderRadius: Radius.sm }} />)}
          </View>
        ) : dataSource === 'new' && dayPlan && filteredActions.length > 0 ? (
          <View style={s.timeline}>
            {filteredActions.map((action, idx) => {
              const isCurrent = isNextAction(dayPlan.actions, dayPlan.actions.indexOf(action));
              return (
                <StaggerItem key={action.id} index={idx} delay={40}>
                  <TimelineCard
                    action={action}
                    isFirst={idx === 0}
                    isLast={idx === filteredActions.length - 1}
                    isCurrent={isCurrent}
                    onToggle={() => handleToggle(action.id)}
                    onExpand={() => setExpandedActionId(expandedActionId === action.id ? null : action.id)}
                    isExpanded={expandedActionId === action.id}
                  />
                </StaggerItem>
              );
            })}
          </View>
        ) : dataSource !== 'new' && hasTimeline ? (
          <View style={s.timeline}>
            {timeline.map((item, idx) => (
              <StaggerItem key={item.item_id} index={idx} delay={60}>
                <LegacyTimelineCard
                  item={item}
                  isFirst={idx === 0}
                  isLast={idx === timeline.length - 1}
                />
              </StaggerItem>
            ))}
          </View>
        ) : !loading ? (
          hasChronotype ? (
            <EmptyState
              icon="flask-outline"
              title="Sin protocolos activos"
              subtitle="Explora y activa un protocolo para llenar tu dia"
              actionLabel="Explorar protocolos"
              onAction={() => router.push('/protocol-explorer' as any)}
              color="#a8e02a"
            />
          ) : (
            <EmptyState
              icon="today-outline"
              title="Tu dia esta vacio"
              subtitle="Completa el quiz de cronotipo para personalizar tu dia"
              actionLabel="Hacer quiz"
              onAction={() => router.push('/quiz/chronotype' as any)}
              color="#a8e02a"
            />
          )
        ) : null}

        {/* ── 6. Bottom metrics (wearable) ── */}
        {wearableData?.recovery != null && (
          <Animated.View entering={FadeInUp.delay(250).springify()}>
            <View style={s.bottomMetrics}>
              <View style={s.metricCard}>
                <Ionicons name="fitness-outline" size={16} color={
                  wearableData.recovery >= 80 ? SEMANTIC.success
                    : wearableData.recovery >= 60 ? SEMANTIC.warning
                      : SEMANTIC.error
                } />
                <EliteText variant="caption" style={s.metricCardLabel}>READINESS</EliteText>
                <EliteText style={[s.metricCardValue, {
                  color: wearableData.recovery >= 80 ? SEMANTIC.success
                    : wearableData.recovery >= 60 ? SEMANTIC.warning
                      : SEMANTIC.error,
                }]}>
                  {wearableData.recovery}
                </EliteText>
                <EliteText variant="caption" style={s.metricCardHint}>
                  {wearableData.recovery >= 80 ? 'Listo' : wearableData.recovery >= 60 ? 'Moderado' : 'Recupera'}
                </EliteText>
              </View>

              {wearableData.hrv != null && (
                <View style={s.metricCard}>
                  <Ionicons name="pulse-outline" size={16} color={CATEGORY_COLORS.metrics} />
                  <EliteText variant="caption" style={s.metricCardLabel}>HRV</EliteText>
                  <EliteText style={[s.metricCardValue, { color: CATEGORY_COLORS.metrics }]}>
                    {Math.round(wearableData.hrv)}
                  </EliteText>
                  <EliteText variant="caption" style={s.metricCardHint}>ms</EliteText>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Toast */}
      {toast && (
        <View style={s.toast}>
          <EliteText variant="caption" style={s.toastText}>{toast}</EliteText>
        </View>
      )}
    </TabScreen>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  topBarIcon: {
    padding: Spacing.xs,
  },
  brandLabel: {
    color: Colors.neonGreen,
    letterSpacing: 3,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
  },

  // ── Greeting ──
  greeting: {
    fontSize: FontSizes.hero,
    fontFamily: Fonts.extraBold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    letterSpacing: 1,
  },
  dateLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },

  // ── Score hero ──
  scoreHero: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  scoreCircleWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  scoreTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  scoreNumber: {
    fontSize: FontSizes.mega,
    fontFamily: Fonts.extraBold,
    color: Colors.textPrimary,
  },
  scoreUnit: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    marginTop: 8,
  },

  // ── Mini metrics ──
  miniMetrics: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  miniMetric: {
    flex: 1,
    maxWidth: 110,
  },
  miniMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  miniMetricLabel: {
    color: '#666',
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  miniMetricValue: {
    fontSize: 9,
    fontFamily: Fonts.bold,
  },
  miniMetricTrack: {
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniMetricFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ── Category filters ──
  filtersWrap: {
    marginBottom: Spacing.md,
  },

  // ── Skeleton ──
  skeletonWrap: {
    gap: 12,
    paddingVertical: Spacing.md,
  },

  // ── Timeline ──
  timeline: {
    paddingBottom: Spacing.md,
  },
  tlRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  tlLineCol: {
    width: 28,
    alignItems: 'center',
  },
  tlLineSegment: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  tlDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlCard: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    borderLeftWidth: 3,
    padding: Spacing.sm + 2,
  },
  tlCardCompleted: {
    opacity: 0.5,
  },
  tlCardSkipped: {
    opacity: 0.3,
  },
  tlCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  tlTime: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
  tlCategoryLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tlOverdueBadge: {
    backgroundColor: SEMANTIC.error + '20',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  tlOverdueText: {
    color: SEMANTIC.error,
    fontSize: 8,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  tlDuration: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    marginLeft: 'auto',
  },
  tlCardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tlCardContent: {
    flex: 1,
  },
  tlTitle: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  tlTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  tlSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
    lineHeight: 16,
  },
  tlOpenLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  tlExpanded: {
    marginTop: Spacing.xs,
  },
  tlExpandSep: {
    height: 0.5,
    backgroundColor: '#1a1a1a',
    marginBottom: Spacing.sm,
  },
  tlNavChevron: {
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tlCheckArea: {
    justifyContent: 'center',
    paddingLeft: Spacing.sm,
  },
  tlCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlCheckboxChecked: {
    backgroundColor: Colors.neonGreen,
    borderColor: Colors.neonGreen,
  },

  // ── Bottom metrics ──
  bottomMetrics: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  metricCardLabel: {
    color: '#555',
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  metricCardValue: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.extraBold,
    color: Colors.textPrimary,
  },
  metricCardHint: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },

  // ── Toast ──
  toast: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#222',
  },
  toastText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },
});
