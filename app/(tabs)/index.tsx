/**
 * HOY — Dashboard diario compilado.
 *
 * Usa compileDay() como única fuente de datos. Seis secciones:
 * 1. Hero (imagen + gradiente + ring + saludo)
 * 2. Próximo electrón
 * 3. Electrones booleanos (grid 2-col)
 * 4. Electrones cuantitativos (barras)
 * 5. Sugerencia inteligente
 * 6. Agenda (timeline)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Text, TextInput,
  Dimensions, DeviceEventEmitter, ImageBackground,
  LayoutAnimation, Platform, UIManager, ActivityIndicator, Alert,
} from 'react-native';
import { warn as logWarn } from '@/src/lib/logger';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/auth-context';
import { compileDay, type CompiledDay, VERIFIED_ELECTRON_KEYS, VERIFIED_ELECTRON_ROUTES, type VerifiedElectronKey } from '@/src/services/day-compiler';
import { SplashLoader } from '@/src/components/SplashLoader';
import { NotificationBellIcon } from '@/src/components/hoy/NotificationBellIcon';
import { HoyEditorialSection } from '@/src/components/hoy/HoyEditorialSection';
import { AgendaPreviewCard } from '@/src/components/agenda/AgendaPreviewCard';
import { getCardsVisible } from '@/src/services/hoy/visibility-service';
import { HOY_CARD_ORDER_DEFAULT } from '@/src/constants/hoy-cards';
import { awardBooleanElectron, revokeBooleanElectron } from '@/src/services/electron-service';
import { AnimatedScoreRing } from '@/src/components/ui/AnimatedScoreRing';
import { EconomyHeaderPill } from '@/src/components/economy/EconomyHeaderPill';
import { fireElectronAward } from '@/src/services/economy/electron-award-client';
import { EditDayModal } from '@/src/components/hoy/EditDayModal';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ExpandableSheet } from '@/src/components/ui/ExpandableSheet';
import { getWearableDataForDate, type WearableData } from '@/src/services/wearable-service';
import { WearableMetricCard } from '@/src/components/hoy/WearableMetricCard';
import { getHoyBackgroundRequire } from '@/src/constants/brand';
import { getLocalToday } from '@/src/utils/date-helpers';
import { nowDividerIndex, minutesOfDay, formatNowLabel } from '@/src/utils/agenda-now';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { generateDailyInsight, invalidateDailyInsight, chatWithArgosEx, saveConversation } from '@/src/services/argos-service';
import { addWater } from '@/src/services/hydration-service';
import { getCurrentStreak } from '@/src/services/adherence-service';
import {
  getHeroRecommendation, HERO_CACHE_MS,
  type HeroContext, type HeroRecommendation, type CyclePhase,
} from '@/src/services/hero-recommendation-service';
import { getCycleInfo } from '@/src/services/cycle-service';
import { getActiveFast } from '@/src/services/fasting-service';
import { buildDailyReview, type DailyReview } from '@/src/services/daily-review-service';
import { getWeeklyInsight, isWeeklyInsightTime, type WeeklyInsightData } from '@/src/services/weekly-insight-service';
import { speakArgos } from '@/src/services/argos-voice';
// VoiceButton removido del HOY (decisión 21-jun). handleQuickVoice + modal de respuesta quedan
// como código muerto hasta el sprint de cleanup HOY profundo.
import AsyncStorage from '@react-native-async-storage/async-storage';
// #v13d 2.7: HoyDayCard legacy → HoyDayCardEditorial (imagen B/N + tipografía display).
import { HoyDayCardEditorial } from '@/src/components/economy/HoyDayCardEditorial';
import { AppTour } from '@/src/components/AppTour';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import { CARD, SEMANTIC, SURFACES } from '@/src/constants/brand';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const SCREEN_WIDTH = Dimensions.get('window').width;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

// Momentos del día para agrupar suplementos (mismo modelo que app/supplements.tsx).
const SUPP_TIMINGS = [
  { id: 'morning', label: 'Mañana', icon: 'sunny-outline' as const, color: '#fbbf24' },
  { id: 'with_food', label: 'Con comida', icon: 'restaurant-outline' as const, color: '#a8e02a' },
  { id: 'afternoon', label: 'Tarde', icon: 'partly-sunny-outline' as const, color: '#fb923c' },
  { id: 'evening', label: 'Noche', icon: 'moon-outline' as const, color: '#818cf8' },
  { id: 'bedtime', label: 'Antes de dormir', icon: 'bed-outline' as const, color: '#c084fc' },
] as const;

// ═══ HELPERS ═══

/** Color del score según porcentaje */
function scoreColor(pct: number): string {
  if (pct >= 70) return '#a8e02a';
  if (pct >= 50) return '#fbbf24';
  return '#fb7185';
}

/** Etiqueta del score según porcentaje */
function scoreLabel(pct: number): string {
  if (pct >= 90) return 'MÁXIMA CARGA';
  if (pct >= 70) return 'BUENA CARGA';
  if (pct >= 50) return 'CARGANDO';
  if (pct >= 20) return 'BAJA CARGA';
  return 'SIN CARGA';
}

/** Color de categoría para el timeline */
function getCatColor(category?: string): string {
  if (!category) return '#444';
  const c = category.toLowerCase();
  if (c.includes('fitness') || c.includes('exercise')) return '#a8e02a';
  if (c.includes('nutrition') || c.includes('meal') || c.includes('supplement')) return '#5B9BD5';
  if (c.includes('mind') || c.includes('meditation') || c.includes('breathing')) return '#7F77DD';
  if (c.includes('optimization') || c.includes('habit')) return '#EF9F27';
  if (c.includes('rest') || c.includes('sleep')) return '#666';
  return '#444';
}

/** Formato display 24h → "8:30" (sin AM/PM, corto) */
function fmtTime(t: string): string {
  if (!t) return '';
  // Ya viene en 24h: "08:30", "14:00"
  const [h, m] = t.split(':').map(s => parseInt(s, 10));
  return `${h}:${String(m || 0).padStart(2, '0')}`;
}

