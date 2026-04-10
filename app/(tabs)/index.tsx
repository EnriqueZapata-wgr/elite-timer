/**
 * HOY — Dashboard diario: Hero + Electron Board + Agenda Timeline.
 *
 * Sección 1: Hero con ImageBackground, ATP Score ring, saludo contextual.
 * Sección 2: Electron Board — toggles booleanos (JSONB daily_electrons) + barras cuantitativas.
 * Sección 3: Agenda — timeline de acciones con dots + checkbox.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Linking, Alert, LayoutAnimation, Platform, UIManager,
  ImageBackground, Text, Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { AnimatedScoreRing } from '@/src/components/ui/AnimatedScoreRing';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import {
  CATEGORY_COLORS, SEMANTIC, SURFACES, CARD,
  getHoyBackgroundRequire,
} from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { renderActionContent } from '@/src/components/hoy/ActionContentRenderer';
import { supabase } from '@/src/lib/supabase';

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

// === CONSTANTES ===

const SCREEN_WIDTH = Dimensions.get('window').width;

const DAY_NAMES = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

/** Electrones booleanos del tablero diario */
const BOOLEAN_ELECTRONS = [
  { key: 'sunlight', name: 'Luz solar', icon: 'sunny-outline' as const, color: '#fbbf24' },
  { key: 'meditation', name: 'Meditación', icon: 'flower-outline' as const, color: '#c084fc' },
  { key: 'supplements', name: 'Suplementos', icon: 'medical-outline' as const, color: '#a8e02a' },
  { key: 'cold_shower', name: 'Baño frío', icon: 'snow-outline' as const, color: '#38bdf8' },
  { key: 'grounding', name: 'Grounding', icon: 'leaf-outline' as const, color: '#34d399' },
  { key: 'no_alcohol', name: 'Sin alcohol', icon: 'wine-outline' as const, color: '#f87171' },
] as const;

// === HELPERS ===

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

/** Determina si una acción es la próxima por completar */
function isNextAction(actions: PlanAction[], idx: number): boolean {
  const action = actions[idx];
  if (action.completed || action.skipped) return false;
  for (let i = 0; i < idx; i++) {
    if (!actions[i].completed && !actions[i].skipped) return false;
  }
  return true;
}

/** Color de categoría para el timeline */
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

// === COMPONENTE PRINCIPAL ===

export default function TodayScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // --- Estado de datos del día ---
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

  // --- Estado de electrones ---
  const [electrons, setElectrons] = useState<Record<string, boolean>>({});
  const [quantData, setQuantData] = useState<{ protein: number; steps: number; water: number }>({
    protein: 0, steps: 0, water: 0,
  });

  // --- Toast ---
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  // --- Filtro de categorías ---
  const [activeFilter, setActiveFilter] = useState<'TODO' | 'FITNESS' | 'NUTRICION' | 'MENTAL' | 'HABITOS'>('TODO');
  const FILTER_OPTIONS = ['TODO', 'FITNESS', 'NUTRICION', 'MENTAL', 'HABITOS'] as const;

  // === CARGA DE DATOS ===

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const today = getLocalToday();

        // Si el plan cargado es de otro día, forzar recarga visual
        if (dayPlan && dayPlan.date !== today) {
          setDayPlan(null);
          setTimeline([]);
        }
        setLoading(true);
        try {
          // Cargar stats semanales + cronotipo en paralelo
          const statsPromise = getWeeklyStats().catch(() => ({
            workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0,
          }));
          const chronoPromise = getUserChronotype().catch(() => null);

          // Intentar nuevo sistema → fallback legacy
          if (user?.id) {
            const [result, stats, chrono] = await Promise.all([
              getTodayPlan(user.id).catch(() => ({
                source: null as 'new' | 'legacy' | null,
                plan: null,
                legacyItems: undefined,
              })),
              statsPromise,
              chronoPromise,
            ]);
            if (!cancelled) setHasChronotype(!!chrono);
            if (!cancelled) {
              setWeekStats(stats);
              setDataSource(result.source);
              if (result.source === 'new' && result.plan) {
                setDayPlan(result.plan);
                setTimeline([]);
              } else if (result.source === 'legacy' && result.legacyItems) {
                setTimeline(result.legacyItems);
                setDayPlan(null);
              } else {
                setTimeline([]);
                setDayPlan(null);
              }
            }

            // Cargar electrones del día
            try {
              const { data: electronRow } = await supabase
                .from('daily_electrons')
                .select('electrons')
                .eq('user_id', user.id)
                .eq('date', today)
                .maybeSingle();
              if (!cancelled && electronRow) {
                setElectrons((electronRow.electrons as Record<string, boolean>) ?? {});
              }
            } catch { /* tabla puede no existir aún */ }

            // Cargar datos cuantitativos (proteína, pasos, agua)
            try {
              const [foodRes, hydRes] = await Promise.all([
                supabase
                  .from('food_logs')
                  .select('protein_g')
                  .eq('user_id', user.id)
                  .gte('created_at', `${today}T00:00:00`)
                  .lte('created_at', `${today}T23:59:59`),
                supabase
                  .from('hydration_logs')
                  .select('amount_ml')
                  .eq('user_id', user.id)
                  .gte('created_at', `${today}T00:00:00`)
                  .lte('created_at', `${today}T23:59:59`),
              ]);
              if (!cancelled) {
                const totalProtein = (foodRes.data ?? []).reduce(
                  (sum, r) => sum + (r.protein_g ?? 0), 0,
                );
                const totalWater = (hydRes.data ?? []).reduce(
                  (sum, r) => sum + (r.amount_ml ?? 0), 0,
                );
                setQuantData(prev => ({ ...prev, protein: totalProtein, water: totalWater }));
              }
            } catch { /* silenciar */ }
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

          // Cargar datos de wearable para readiness + steps
          try {
            const wAvailable = await isWearableAvailable();
            if (wAvailable && !cancelled) {
              const wData = await getWearableDataForDate(today);
              if (wData && !cancelled) {
                setWearableData(wData);
                if (wData.steps) {
                  setQuantData(prev => ({ ...prev, steps: wData.steps ?? 0 }));
                }
              }
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

  // === TOGGLE HANDLERS ===

  /** Toggle para nuevo sistema o legacy */
  const handleToggle = async (actionId: string) => {
    haptic.light();
    setToggling(actionId);
    if (dataSource === 'new' && dayPlan && user?.id) {
      try {
        const updated = await toggleAction(
          user.id, getLocalToday(), actionId,
        );
        setDayPlan(updated);
      } catch { /* silenciar */ }
    } else {
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

  /** Toggle un electrón booleano (upsert en daily_electrons) */
  async function toggleElectron(key: string) {
    haptic.medium();
    const next = { ...electrons, [key]: !electrons[key] };
    setElectrons(next);
    if (user?.id) {
      const today = getLocalToday();
      try {
        await supabase
          .from('daily_electrons')
          .upsert(
            { user_id: user.id, date: today, electrons: next },
            { onConflict: 'user_id,date' },
          );
      } catch { /* silenciar */ }
    }
  }

  /** Long press → menú de acciones rápidas */
  const handleLongPress = (action: PlanAction) => {
    if (dataSource !== 'new' || !dayPlan || !user?.id) return;
    haptic.medium();
    const today = getLocalToday();
    Alert.alert(action.name, undefined, [
      { text: 'Completar', onPress: () => handleToggle(action.id) },
      {
        text: 'Saltar hoy', onPress: async () => {
          try {
            const updated = await skipAction(user.id, today, action.id);
            setDayPlan(updated);
            showToast('Acción saltada');
          } catch { /* */ }
        },
      },
      {
        text: 'Quitar del día', style: 'destructive', onPress: async () => {
          try {
            const updated = await removeActionFromPlan(user.id, today, action.id);
            setDayPlan(updated);
            showToast('Acción eliminada');
          } catch { /* */ }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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
      haptic.success();
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

  // === DATOS DERIVADOS ===

  const completionStats = getCompletionStats(timeline);
  const hasTimeline = timeline.length > 0;

  const filteredActions = useMemo(() => {
    const actions = dayPlan?.actions ?? [];
    if (activeFilter === 'TODO') return actions;
    const filterMap: Record<string, string[]> = {
      'FITNESS': ['fitness', 'exercise'],
      'NUTRICION': ['nutrition', 'meal', 'supplement'],
      'MENTAL': ['mind', 'meditation', 'breathing', 'journaling'],
      'HABITOS': ['habit', 'optimization', 'sleep', 'rest'],
    };
    const cats = filterMap[activeFilter] || [];
    return actions.filter(a =>
      cats.some(c =>
        (a.category || '').toLowerCase().includes(c) || (a.link_type || '').includes(c),
      ),
    );
  }, [dayPlan?.actions, activeFilter]);

  const dayActions = dayPlan?.actions ?? [];
  const totalActions = dayActions.length || timeline.length || 0;
  const completedActions = dayPlan
    ? dayActions.filter(a => a.completed).length
    : completionStats.completed;
  const dailyScorePct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  const stepsCount = wearableData?.steps ?? quantData.steps;
  const userName = user?.user_metadata?.full_name?.split(' ')[0]?.toUpperCase()
    || user?.email?.split('@')[0]?.toUpperCase()
    || 'ATLETA';
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  // Electrones completados (conteo booleano)
  const electronsCompleted = BOOLEAN_ELECTRONS.filter(e => electrons[e.key]).length;

  // Metas cuantitativas
  const proteinGoal = 150; // gramos
  const stepsGoal = 10000;
  const waterGoal = 3000; // ml

  // Hero context — electrones, no ATP Score
  const hour = new Date().getHours();
  const totalElectronSlots = BOOLEAN_ELECTRONS.length;
  const electronPct = totalElectronSlots > 0 ? Math.round((electronsCompleted / totalElectronSlots) * 100) : 0;
  const heroBg = getHoyBackgroundRequire(hour, electronPct);
  const electronColor = electronPct >= 90 ? '#a8e02a' : electronPct >= 70 ? '#a8e02a' : electronPct >= 50 ? '#fbbf24' : '#ef4444';
  const electronLabel = electronPct >= 90 ? 'MÁXIMA CARGA' : electronPct >= 70 ? 'BUENA CARGA' : electronPct >= 50 ? 'CARGANDO' : 'BAJA CARGA';
  const greeting = hour < 12 ? 'Buenos dias' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  function getElectronMessage(pct: number, h: number): string {
    if (pct >= 95) return '¡Día de carga completa! Máximo rendimiento.';
    if (pct >= 80) return 'Excelente progreso. Casi al máximo.';
    if (pct >= 60) return 'Buen ritmo. Sigue cargando electrones.';
    if (pct >= 40) return 'Vas a la mitad. ¿Qué electrón sigue?';
    if (pct >= 20) return 'El día apenas empieza. Activa tus electrones.';
    if (h < 12) return 'Buenos días. Tu tablero de electrones te espera.';
    if (h < 18) return 'Aún hay tiempo. Carga tus electrones pendientes.';
    return 'Mañana es nueva oportunidad de carga.';
  }
  const electronMessage = getElectronMessage(electronPct, hour);

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════

  return (
    <TabScreen>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ═══════════════════════════════════════
            SECCIÓN 1: HERO
        ═══════════════════════════════════════ */}
        <ImageBackground source={heroBg} style={s.heroBg} imageStyle={s.heroBgImage}>
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', '#000']}
            locations={[0, 0.25, 0.65, 1]}
            style={s.heroGradient}
          >
            {/* Top bar */}
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

            {/* Greeting */}
            <Animated.View entering={FadeInUp.delay(80).springify()} style={s.heroGreetingWrap}>
              <EliteText style={s.heroGreeting}>{greeting},</EliteText>
              <EliteText style={s.heroName}>{userName}</EliteText>
              <EliteText variant="caption" style={s.heroDate}>{formatTodayHeader()}</EliteText>
            </Animated.View>

            {/* Electron ring */}
            <Animated.View entering={FadeInUp.delay(120).springify()} style={s.heroScoreWrap}>
              <AnimatedScoreRing score={electronPct} size={180} strokeWidth={4} label="ELECTRONES" />
              <View style={s.heroElectronCount}>
                <Text style={[s.heroElectronNum, { color: electronColor }]}>{electronsCompleted}</Text>
                <Text style={s.heroElectronSlash}>/</Text>
                <Text style={s.heroElectronTotal}>{totalElectronSlots}</Text>
              </View>
              <Text style={[s.heroScoreLabel, { color: electronColor }]}>{electronLabel}</Text>
              <Text style={s.heroScoreMessage}>{electronMessage}</Text>
            </Animated.View>
          </LinearGradient>
        </ImageBackground>

        {/* ═══════════════════════════════════════
            SECCIÓN 2: ELECTRON BOARD
        ═══════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(160).springify()}>
          <View style={s.sectionHeader}>
            <EliteText style={s.sectionTitle}>ELECTRONES</EliteText>
            <EliteText variant="caption" style={s.sectionSubtitle}>
              {electronsCompleted}/{BOOLEAN_ELECTRONS.length} completados
            </EliteText>
          </View>

          {/* Grid booleano 2 columnas */}
          <View style={s.electronGrid}>
            {BOOLEAN_ELECTRONS.map((el) => {
              const done = !!electrons[el.key];
              return (
                <AnimatedPressable
                  key={el.key}
                  onPress={() => toggleElectron(el.key)}
                  style={[
                    s.electronCard,
                    done && { borderColor: el.color + '60' },
                  ]}
                >
                  <View style={[s.electronIconWrap, { backgroundColor: el.color + '15' }]}>
                    <Ionicons
                      name={el.icon}
                      size={22}
                      color={done ? el.color : '#555'}
                    />
                  </View>
                  <EliteText
                    variant="caption"
                    style={[s.electronName, done && { color: Colors.textPrimary }]}
                  >
                    {el.name}
                  </EliteText>
                  <View style={[
                    s.electronDot,
                    done
                      ? { backgroundColor: el.color }
                      : { backgroundColor: '#333' },
                  ]} />
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Barras cuantitativas */}
          <View style={s.quantBars}>
            {/* Proteína */}
            <View style={s.quantRow}>
              <View style={s.quantLabelRow}>
                <Ionicons name="fitness-outline" size={14} color="#5B9BD5" />
                <EliteText variant="caption" style={s.quantLabel}>Proteína</EliteText>
                <EliteText variant="caption" style={s.quantValue}>
                  {Math.round(quantData.protein)}g / {proteinGoal}g
                </EliteText>
              </View>
              <View style={s.quantTrack}>
                <View style={[
                  s.quantFill,
                  {
                    width: `${Math.min((quantData.protein / proteinGoal) * 100, 100)}%`,
                    backgroundColor: '#5B9BD5',
                  },
                ]} />
              </View>
            </View>

            {/* Pasos */}
            <View style={s.quantRow}>
              <View style={s.quantLabelRow}>
                <Ionicons name="footsteps-outline" size={14} color="#34d399" />
                <EliteText variant="caption" style={s.quantLabel}>Pasos</EliteText>
                <EliteText variant="caption" style={s.quantValue}>
                  {(stepsCount ?? 0).toLocaleString()} / {(stepsGoal).toLocaleString()}
                </EliteText>
              </View>
              <View style={s.quantTrack}>
                <View style={[
                  s.quantFill,
                  {
                    width: `${Math.min(((stepsCount ?? 0) / stepsGoal) * 100, 100)}%`,
                    backgroundColor: '#34d399',
                  },
                ]} />
              </View>
            </View>

            {/* Agua */}
            <View style={s.quantRow}>
              <View style={s.quantLabelRow}>
                <Ionicons name="water-outline" size={14} color="#38bdf8" />
                <EliteText variant="caption" style={s.quantLabel}>Agua</EliteText>
                <EliteText variant="caption" style={s.quantValue}>
                  {Math.round(quantData.water)}ml / {waterGoal}ml
                </EliteText>
              </View>
              <View style={s.quantTrack}>
                <View style={[
                  s.quantFill,
                  {
                    width: `${Math.min((quantData.water / waterGoal) * 100, 100)}%`,
                    backgroundColor: '#38bdf8',
                  },
                ]} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════
            SECCIÓN 3: AGENDA TIMELINE
        ═══════════════════════════════════════ */}
        <View style={s.sectionHeader}>
          <EliteText style={s.sectionTitle}>AGENDA</EliteText>
          <EliteText variant="caption" style={s.sectionSubtitle}>
            {completedActions}/{totalActions} tareas
          </EliteText>
        </View>

        {/* Filtros de categoría */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={s.filtersWrap}>
          <FilterPills
            options={FILTER_OPTIONS}
            selected={activeFilter}
            onSelect={setActiveFilter}
            withPadding={false}
          />
        </Animated.View>

        {/* Timeline */}
        {loading ? (
          <View style={s.skeletonWrap}>
            <SkeletonLoader variant="card" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SkeletonLoader variant="stat-card" />
              <SkeletonLoader variant="stat-card" />
            </View>
            {[...Array(4)].map((_, i) => (
              <SkeletonLoader key={i} height={44} style={{ borderRadius: Radius.sm }} />
            ))}
          </View>
        ) : dataSource === 'new' && dayPlan && filteredActions.length > 0 ? (
          <View style={s.agendaTimeline}>
            {filteredActions.map((action, idx) => {
              const isCurrent = isNextAction(
                dayPlan.actions, dayPlan.actions.indexOf(action),
              );
              const catColor = getTimelineCatColor(action.category);
              const past = isPast(action.scheduled_time);
              const isOverdue = past && !action.completed && !action.skipped;
              const isTogglingThis = toggling === action.id;
              const isExpanded = expandedActionId === action.id;

              return (
                <StaggerItem key={action.id} index={idx} delay={40}>
                  <View style={s.agendaRow}>
                    {/* Línea vertical + dot */}
                    <View style={s.agendaLineCol}>
                      <View style={[
                        s.agendaLineSeg,
                        idx === 0 && { backgroundColor: 'transparent' },
                      ]} />
                      <View style={[
                        s.agendaDot,
                        action.completed && { backgroundColor: Colors.neonGreen, borderColor: Colors.neonGreen },
                        isCurrent && { borderColor: catColor, borderWidth: 2.5, backgroundColor: catColor + '30' },
                        action.skipped && { backgroundColor: Colors.disabled, borderColor: Colors.disabled },
                      ]}>
                        {action.completed && (
                          <Ionicons name="checkmark" size={7} color={Colors.black} />
                        )}
                      </View>
                      <View style={[
                        s.agendaLineSeg,
                        idx === filteredActions.length - 1 && { backgroundColor: 'transparent' },
                      ]} />
                    </View>

                    {/* Contenido */}
                    <AnimatedPressable
                      onPress={() => {
                        haptic.light();
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setExpandedActionId(isExpanded ? null : action.id);
                      }}
                      onLongPress={() => handleLongPress(action)}
                      style={[
                        s.agendaCard,
                        { borderLeftColor: catColor },
                        action.completed && s.agendaCardDone,
                        action.skipped && s.agendaCardSkipped,
                        isCurrent && { borderColor: catColor + '40', borderWidth: 1 },
                      ]}
                    >
                      {/* Hora + categoría */}
                      <View style={s.agendaCardHeader}>
                        <EliteText variant="caption" style={[
                          s.agendaTime,
                          action.completed && { color: Colors.neonGreen },
                          isOverdue && { color: SEMANTIC.error },
                        ]}>
                          {formatTime(action.scheduled_time)}
                        </EliteText>
                        <EliteText variant="caption" style={[s.agendaCatLabel, { color: catColor }]}>
                          {getCategoryLabel(action.category)}
                        </EliteText>
                        {isOverdue && (
                          <View style={s.agendaOverdueBadge}>
                            <EliteText variant="caption" style={s.agendaOverdueText}>
                              PENDIENTE
                            </EliteText>
                          </View>
                        )}
                        {action.duration_min > 0 && !isOverdue && (
                          <EliteText variant="caption" style={s.agendaDuration}>
                            {action.duration_min} min
                          </EliteText>
                        )}
                      </View>

                      {/* Título + checkbox */}
                      <View style={s.agendaCardBody}>
                        <View style={s.agendaCardContent}>
                          <EliteText variant="body" style={[
                            s.agendaTitle,
                            action.completed && s.agendaTitleDone,
                            action.skipped && { color: Colors.textMuted },
                          ]}>
                            {action.name}
                          </EliteText>

                          {action.protocol_name && action.protocol_name !== 'Manual' && (
                            <EliteText variant="caption" style={s.agendaSubtitle}>
                              {action.protocol_name}
                            </EliteText>
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
                              style={s.agendaOpenLink}
                            >
                              <Ionicons name="open-outline" size={11} color={catColor} />
                              <EliteText variant="caption" style={{ color: catColor, fontSize: FontSizes.xs }}>
                                Abrir
                              </EliteText>
                            </AnimatedPressable>
                          )}

                          {/* Expand indicator */}
                          {!isExpanded && action.instructions && (
                            <Ionicons name="chevron-down" size={11} color={Colors.textMuted} style={{ marginTop: 2 }} />
                          )}

                          {/* Contenido expandido */}
                          {isExpanded && action.instructions && (
                            <View style={s.agendaExpanded}>
                              <View style={s.agendaExpandSep} />
                              {renderActionContent(action)}
                            </View>
                          )}
                        </View>

                        {/* Checkbox */}
                        <AnimatedPressable
                          onPress={() => { haptic.light(); handleToggle(action.id); }}
                          disabled={isTogglingThis}
                          style={s.agendaCheckArea}
                        >
                          <View style={[
                            s.agendaCheckbox,
                            action.completed && s.agendaCheckboxDone,
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
                </StaggerItem>
              );
            })}
          </View>
        ) : dataSource !== 'new' && hasTimeline ? (
          <View style={s.agendaTimeline}>
            {timeline.map((item, idx) => {
              const catColor = getTimelineCatColor(item.category);
              const isTogglingThis = toggling === item.item_id;

              return (
                <StaggerItem key={item.item_id} index={idx} delay={60}>
                  <View style={s.agendaRow}>
                    {/* Línea vertical + dot */}
                    <View style={s.agendaLineCol}>
                      <View style={[
                        s.agendaLineSeg,
                        idx === 0 && { backgroundColor: 'transparent' },
                      ]} />
                      <View style={[
                        s.agendaDot,
                        item.is_completed && { backgroundColor: Colors.neonGreen, borderColor: Colors.neonGreen },
                      ]}>
                        {item.is_completed && (
                          <Ionicons name="checkmark" size={7} color={Colors.black} />
                        )}
                      </View>
                      <View style={[
                        s.agendaLineSeg,
                        idx === timeline.length - 1 && { backgroundColor: 'transparent' },
                      ]} />
                    </View>

                    {/* Card legacy */}
                    <AnimatedPressable
                      onPress={() => { haptic.light(); handleItemPress(item); }}
                      style={[
                        s.agendaCard,
                        { borderLeftColor: catColor },
                        item.is_completed && s.agendaCardDone,
                      ]}
                    >
                      <View style={s.agendaCardHeader}>
                        <EliteText variant="caption" style={[
                          s.agendaTime,
                          item.is_completed && { color: Colors.neonGreen },
                        ]}>
                          {formatTime(item.scheduled_time)}
                        </EliteText>
                        <EliteText variant="caption" style={[s.agendaCatLabel, { color: catColor }]}>
                          {getCategoryLabel(item.category)}
                        </EliteText>
                        {item.duration_minutes != null && (
                          <EliteText variant="caption" style={s.agendaDuration}>
                            {item.duration_minutes} min
                          </EliteText>
                        )}
                      </View>

                      <View style={s.agendaCardBody}>
                        <View style={s.agendaCardContent}>
                          <EliteText variant="body" style={[
                            s.agendaTitle,
                            item.is_completed && s.agendaTitleDone,
                          ]}>
                            {item.title}
                          </EliteText>
                          {item.description && (
                            <EliteText variant="caption" style={s.agendaSubtitle} numberOfLines={2}>
                              {item.description}
                            </EliteText>
                          )}
                        </View>

                        {isNavigable(item.link_type) && (
                          <View style={s.agendaNavChevron}>
                            <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
                          </View>
                        )}

                        <AnimatedPressable
                          onPress={() => { haptic.light(); handleToggle(item.item_id); }}
                          disabled={isTogglingThis}
                          style={s.agendaCheckArea}
                        >
                          <View style={[
                            s.agendaCheckbox,
                            item.is_completed && s.agendaCheckboxDone,
                          ]}>
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
                </StaggerItem>
              );
            })}
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

        {/* Espaciado inferior */}
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

// ═══════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════

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

  // ── HERO ──
  heroBg: {
    marginHorizontal: -Spacing.md,
    marginTop: -Spacing.sm,
  },
  heroBgImage: {
    opacity: 0.85,
  },
  heroGradient: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  heroGreetingWrap: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  heroGreeting: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroName: {
    fontSize: FontSizes.hero,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    letterSpacing: 1,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroDate: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroScoreWrap: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  heroElectronCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  heroElectronNum: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  heroElectronSlash: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 2,
  },
  heroElectronTotal: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.4)',
  },
  heroScoreLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 3,
    marginTop: Spacing.sm,
  },
  heroScoreMessage: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },

  // ── Sección headers ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    letterSpacing: 3,
  },
  sectionSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.textMuted,
  },

  // ── ELECTRON BOARD ──
  electronGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  electronCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
    height: 100,
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: Spacing.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  electronIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  electronName: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  electronDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Barras cuantitativas ──
  quantBars: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  quantRow: {
    gap: 4,
  },
  quantLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },
  quantValue: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  quantTrack: {
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  quantFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Filtros ──
  filtersWrap: {
    marginBottom: Spacing.md,
  },

  // ── Skeleton ──
  skeletonWrap: {
    gap: 12,
    paddingVertical: Spacing.md,
  },

  // ── AGENDA TIMELINE ──
  agendaTimeline: {
    paddingBottom: Spacing.md,
  },
  agendaRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  agendaLineCol: {
    width: 28,
    alignItems: 'center',
  },
  agendaLineSeg: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  agendaDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: CARD.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaCard: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    borderLeftWidth: 3,
    padding: Spacing.sm + 2,
  },
  agendaCardDone: {
    opacity: 0.5,
  },
  agendaCardSkipped: {
    opacity: 0.3,
  },
  agendaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  agendaTime: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
  agendaCatLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  agendaOverdueBadge: {
    backgroundColor: SEMANTIC.error + '20',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  agendaOverdueText: {
    color: SEMANTIC.error,
    fontSize: 8,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  agendaDuration: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    marginLeft: 'auto',
  },
  agendaCardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  agendaCardContent: {
    flex: 1,
  },
  agendaTitle: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  agendaTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  agendaSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
    lineHeight: 16,
  },
  agendaOpenLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  agendaExpanded: {
    marginTop: Spacing.xs,
  },
  agendaExpandSep: {
    height: 0.5,
    backgroundColor: '#1a1a1a',
    marginBottom: Spacing.sm,
  },
  agendaNavChevron: {
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  agendaCheckArea: {
    justifyContent: 'center',
    paddingLeft: Spacing.sm,
  },
  agendaCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaCheckboxDone: {
    backgroundColor: Colors.neonGreen,
    borderColor: Colors.neonGreen,
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