/** Parse hora de un time string a minutos del día */
function toMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.replace(/[^0-9:]/g, '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * HOY-11: registrar delta de agua con visibilidad de error.
 * addWater() ya cae a null en error interno; aquí surfaceamos para no
 * dejar al usuario tocando un botón muerto sin feedback.
 */
async function handleWaterDelta(userId: string, deltaMl: number): Promise<void> {
  haptic.light();
  try {
    const result = await addWater(userId, deltaMl);
    if (result === null) {
      logWarn('[HOY] addWater returned null', { userId, deltaMl });
      Alert.alert('No se pudo registrar', 'Inténtalo de nuevo en un momento.');
    }
  } catch (e) {
    logWarn('[HOY] addWater threw', e);
    Alert.alert('No se pudo registrar', 'Inténtalo de nuevo en un momento.');
  }
}

/** Segmentar agenda por franjas horarias */
function segmentAgenda(items: CompiledDay['agendaItems']) {
  const sorted = [...items].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  const morning: typeof items = [];
  const afternoon: typeof items = [];
  const evening: typeof items = [];

  for (const item of sorted) {
    const h = Math.floor(toMinutes(item.time) / 60);
    if (h >= 5 && h < 12) morning.push(item);
    else if (h >= 12 && h < 18) afternoon.push(item);
    else evening.push(item);
  }

  return [
    { label: 'MAÑANA', icon: 'sunny-outline' as const, color: '#fbbf24', items: morning },
    { label: 'TARDE', icon: 'partly-sunny-outline' as const, color: '#fb923c', items: afternoon },
    { label: 'NOCHE', icon: 'moon-outline' as const, color: '#818cf8', items: evening },
  ].filter(seg => seg.items.length > 0);
}

// ═══ COMPONENTE PRINCIPAL ═══

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // --- Estado único ---
  const [day, setDay] = useState<CompiledDay | null>(null);
  const [loading, setLoading] = useState(true);
  // Progreso real del compile (alimenta SplashLoader 0-100% en vez del spinner indeterminado).
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Iniciando…');
  // F3 (AGENDA-COMPLETE): la campana ahora es NotificationBellIcon (self-contained,
  // badge = user_notifications sin leer, tap → /notifications).
  // #tabs-redesign V1.3: visibilidad de las cards editoriales (default: todas).
  const [cardsVisible, setCardsVisible] = useState<Set<string>>(new Set(HOY_CARD_ORDER_DEFAULT));
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceConversationId, setVoiceConversationId] = useState<string | null>(null);
  const [uvMini, setUvMini] = useState<{ current: number; level: string; color: string; emoji: string; advice: string; vitaminD?: string } | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [wearable, setWearable] = useState<WearableData | null>(null);
  const [supplements, setSupplements] = useState<{ id: string; name: string; dosage: string; timing: string }[]>([]);
  const [suppTaken, setSuppTaken] = useState<Record<string, boolean>>({});
  // Override de expansión por momento del día (undefined = colapsado si todo tomado).
  const [openTimings, setOpenTimings] = useState<Record<string, boolean>>({});
  const [hasJournalToday, setHasJournalToday] = useState<boolean>(true);
  const [journalDraft, setJournalDraft] = useState('');
  const [journalSaving, setJournalSaving] = useState(false);
  const [dailyReview, setDailyReview] = useState<DailyReview | null>(null);
  const [dailyReviewDismissed, setDailyReviewDismissed] = useState(false);
  // Gate de género para electrones (period_log) — null hasta que carga.
  const [userSex, setUserSex] = useState<string | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsightData | null>(null);
  const [weeklyInsightDismissed, setWeeklyInsightDismissed] = useState(false);
  // HOY-5: contador (no flag booleano). Un toggle solapado con otro mantiene
  // el contador > 0 hasta que todos terminen — recién entonces los listeners
  // disparan loadDay.
  const isTogglingRef = useRef(0);
  // HOY-5: id del setTimeout que dispara la recompilación post-toggle.
  // Cancelar el previo antes de programar uno nuevo evita doble loadDay.
  const recompileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // HOY-9: id del setTimeout que limpia el voice response. Cancelable +
  // cleanup en unmount → evita setState sobre componente desmontado.
  const voiceClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // HOY-6: ref que espeja `suppTaken` para evitar leer estado stale del
  // closure cuando el usuario toggle dos suplementos rápido.
  const suppTakenRef = useRef<Record<string, boolean>>({});
  // #68: recomendación HERO dinámica + timestamp del último cómputo (cache 15
  // min para que la recomendación no cambie de forma errática entre focus).
  const [heroRec, setHeroRec] = useState<HeroRecommendation | null>(null);
  const heroRecAtRef = useRef(0);

  /**
   * #68: arma el contexto (mayormente ya cargado en CompiledDay) + 3 señales
   * baratas (ciclo/ayuno/última Edad ATP) y evalúa las reglas locales.
   * `force` ignora el cache (lo usa loadDay cuando el día cambió de verdad).
   */
  const computeHeroRec = useCallback(async (compiled: CompiledDay, streakVal: number | null, force = false) => {
    if (!user?.id) return;
    const now = Date.now();
    if (!force && heroRecAtRef.current && now - heroRecAtRef.current < HERO_CACHE_MS) return;
    heroRecAtRef.current = now;

    // Señales extra (baratas, en paralelo; cualquiera puede fallar sin romper)
    let cyclePhase: CyclePhase | null = null;
    let fastingActive = false;
    let edadAtpDelta: number | null = null;
    const [cycleRes, fastRes, edadRes] = await Promise.allSettled([
      userSex === 'female' ? getCycleInfo(user.id) : Promise.resolve(null),
      getActiveFast(user.id),
      supabase.from('edad_atp_calculations')
        .select('chronological_age, edad_integral')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (cycleRes.status === 'fulfilled' && cycleRes.value?.currentPhase) {
      cyclePhase = cycleRes.value.currentPhase as CyclePhase;
    }
    if (fastRes.status === 'fulfilled') fastingActive = !!fastRes.value;
    if (edadRes.status === 'fulfilled' && edadRes.value?.data?.edad_integral != null) {
      edadAtpDelta = Number(edadRes.value.data.chronological_age) - Number(edadRes.value.data.edad_integral);
    }

    const quant = (k: string) => compiled.quantitativeElectrons.find(e => e.source === k);
    const bool = (k: string) => compiled.booleanElectrons.find(e => e.source === k);
    const ctx: HeroContext = {
      hour: new Date().getHours(),
      score: compiled.electronProgress.percentage,
      streak: streakVal ?? 0,
      waterMl: quant('water')?.current ?? 0,
      waterTargetMl: quant('water')?.target ?? 0,
      proteinG: quant('protein')?.current ?? 0,
      proteinTargetG: quant('protein')?.target ?? 0,
      sunDone: bool('sunlight')?.completed ?? false,
      meditationDone: bool('meditation')?.completed ?? false,
      journalDone: bool('journal')?.completed ?? false,
      fastingActive,
      sex: userSex === 'female' || userSex === 'male' ? userSex : null,
      cyclePhase,
      edadAtpDelta,
    };
    setHeroRec(getHeroRecommendation(ctx));
  }, [user?.id, userSex]);

  // --- Carga de datos ---
  const loadDay = useCallback(async () => {
    if (!user?.id) return;
    let compiledForHero: CompiledDay | null = null;
    let streakForHero: number | null = null;
    try {
      const compiled = await compileDay(user.id, (pct, label) => { setProgress(pct); setProgressLabel(label); });
      if (compiled) { setDay(compiled); compiledForHero = compiled; }
    } catch (e) {
      console.warn('Error compiling day:', e);
    }
    try {
      const s = await getCurrentStreak(user.id);
      setStreak(s);
      streakForHero = s;
    } catch { /* silencioso */ }
    // #68: recomputar la recomendación HERO (respeta el cache de 15 min).
    if (compiledForHero) {
      computeHeroRec(compiledForHero, streakForHero).catch(() => { /* silencioso */ });
    }
    try {
      const today = getLocalToday();
      const [suppsRes, logsRes, journalRes] = await Promise.all([
        supabase.from('user_supplements').select('id, name, dosage, timing').eq('user_id', user.id).eq('is_active', true).order('timing'),
        supabase.from('supplement_logs').select('supplement_id, taken').eq('user_id', user.id).eq('date', today),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('date', today),
      ]);
      setSupplements(suppsRes.data ?? []);
      const taken: Record<string, boolean> = {};
      (logsRes.data ?? []).forEach((l: any) => { taken[l.supplement_id] = !!l.taken; });
      // HOY-6: mantener el ref en sync con el estado canónico (DB).
      suppTakenRef.current = taken;
      setSuppTaken(taken);
      setHasJournalToday((journalRes.count ?? 0) > 0);
    } catch { /* silencioso */ }
    setLoading(false);
  }, [user?.id, computeHeroRec]);

  useEffect(() => {
    setLoading(true);
    loadDay();
    const interval = setInterval(loadDay, REFRESH_INTERVAL);
    // HOY-5: el contador > 0 indica que algún toggle está en vuelo — los
    // listeners NO disparan loadDay hasta que todos terminen.
    const sub1 = DeviceEventEmitter.addListener('day_changed', () => {
      if (isTogglingRef.current === 0) loadDay();
      // H7: el contexto del día cambió → invalida el insight cacheado (se regenera
      // en la próxima carga del Home). Lazy: no dispara LLM aquí.
      if (user?.id) invalidateDailyInsight(user.id);
    });
    const sub2 = DeviceEventEmitter.addListener('electrons_changed', () => {
      if (isTogglingRef.current === 0) loadDay();
    });
    return () => {
      clearInterval(interval);
      sub1.remove();
      sub2.remove();
      // HOY-5/HOY-9: limpiar timeouts pendientes al desmontar para no
      // hacer setState sobre componente desmontado.
      if (recompileTimeoutRef.current) clearTimeout(recompileTimeoutRef.current);
      if (voiceClearTimeoutRef.current) clearTimeout(voiceClearTimeoutRef.current);
    };
  }, [loadDay]);

  // F04.8 + F01.4: re-render ligero cada 60s (sin refetch) para que el divisor "AHORA" y el
  // fondo dinámico por hora se actualicen en vivo al cruzar el minuto/franja (REFRESH_INTERVAL
  // es de 5 min, demasiado grueso para un reloj). Solo fuerza re-render; no toca la DB.
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMinuteTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Wearable (cardio del día + pasos). Hoy el servicio es un stub → null (placeholder).
  // Cuando se reactive HealthKit/Health Connect, estos cards muestran datos reales sin más cambios.
  useEffect(() => {
    let alive = true;
    getWearableDataForDate(getLocalToday())
      .then((w) => { if (alive) setWearable(w); })
      .catch(() => { if (alive) setWearable(null); });
    return () => { alive = false; };
  }, [user?.id]);

  // F36.7/F49/F03.7: defense-in-depth. Si el `day_changed` event no llega
  // (RN-Web inconsistente, listener silenciado por isTogglingRef, navegación
  // que dispara el emit mientras HOY está desmontado), refrescamos al
  // recuperar focus. Cubre los 3 casos de Paty: cambio de meta agua,
  // toggle de electrón en config, edición de wake_time.
  useFocusEffect(useCallback(() => {
    if (isTogglingRef.current === 0) loadDay();
    // #tabs-redesign V1.3: refrescar visibilidad de cards al enfocar.
    if (user?.id) getCardsVisible(user.id).then(setCardsVisible).catch(() => {});
  }, [loadDay, user?.id]));

  // #tabs-redesign V1.3: re-cargar visibilidad cuando se togglea en /protocol-config.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('hoy_visibility_changed', () => {
      if (user?.id) getCardsVisible(user.id).then(setCardsVisible).catch(() => {});
    });
    return () => sub.remove();
  }, [user?.id]);

  // --- Tour de onboarding ---
  useEffect(() => {
    AsyncStorage.getItem('@atp/tour_completed').then(v => {
      if (v !== 'true') setShowTour(true);
    });
  }, []);

  // Sexo biológico para gate de electrones (period_log).
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('client_profiles')
      .select('biological_sex')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { setUserSex((data as any)?.biological_sex ?? null); });
  }, [user?.id]);

  // HOY-8: refs para leer el `day`/`streak` más recientes sin que el efecto
  // se re-dispare con cada mutación.
  const dayRef = useRef<CompiledDay | null>(null);
  const streakRef = useRef<number | null>(null);
  useEffect(() => { dayRef.current = day; }, [day]);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  // --- Daily Review: render solo de noche (≥20h); dismiss persiste por día ---
  // HOY-8: depende solo de `user?.id` y de si `day` ya cargó (booleano), NO de
  // las mutaciones de `day`. Las 3 queries internas solo corren en la
  // transición null→loaded, no en cada toggle. Cancelación descarta
  // resultados stale si el usuario navega o el efecto se re-dispara.
  const hasDay = !!day;
  useEffect(() => {
    if (!user?.id || !hasDay) return;
    const hourNow = new Date().getHours();
    if (hourNow < 20) { setDailyReview(null); return; }
    const today = getLocalToday();
    const key = `@atp/daily_review_dismissed:${today}`;

    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(key);
        if (cancelled) return;
        if (v === 'true') {
          setDailyReviewDismissed(true);
          return;
        }
        setDailyReviewDismissed(false);
        const currentDay = dayRef.current;
        if (!currentDay) return;
        const r = await buildDailyReview(user.id, currentDay, streakRef.current ?? 0);
        if (!cancelled) setDailyReview(r);
      } catch { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id, hasDay]);

  function dismissDailyReview() {
    const key = `@atp/daily_review_dismissed:${getLocalToday()}`;
    AsyncStorage.setItem(key, 'true').catch(() => {});
    setDailyReviewDismissed(true);
    haptic.light();
  }

  // --- Weekly Insight: domingo ≥19h. 1 llamada/semana cacheada. ---
  useEffect(() => {
    if (!user?.id) return;
    if (!isWeeklyInsightTime()) { setWeeklyInsight(null); return; }
    // Dismiss por week_start (no por día). Persistimos al obtener el insight,
    // porque la key real depende de week_start.
    (async () => {
      const insight = await getWeeklyInsight(user.id);
      if (!insight) return;
      const key = `@atp/weekly_insight_dismissed:${insight.weekStart}`;
      const dismissed = await AsyncStorage.getItem(key);
      setWeeklyInsightDismissed(dismissed === 'true');
      setWeeklyInsight(insight);
    })();
  }, [user?.id]);

  function dismissWeeklyInsight() {
    if (!weeklyInsight) return;
    const key = `@atp/weekly_insight_dismissed:${weeklyInsight.weekStart}`;
    AsyncStorage.setItem(key, 'true').catch(() => {});
    setWeeklyInsightDismissed(true);
    haptic.light();
  }


  // --- UV mini-card (ATP SOL) ---
  useEffect(() => {
    (async () => {
      try {
        const { getCurrentLocation, fetchUVData, getUVLevel } = await import('@/src/services/uv-service');
        const loc = await getCurrentLocation();
        if (!loc) return;
        const data = await fetchUVData(loc.latitude, loc.longitude);
        if (!data) return;
        const lvl = getUVLevel(data.currentUV);
        setUvMini({
          current: data.currentUV,
          level: lvl.level,
          color: lvl.color,
          emoji: lvl.emoji,
          advice: lvl.advice,
          vitaminD: data.vitaminDWindow ? `Vitamina D: ${data.vitaminDWindow.start}-${data.vitaminDWindow.end}` : undefined,
        });
      } catch (e) { /* opcional */ }
    })();
  }, []);

  // --- Insight diario ARGOS (refresca cada 6h) ---
  // F3 (AGENDA-COMPLETE): HOY solo genera+cachea en argos_daily_insights; el consumo
  // (render) se movió a /notifications (card INSIGHT ARGOS fijada arriba).
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const today = getLocalToday();
      // Cache en Supabase — válido por 6 horas
      try {
        const { data: cached } = await supabase
          .from('argos_daily_insights')
          .select('insight, created_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();
        if (cached?.insight) {
          const cacheAge = cached.created_at
            ? (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60)
            : Infinity;
          if (cacheAge < 6) return; // Cache fresco, no regenerar
        }
      } catch (_) { /* sin cache */ }
      // Generar nuevo
      try {
        const insight = await generateDailyInsight(user.id);
        if (insight) {
          await supabase.from('argos_daily_insights').upsert(
            { user_id: user.id, date: today, insight, created_at: new Date().toISOString() },
            { onConflict: 'user_id,date' },
          );
        }
      } catch (_) { /* silencioso */ }
    })();
  }, [user?.id]);

  // --- Toggle electrón booleano ---
  /**
   * Handler unificado para tap en un electrón booleano de la grid o del
   * próximo-electrón card. Para los verificados (meditation, breathwork,
   * strength, supplements): NO togglea — lleva a la pantalla de actividad.
   * El compilador los prende solos en el siguiente recompile si hay sesión real.
   */
  function onElectronTap(source: string) {
    if ((VERIFIED_ELECTRON_KEYS as readonly string[]).includes(source)) {
      haptic.light();
      router.push(VERIFIED_ELECTRON_ROUTES[source as VerifiedElectronKey] as any);
      return;
    }
    toggleBoolean(source);
  }

  async function toggleBoolean(source: string) {
    if (!user?.id || !day) return;
    // Guard defensivo: si un verificado se cuela aquí, no falsearlo en DB.
    if ((VERIFIED_ELECTRON_KEYS as readonly string[]).includes(source)) {
      logWarn('[HOY] toggleBoolean called on verified electron — ignoring', source);
      return;
    }
    haptic.medium();
    const today = getLocalToday();

    // Buscar el electrón actual
    const el = day.booleanElectrons.find(e => e.source === source);
    if (!el) return;
    const wasCompleted = el.completed;

    // Optimistic update
    setDay(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.booleanElectrons = prev.booleanElectrons.map(e =>
        e.source === source ? { ...e, completed: !wasCompleted } : e
      );
      // Recalcular progreso
      let earned = 0, possible = 0;
      for (const e of updated.booleanElectrons) {
        possible += e.weight;
        if (e.completed) earned += e.weight;
      }
      for (const e of updated.quantitativeElectrons) {
        possible += e.weight;
        earned += e.weight * Math.min(1, e.target > 0 ? e.current / e.target : 0);
      }
      earned = Math.round(earned * 10) / 10;
      possible = Math.round(possible * 10) / 10;
      const percentage = possible > 0 ? Math.round((earned / possible) * 100) : 0;
      updated.electronProgress = { earned, possible, percentage };
      return updated;
    });

    // Dual write: daily_electrons + electron_logs
    // HOY-5: contador, no flag. Permite toggles solapados sin que un toggle
    // que termina antes destape el guard mientras otro sigue en vuelo.
    isTogglingRef.current += 1;
    try {
      // 1) daily_electrons (JSONB para UI rápida)
      const newStates: Record<string, boolean> = {};
      for (const e of day.booleanElectrons) {
        newStates[e.source] = e.source === source ? !wasCompleted : e.completed;
      }
      const { error: deErr } = await supabase
        .from('daily_electrons')
        .upsert({ user_id: user.id, date: today, electrons: newStates }, { onConflict: 'user_id,date' });
      if (deErr) {
        // ÍTEM 4: visibilidad sobre fallos del upsert que antes silenciaba
        // la falta de destructuring. Throw para activar el revert del catch.
        throw deErr;
      }

      // 2) electron_logs (acumulado)
      if (wasCompleted) {
        await revokeBooleanElectron(user.id, source as any);
      } else {
        await awardBooleanElectron(user.id, source as any);
      }
      DeviceEventEmitter.emit('electrons_changed');
    } catch (e) {
      logWarn('[HOY] Error toggling electron:', e);
      // Revertir optimistic update en caso de error
      setDay(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          booleanElectrons: prev.booleanElectrons.map(el =>
            el.source === source ? { ...el, completed: wasCompleted } : el
          ),
        };
      });
    } finally {
      isTogglingRef.current = Math.max(0, isTogglingRef.current - 1);
    }

    // Recompilar para sincronizar nextElectron y suggestion (sin race condition).
    // HOY-5: cancelar la recompilación previa antes de programar una nueva
    // → toggles rápidos repetidos disparan UNA sola recompilación al final.
    if (recompileTimeoutRef.current) clearTimeout(recompileTimeoutRef.current);
    recompileTimeoutRef.current = setTimeout(() => {
      recompileTimeoutRef.current = null;
      loadDay();
    }, 300);
  }

  // --- Toggle agenda item ---
  async function toggleAgendaItem(itemId: string) {
    if (!day || !user?.id) return;
    haptic.light();

    // Optimistic update
    setDay(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agendaItems: prev.agendaItems.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      };
    });

    // Persist en daily_plans
    try {
      const today = getLocalToday();
      const { data: plan } = await supabase
        .from('daily_plans')
        .select('actions')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      // HOY-7: `plan.actions` es JSONB → puede venir null, objeto, string, etc.
      // Validar shape en runtime antes de `.map` para no crashear.
      if (plan?.actions && Array.isArray(plan.actions)) {
        const updatedActions = plan.actions.map((a: any) =>
          (a?.id === itemId || `p-${a?.scheduled_time}` === itemId)
            ? { ...a, completed: !a?.completed }
            : a
        );
        await supabase.from('daily_plans')
          .update({ actions: updatedActions })
          .eq('user_id', user.id)
          .eq('date', today);
      }
    } catch (e) {
      console.warn('Error toggling agenda item:', e);
    }
  }

  // --- EditDayModal save ---
  async function handleEditSave(bools: string[], quants: string[]) {
    if (!user?.id) return;
    try {
      await supabase.from('user_day_preferences').upsert({
        user_id: user.id,
        active_boolean_electrons: bools,
        active_quantitative_electrons: quants,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch { /* tabla puede no existir */ }
    loadDay();
  }

  // --- Quick log: journal nocturno (≥21h, sin entrada hoy) ---
  async function saveQuickJournal() {
    if (!user?.id || journalSaving) return;
    const content = journalDraft.trim();
    if (content.length < 3) return;
    setJournalSaving(true);
    haptic.medium();
    try {
      const { error } = await supabase.from('journal_entries').insert({
        user_id: user.id,
        date: getLocalToday(),
        prompt: '¿Cómo estuvo tu día?',
        content,
        journal_type: 'free',
      });
      if (error) throw error;
      try { await awardBooleanElectron(user.id, 'journal'); } catch { /* idempotent */ }
      setHasJournalToday(true);
      setJournalDraft('');
      DeviceEventEmitter.emit('electrons_changed');
      DeviceEventEmitter.emit('day_changed');
      haptic.success();
    } catch (e) {
      console.warn('Quick journal error:', e);
    } finally {
      setJournalSaving(false);
    }
  }

  // --- Quick log: suplemento (toggle por item) ---
  // Mantiene el boolean electron 'supplements' en sync: cualquier suplemento
  // tomado hoy lo activa; al destomar el último, se revoca.
  async function toggleSupplement(supplementId: string) {
    if (!user?.id) return;
    haptic.light();
    const today = getLocalToday();
    // HOY-6: leer desde el ref (estado más reciente), no del closure que
    // captura `suppTaken` en el momento de definir la función.
    const wasTaken = !!suppTakenRef.current[supplementId];
    const nextSuppTaken = { ...suppTakenRef.current, [supplementId]: !wasTaken };
    // Actualizar el ref ANTES del setState — así un toggle solapado lee el
    // valor recién proyectado y no el anterior.
    suppTakenRef.current = nextSuppTaken;

    // Optimistic
    setSuppTaken(nextSuppTaken);

    try {
      if (wasTaken) {
        await supabase.from('supplement_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('supplement_id', supplementId)
          .eq('date', today);
      } else {
        await supabase.from('supplement_logs').upsert({
          user_id: user.id, supplement_id: supplementId, date: today, taken: true,
        }, { onConflict: 'user_id,supplement_id,date' });
        // Economía (fire-and-forget; no-op si flag OFF). Misma key que la pantalla Suplementos
        // → idempotente entre ambos paths (no doble award).
        fireElectronAward({
          habit_type: 'supplement_check', evidence_tier: 'self', local_date: today,
          idempotency_key: `supplement_check_${user.id}_${today}_${supplementId}`,
          metadata: { supplement_id: supplementId, source: 'hoy_quicktoggle' },
        });
      }

      // Sync boolean electron 'supplements' con estado agregado.
      // HOY-6: usar la proyección fresca, no la del closure.
      const anyTaken = Object.values(nextSuppTaken).some(Boolean);
      const currentStates: Record<string, boolean> = {};
      if (day) {
        for (const e of day.booleanElectrons) currentStates[e.source] = e.completed;
      }
      const wasCompleted = currentStates['supplements'] === true;
      if (anyTaken && !wasCompleted) {
        currentStates['supplements'] = true;
        await supabase.from('daily_electrons').upsert(
          { user_id: user.id, date: today, electrons: currentStates },
          { onConflict: 'user_id,date' },
        );
        await awardBooleanElectron(user.id, 'supplements');
      } else if (!anyTaken && wasCompleted) {
        currentStates['supplements'] = false;
        await supabase.from('daily_electrons').upsert(
          { user_id: user.id, date: today, electrons: currentStates },
          { onConflict: 'user_id,date' },
        );
        await revokeBooleanElectron(user.id, 'supplements');
      }
      DeviceEventEmitter.emit('electrons_changed');
      DeviceEventEmitter.emit('day_changed');
    } catch (e) {
      console.warn('Toggle supplement error:', e);
      // HOY-6: rollback en ref + estado, juntos.
      suppTakenRef.current = { ...suppTakenRef.current, [supplementId]: wasTaken };
      setSuppTaken(prev => ({ ...prev, [supplementId]: wasTaken }));
    }
  }

  // Quick-logs de mood (caritas) y glucosa eliminados del HOY (sprint cleanup): el mood se
  // captura en /checkin y la glucosa en /glucose-log (no es realista en MVP sin CGM).

  // --- Quick voice desde HOY (sin abrir chat) ---
  async function handleQuickVoice(transcript: string) {
    if (!user?.id) return;
    setVoiceLoading(true);
    setVoiceResponse('');
    setVoiceTranscript(transcript);
    try {
      const messages = [{ role: 'user' as const, content: transcript }];
      const result = await chatWithArgosEx(user.id, messages);
      setVoiceResponse(result.text);

      // ARG-2: si la respuesta fue degradada (rate-limited / providers caídos),
      // NO persistir ni hablar — solo mostrar el texto en la UI para feedback.
      if (!result.degraded) {
        const allMessages = [...messages, { role: 'assistant' as const, content: result.text }];
        const id = await saveConversation(user.id, allMessages);
        setVoiceConversationId(id);

        await speakArgos(result.text);
      }
      // HOY-9: guardar el id del timeout y cancelarlo si se reemplaza o el
      // componente se desmonta → evita setState sobre componente desmontado.
      if (voiceClearTimeoutRef.current) clearTimeout(voiceClearTimeoutRef.current);
      voiceClearTimeoutRef.current = setTimeout(() => {
        voiceClearTimeoutRef.current = null;
        setVoiceResponse('');
        setVoiceConversationId(null);
      }, 15000);
    } catch (e) {
      console.error('Quick voice error:', e);
    } finally {
      setVoiceLoading(false);
    }
  }

  // --- Derivados ---
  const hour = new Date().getHours();
  const pct = day?.electronProgress.percentage ?? 0;
  const heroBg = getHoyBackgroundRequire(hour, pct);
  const elColor = scoreColor(pct);
  const elLabel = scoreLabel(pct);

  // ═══ RENDER ═══

  // Carga unificada: misma identidad visual que el splash nativo + barra de progreso REAL
  // (0-100% alimentada por compileDay). Reemplaza el spinner indeterminado "Compilando tu día…".
  if (loading && !day) {
    return (
      <>
        <StatusBar style="light" />
        <SplashLoader progress={progress} label={progressLabel} />
      </>
    );
  }

  if (!day) {
    // HOY-10: primera carga falló (típicamente red) → SplashLoader en modo error con Reintentar.
    return (
      <>
        <StatusBar style="light" />
        <SplashLoader
          progress={progress}
          error="No se pudo cargar tu día."
          onRetry={() => { haptic.medium(); setProgress(0); setLoading(true); loadDay(); }}
        />
      </>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ═══════════════════════════════════════
            SECCIÓN 1: HERO
        ═══════════════════════════════════════ */}
        <ImageBackground source={heroBg} style={s.heroBg} imageStyle={s.heroBgImage} resizeMode="cover">
          <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)', '#000']}
            locations={[0, 0.3, 0.7, 1]}
            style={[s.heroGradient, { paddingTop: insets.top + 8 }]}
          >
            {/* Top bar */}
            <Animated.View entering={FadeInUp.delay(50).springify()}>
              <View style={s.topBar}>
                <View style={s.topBarLeft}>
                  <Text style={s.brandLabel}>ATP DAILY</Text>
                  {/* #hoy-redesign Parte 1: ElectronBadge viejo retirado del header (HoyDayCard ya
                      muestra los E- del día). El engrane se movió al botón del final del scroll. */}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* F3 (AGENDA-COMPLETE): campana con badge real (user_notifications) → /notifications. */}
                  <NotificationBellIcon />
                </View>
              </View>
              {/* P6: pill E-/H+/Rank (self-gated por LAB_ECONOMY_ENABLED; null si OFF) */}
              <EconomyHeaderPill />
            </Animated.View>

            {/* Saludo */}
            <Animated.View entering={FadeInUp.delay(80).springify()} style={s.heroGreetingWrap}>
              <Text style={s.heroGreeting}>{day.greeting}</Text>
              <Text style={s.heroName}>{day.userName}</Text>
              <Text style={s.heroDate}>{day.date}</Text>
            </Animated.View>

            {/* Protocol pill — tappable */}
            {day.protocol && (
              <Animated.View entering={FadeInUp.delay(100).springify()}>
                <Pressable onPress={() => router.push('/protocol-config' as any)} style={s.protocolPill}>
                  <Ionicons name="flask-outline" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={s.protocolPillText}>
                    {day.protocol.name} · Día {day.protocol.dayNumber}/{day.protocol.totalDays}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.4)" />
                </Pressable>
              </Animated.View>
            )}

            {/* #68: recomendación HERO dinámica — la primera regla que matchea
                (hora + hábitos + ciclo + ayuno + racha + Edad ATP) */}
            {heroRec && (
              <Animated.View key={heroRec.id} entering={FadeInUp.delay(110).springify()}>
                <AnimatedPressable
                  onPress={() => {
                    if (heroRec.route) { haptic.light(); router.push(heroRec.route as any); }
                  }}
                  disabled={!heroRec.route}
                  style={s.heroRecCard}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.heroRecKicker}>AHORA</Text>
                    <Text style={s.heroRecTitle}>{heroRec.title}</Text>
                    <Text style={s.heroRecSubtitle}>{heroRec.subtitle}</Text>
                  </View>
                  {heroRec.route && (
                    <View style={s.heroRecCta}>
                      {heroRec.cta ? <Text style={s.heroRecCtaText}>{heroRec.cta}</Text> : null}
                      <Ionicons name="chevron-forward" size={14} color="#a8e02a" />
                    </View>
                  )}
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* TU DÍA — #v13d 2.7: card editorial (imagen B/N despertar + número display + barra). */}
            <Animated.View entering={FadeInUp.delay(120).springify()}>
              <HoyDayCardEditorial
                percentage={pct}
                seedKey={user?.id}
                streak={streak}
                completedCount={day.booleanElectrons.filter(e => e.completed).length}
                totalCount={day.booleanElectrons.length}
              />
            </Animated.View>
          </LinearGradient>
        </ImageBackground>

        {/* #v13g F3: bloque AGENDA DE HOY entre TU DÍA y las sub-secciones — navega a /agenda. */}
        <View style={{ paddingHorizontal: Spacing.md }}>
          <AgendaPreviewCard userId={user?.id} />
        </View>

        {/* #tabs-redesign V1.3 Parte 1: tira de cards editoriales (aditiva, gated por visibility).
            El cleanup de las secciones viejas queda para auditoría visual (ver COWORK_REPORT). */}
        <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
          <HoyEditorialSection day={day} uvMini={uvMini} cardsVisible={cardsVisible} userId={user?.id} seedKey={user?.id} />
        </View>

        {/* Insight ARGOS movido a notificaciones (campana) */}

        {/* #hoy-funcionalidad 4.9: SECCIÓN 2 "PRÓXIMO ELECTRÓN" (botón COMPLETAR) eliminada
            — reemplazada por HeroAgendaCard en HoyEditorialSection. */}

        {/* ═══════════════════════════════════════
            WEEKLY INSIGHT — Domingo ≥19h (cacheado por semana)
        ═══════════════════════════════════════ */}
        {weeklyInsight && !weeklyInsightDismissed && (
          <Animated.View entering={FadeInUp.delay(140).springify()} style={s.section}>
            <View style={s.weeklyCard}>
              <View style={s.weeklyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="eye" size={14} color="#a8e02a" />
                  <Text style={s.weeklyLabel}>LECTURA DE LA SEMANA</Text>
                </View>
                <Pressable onPress={dismissWeeklyInsight} hitSlop={10}>
                  <Ionicons name="close" size={16} color="#666" />
                </Pressable>
              </View>

              {/* Adherencia por pilar */}
              <View style={{ marginTop: 10, gap: 6 }}>
                {(weeklyInsight.adherence ?? []).map(p => {
                  const arrow = p.delta > 4 ? '↑' : p.delta < -4 ? '↓' : '·';
                  const arrowColor = p.delta > 4 ? '#a8e02a' : p.delta < -4 ? '#fb7185' : '#666';
                  return (
                    <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.weeklyPillarLabel}>{p.label}</Text>
                      <View style={s.weeklyPillarTrack}>
                        <View style={[s.weeklyPillarFill, { width: `${p.pct}%` }]} />
                      </View>
                      <Text style={s.weeklyPillarPct}>{p.pct}%</Text>
                      <Text style={[s.weeklyPillarDelta, { color: arrowColor }]}>{arrow}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Texto ARGOS o degradación */}
              {weeklyInsight.argosFailed ? (
                <Text style={s.weeklyFallback}>
                  No pudimos generar el insight reflexivo esta semana — los números arriba ya cuentan tu historia.
                </Text>
              ) : (
                <>
                  {weeklyInsight.argosText ? (
                    <Text style={s.weeklyText}>{weeklyInsight.argosText}</Text>
                  ) : null}
                  {weeklyInsight.question ? (
                    <Text style={s.weeklyQuestion}>{weeklyInsight.question}</Text>
                  ) : null}
                </>
              )}
            </View>
          </Animated.View>
        )}

        {/* #v13e 3.C: "Cierre del día" (DAILY REVIEW) eliminado del HOY — su mini-reporte (score,
            electrones, racha) ahora vive integrado en la card TU DÍA (HoyDayCardEditorial). */}

        {/* H8: card de acceso directo "Check-in emocional" eliminada — el acceso queda solo
            en el hábito de Check-in (que navega a /checkin, ver H1). */}

        {/* #v13e 3.C: "Actividad" (wearable Cardio hoy + Pasos) eliminada del HOY — las cards
            editoriales CARDIO (km/min, 3.B.3) y PASOS (3.B.2) arriba ya cubren esto. */}

        {/* #v13e 3.C: "¿Cómo estuvo tu día?" (journal nocturno inline) eliminado del HOY —
            la card JOURNAL navega a /journal donde se registra (no aportaba valor extra aquí). */}

        {/* #v13e 3.C: "Suplementos de hoy" (tabla con timing groups) eliminada del HOY — vive en
            /supplements (accesible desde MI ATP → HÁBITOS → SUPLEMENTACIÓN). Saturaba el HOY. */}

        {/* #v13d 2.4: UV mini-card legacy eliminada — la card UV editorial (HoyEditorialSection)
            ya cubre esto con más impacto. `uvMini` se mantiene (alimenta esa card). */}

        {/* #hoy-funcionalidad 4.9: SECCIÓN 3 "ELECTRONES" (grid 2x4) eliminada — los electrones
            ahora son cards editoriales (toggle desde card) en HoyEditorialSection. */}

        {/* #hoy-funcionalidad 4.9: SECCIÓN 4 "CUANTITATIVOS" (barras proteína/agua sueltas)
            eliminada — ahora son cards editoriales PROTEÍNA/AGUA con barra + quickActions. */}

        {/* #v13d 2.4: SECCIÓN 5 "SUGERENCIA INTELIGENTE" (IA recommended) eliminada — decisión
            Enrique: las cards editoriales contextuales (Hero/AYUNO/UV) ya cubren esto. */}

        {/* Botón configurar protocolo */}
        <AnimatedPressable
          onPress={() => { haptic.light(); router.push('/protocol-config' as any); }}
          style={s.editDayBtn}
        >
          <Ionicons name="options-outline" size={16} color="#666" />
          <Text style={s.editDayBtnText}>Configurar mi protocolo</Text>
        </AnimatedPressable>

        <EditDayModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          activeBooleans={day.booleanElectrons.map(e => e.source)}
          activeQuantitatives={day.quantitativeElectrons.map(e => e.source)}
          agendaActions={day.agendaItems.map(a => ({
            id: a.id, name: a.name, time: a.time,
            category: a.category, completed: a.completed,
          }))}
          userSex={userSex}
          onSave={async (bools, quants, _actions) => {
            await handleEditSave(bools, quants);
          }}
        />

        {/* #hoy-funcionalidad 4.9: SECCIÓN 6 "AGENDA" triple (MAÑANA/TARDE/NOCHE) eliminada
            — el próximo evento vive en HeroAgendaCard; la agenda completa irá a AGENDA V2. */}

        {/* Espaciado inferior para tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Tour de onboarding */}
      {showTour && <AppTour onComplete={() => setShowTour(false)} />}

      {/* F3 (AGENDA-COMPLETE): el modal de la campana se retiró — el inbox vive en /notifications
          (el INSIGHT ARGOS del día se muestra ahí, fijado arriba). */}

      {/* ARGOS response → bottom sheet expandible (F07.3). Snap 25/50/90, drag, scroll. */}
      <ExpandableSheet
        visible={!!voiceResponse}
        onClose={() => { setVoiceResponse(''); setVoiceConversationId(null); }}
        title="ARGOS"
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
          <Text style={{ color: '#ddd', fontSize: 15, lineHeight: 23 }}>{voiceResponse}</Text>
        </ScrollView>
        <Pressable
          onPress={() => {
            haptic.medium();
            const convId = voiceConversationId;
            setVoiceResponse('');
            setVoiceConversationId(null);
            if (convId) router.push({ pathname: '/argos-chat', params: { conversationId: convId } });
            else router.push('/argos-chat');
          }}
          style={{
            marginTop: 12, backgroundColor: 'rgba(168,224,42,0.15)', borderRadius: 12,
            paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,224,42,0.3)',
          }}
        >
          <Text style={{ color: '#a8e02a', fontFamily: Fonts.bold, fontSize: 14 }}>Ver conversación completa →</Text>
        </Pressable>
      </ExpandableSheet>

      {/* ARGOS dual FAB: mic + chat */}
      <View style={{ position: 'absolute', bottom: 90, right: 20, zIndex: 100, alignItems: 'flex-end' }}>
        {voiceLoading ? (
          <View style={{
            backgroundColor: '#0a0a0a', borderRadius: 12, padding: 10,
            marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
            borderWidth: 1, borderColor: 'rgba(168,224,42,0.2)',
          }}>
            <ActivityIndicator size="small" color="#a8e02a" />
            <Text style={{ color: '#a8e02a', fontSize: 12 }}>ARGOS piensa...</Text>
          </View>
        ) : null}

        {/* N1: ARGOS vive en el menú inferior, no como FAB. Mic FAB removido. */}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#a8e02a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandLabel: {
    color: 'rgba(255,255,255,0.6)', // acento moderado: brand label neutral, no compite con el héroe lima
    letterSpacing: 3,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
  },
  streakPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(251,146,60,0.25)',
  },
  streakPillText: {
    color: '#fb923c',
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },

  // ── HERO ──
  heroBg: {},
  heroBgImage: {
    opacity: 0.85,
  },
  heroGradient: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  heroGreetingWrap: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
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
    fontSize: 36,
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
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  protocolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)', // acento moderado: chip de info secundaria, neutral
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  // #68: card de recomendación HERO dinámica (glass sutil sobre la foto)
  heroRecCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: Spacing.md,
  },
  heroRecKicker: {
    color: '#a8e02a',
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    letterSpacing: 2,
    marginBottom: 3,
  },
  heroRecTitle: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    lineHeight: 22,
  },
  heroRecSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginTop: 2,
    lineHeight: 17,
  },
  heroRecCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  heroRecCtaText: {
    color: '#a8e02a',
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
  },
  protocolPillText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  heroScoreWrap: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  heroScoreInfo: {
    gap: 4,
  },
  heroElectronNum: {
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  heroElectronSlash: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.4)',
  },
  heroScoreLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 3,
    marginTop: 4,
  },

  // ── Secciones ──
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl, // 32 — más aire entre secciones (jerarquía: que respire)
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12, // separación título→contenido
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

  // ── Próximo electrón ──
  nextElectronCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(168,224,42,0.2)',
    padding: Spacing.md,
    shadowColor: '#a8e02a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  nextElectronHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  nextElectronIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextElectronText: {
    flex: 1,
  },
  nextElectronLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 2,
  },
  nextElectronName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  nextElectronDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  nextElectronBtn: {
    backgroundColor: '#a8e02a',
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  nextElectronBtnText: {
    color: '#000',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  missionCompleteCard: {
    backgroundColor: 'rgba(168,224,42,0.08)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.2)',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  missionCompleteText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#a8e02a',
  },
  missionCompleteSubtext: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },

  // ── Electron grid ──
  electronGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  electronCard: {
    minHeight: 110,
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
  electronDesc: {
    fontSize: 9,
    fontFamily: Fonts.regular,
    color: '#555',
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 1,
    paddingHorizontal: 2,
  },
  electronDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  electronExpandedPanel: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    gap: 4,
  },
  electronExpandedDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  electronExpandedWeight: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.textMuted,
  },
  electronExpandedLink: {
    marginTop: 4,
  },
  electronExpandedLinkText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#a8e02a',
  },

  // ── Cuantitativos ──
  quantGrid: {
    gap: Spacing.sm,
  },
  quantCard: {
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    padding: Spacing.sm + 2,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  quantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quantCardName: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },
  quantCardValue: {
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
  waterQuickRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickLogMore: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#666',
  },
  // Check-in emocional (card navegable) + wearable
  checkinCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: CARD.bg, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 0.5, borderColor: 'rgba(244,114,182,0.25)',
  },
  checkinIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(244,114,182,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  checkinTitle: { color: '#fff', fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  checkinSub: { color: '#888', fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  wearableRow: { flexDirection: 'row', gap: Spacing.sm },
  wearableHint: { color: '#666', fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: Spacing.sm },
  suppGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  suppGroupTitle: {
    flex: 1,
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  suppGroupCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  suppGroupCountText: {
    color: '#666',
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  suppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  suppRowDone: {
    backgroundColor: 'rgba(168,224,42,0.08)',
    borderColor: 'rgba(168,224,42,0.25)',
  },
  suppDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#333',
  },
  suppName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  suppNameDone: {
    color: '#a8e02a',
    textDecorationLine: 'line-through',
  },
  suppDosage: {
    color: '#666',
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  journalCard: {
    backgroundColor: 'rgba(192,132,252,0.06)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(192,132,252,0.2)',
    padding: Spacing.md,
  },
  journalTitle: {
    color: '#c084fc',
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  journalInput: {
    color: '#fff',
    fontFamily: Fonts.regular,
    fontSize: 14,
    minHeight: 48,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  journalSaveBtn: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  journalSaveText: {
    color: '#000',
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },

  // ── Daily Review ──
  reviewCard: {
    backgroundColor: 'rgba(129,140,248,0.06)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(129,140,248,0.2)',
    padding: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewLabel: {
    color: '#818cf8',
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  reviewSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  reviewStat: {
    alignItems: 'center',
    flex: 1,
  },
  reviewStatValue: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  reviewStatLabel: {
    color: '#666',
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  reviewItem: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 17,
  },
  reviewFocus: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  reviewFocusLabel: {
    color: '#818cf8',
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  reviewFocusText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    lineHeight: 18,
  },

  // ── Weekly Insight ──
  weeklyCard: {
    backgroundColor: 'rgba(168,224,42,0.05)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.2)',
    padding: Spacing.md,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyLabel: {
    color: '#a8e02a',
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  weeklyPillarLabel: {
    width: 80,
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  weeklyPillarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  weeklyPillarFill: {
    height: '100%',
    backgroundColor: '#a8e02a',
    borderRadius: 3,
  },
  weeklyPillarPct: {
    width: 40,
    textAlign: 'right',
    color: '#fff',
    fontSize: 11,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  weeklyPillarDelta: {
    width: 14,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  weeklyText: {
    marginTop: 12,
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 19,
  },
  weeklyQuestion: {
    marginTop: 8,
    color: '#a8e02a',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  weeklyFallback: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  waterQuickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderRadius: 8,
  },
  waterQuickText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Sugerencia ──
  suggestionCard: {
    backgroundColor: 'rgba(239,159,39,0.08)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(239,159,39,0.2)',
    padding: Spacing.md,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  suggestionAction: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#EF9F27',
    marginTop: 6,
  },

  // ── Edit day button ──
  editDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
  },
  editDayBtnText: {
    color: '#666',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // ── Agenda ──
  agendaTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
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
  agendaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  agendaTime: {
    color: '#aaa', // F01.11-12: subir contraste sobre bg dark
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
  agendaCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agendaCardContent: {
    flex: 1,
  },
  agendaItemName: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  agendaItemNameDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  agendaSubtitle: {
    color: '#aaa', // F01.11-12: subir contraste sobre bg dark
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  agendaEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
  },
  agendaEmptyText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },
  agendaEmptySubtext: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#888', // F01.11-12: subir contraste (antes textMuted #555)
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
