/**
 * HOY = TAREAS — tu checklist del día. Fin. Nada más. (MB-20 Pieza 1)
 *
 * Usa compileDay() como única fuente de datos. Estructura:
 * 1. Header: saludo + fecha + campana + pill de economía
 * 2. TareasView: dos lentes (Tareas por momento / Agenda por hora),
 *    card de la orbe colapsable, progreso global y por bloque
 * 3. Economía self-gated (ProBoostCard + HPlusExplainerCard)
 * 4. Lectura de la semana (domingo ≥19h, cacheada)
 * 5. CTAs quiet: Mi Protocolo · Mis hábitos
 * Overlays: TopBanner · AppTour · ArgosReactionToast.
 *
 * MB-20: el hero fotográfico, la card AHORA, la card TU DÍA (ATP Score) y
 * el AgendaPreviewCard salieron de HOY — el motor del score sigue vivo en
 * compileDay y la agenda completa vive en /agenda (puerta en la lente).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Text,
  DeviceEventEmitter,
  Platform, UIManager,
} from 'react-native';
import { warn as logWarn } from '@/src/lib/logger';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/auth-context';
import { compileDay, type CompiledDay } from '@/src/services/day-compiler';
import { SplashLoader } from '@/src/components/SplashLoader';
import { NotificationBellIcon } from '@/src/components/hoy/NotificationBellIcon';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import { TareasView } from '@/src/components/hoy/TareasView';
import { ProBoostCard } from '@/src/components/economy/ProBoostCard';
import { HPlusExplainerCard } from '@/src/components/economy/HPlusExplainerCard';
import { EconomyHeaderPill } from '@/src/components/economy/EconomyHeaderPill';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { generateDailyInsight, invalidateDailyInsight } from '@/src/services/argos-service';
import { getWeeklyInsight, isWeeklyInsightTime, type WeeklyInsightData } from '@/src/services/weekly-insight-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TopBanner } from '@/src/components/global/TopBanner';
// hotfix-ux FIX 4: toast de reacción ARGOS + atribución al ganar electrones.
import { ArgosReactionToast } from '@/src/components/economy/ArgosReactionToast';
import { AppTour } from '@/src/components/AppTour';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';

// LayoutAnimation lo usan cards hijas (HoyEditorialSection) — el enable global vive aquí.
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

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
  const [showTour, setShowTour] = useState(false);
  const [uvMini, setUvMini] = useState<{ current: number; level: string; color: string; emoji: string; advice: string; vitaminD?: string } | null>(null);
  // Gate de género para electrones (period_log) — null hasta que carga.
  const [userSex, setUserSex] = useState<string | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsightData | null>(null);
  const [weeklyInsightDismissed, setWeeklyInsightDismissed] = useState(false);
  // MB-20: auto-foco — el scroll aterriza en el bloque de la hora actual.
  const scrollRef = useRef<ScrollView>(null);
  const tareasYRef = useRef(0);

  // --- Carga de datos ---
  // MB-20: la card AHORA (hero-recommendation) y la racha salieron de HOY con
  // el hero; compileDay queda como la única carga. El parámetro se conserva
  // por los listeners (day_changed/electrons_changed fuerzan recarga igual).
  const loadDay = useCallback(async (_force = false) => {
    if (!user?.id) return;
    try {
      const compiled = await compileDay(user.id, (pct, label) => { setProgress(pct); setProgressLabel(label); });
      if (compiled) setDay(compiled);
    } catch (e) {
      console.warn('Error compiling day:', e);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    loadDay();
    const interval = setInterval(loadDay, REFRESH_INTERVAL);
    // MB-11 B: el guard isTogglingRef (HOY-5) murió con toggleBoolean — los
    // toggles viven en las cards editoriales, que emiten estos eventos al final.
    const sub1 = DeviceEventEmitter.addListener('day_changed', () => {
      // #136: el día cambió de verdad → HERO recomputa YA (sin cache)
      loadDay(true);
      // H7: el contexto del día cambió → invalida el insight cacheado (se regenera
      // en la próxima carga del Home). Lazy: no dispara LLM aquí.
      if (user?.id) invalidateDailyInsight(user.id);
    });
    const sub2 = DeviceEventEmitter.addListener('electrons_changed', () => {
      loadDay(true);
    });
    // Mega-Sprint A B4.1: re-hacer el test de cronotipo cambia wake/sleep → HOY
    // recompila su timing sin depender del re-focus del tab.
    const sub3 = DeviceEventEmitter.addListener('chronotype_changed', () => {
      loadDay(true);
    });
    return () => {
      clearInterval(interval);
      sub1.remove();
      sub2.remove();
      sub3.remove();
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

  // MB-11 B.3: el fetch de wearable que vivía aquí era estado muerto (las cards
  // Actividad se retiraron en v13e). YO y Sueño comparten useWearableToday.

  // F36.7/F49/F03.7: defense-in-depth. Si el `day_changed` event no llega
  // (RN-Web inconsistente, navegación que dispara el emit mientras HOY está
  // desmontado), refrescamos al recuperar focus. Cubre los 3 casos de Paty:
  // cambio de meta agua, toggle de electrón en config, edición de wake_time.
  useFocusEffect(useCallback(() => {
    loadDay();
    // MB-20: la visibilidad de cards editoriales murió con HoyEditorialSection —
    // las filas de TAREAS salen de compileDay (prefs del usuario) directamente.
  }, [loadDay]));

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
      .then(({ data, error }) => {
        // MB-11 A: en error NO pisar el gate con null "falso" — se queda el
        // estado previo (null inicial = gate conservador) y queda registro.
        if (error) { logWarn('[HOY] client_profiles query failed', error); return; }
        setUserSex((data as any)?.biological_sex ?? null);
      });
  }, [user?.id]);

  // MB-11 B: el efecto de Daily Review (3 queries nocturnas vía buildDailyReview)
  // era código muerto — su card se retiró del render en v13e 3.C y el mini-reporte
  // vive integrado en HoyDayCardEditorial.

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
        const { data: cached, error: cacheErr } = await supabase
          .from('argos_daily_insights')
          .select('insight, created_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();
        // MB-11 A: un fallo aquí no es "sin cache" — sin este log, cada visita
        // regeneraría el insight (LLM) sin que nadie se entere del porqué.
        if (cacheErr) logWarn('[HOY] argos_daily_insights cache query failed', cacheErr);
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
          const { error: upsertErr } = await supabase.from('argos_daily_insights').upsert(
            { user_id: user.id, date: today, insight, created_at: new Date().toISOString() },
            { onConflict: 'user_id,date' },
          );
          // MB-11 A: si el upsert falla, el insight se regenera (y se cobra) en
          // cada visita — el log es la única evidencia del leak.
          if (upsertErr) logWarn('[HOY] argos_daily_insights upsert failed', upsertErr);
        }
      } catch (_) { /* silencioso */ }
    })();
  }, [user?.id]);

  // MB-11 B: aquí vivían los handlers muertos de secciones retiradas del render
  // (onElectronTap/toggleBoolean de la grid de electrones, toggleAgendaItem,
  // handleEditSave, saveQuickJournal, toggleSupplement, handleQuickVoice) — se
  // fueron con su UI. Los toggles de electrones viven en las cards editoriales
  // (HoyEditorialSection), la agenda completa en /agenda, suplementos en
  // /supplements, journal en /journal y la voz en el tab ARGOS.

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
      {/* #23: banner contextual flotante (racha / protones / notifs / insight) */}
      <TopBanner offset={44} />
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ═══════════════════════════════════════
            HEADER: saludo + fecha + campana
        ═══════════════════════════════════════ */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <View style={s.topBar}>
              <View style={s.topBarLeft}>
                <Text style={s.brandLabel}>ATP DAILY</Text>
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
            <View style={{ marginTop: 10 }}>
              <CommunityPresence pillar="hoy" />
            </View>
          </Animated.View>
        </View>

        {/* ═══════════════════════════════════════
            TAREAS — el checklist del día, dos lentes (MB-20)
        ═══════════════════════════════════════ */}
        <View
          style={{ paddingHorizontal: Spacing.md }}
          onLayout={(e) => { tareasYRef.current = e.nativeEvent.layout.y; }}
        >
          <TareasView
            day={day}
            userId={user?.id}
            uvMini={uvMini}
            onRequestScroll={(y) => {
              scrollRef.current?.scrollTo({ y: tareasYRef.current + y - 8, animated: true });
            }}
          />
        </View>

        {/* Task #133: Boost H+ — 24h de Pro con Protones (solo tier base / countdown si activo).
            La card trae su propio wrapper: si no aplica no deja hueco. */}
        <ProBoostCard />

        {/* #99: nudge one-shot "¿Qué son los H+?" → /economy/how-to-earn */}
        <HPlusExplainerCard />

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
                {/* MB-1.5 §1: pressed visible (antes Pressable sin feedback) */}
                <Pressable
                  onPress={dismissWeeklyInsight}
                  hitSlop={10}
                  style={({ pressed }) => pressed && { opacity: 0.5, transform: [{ scale: 0.9 }] }}
                >
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

        {/* Sprint 1.5 B: protocol-config murió — configurar el día ES activar
            intervenciones (Mi Protocolo = HOY cards = Agenda, doctrina fusión).
            MB-11 B.1: al molde GradientCTA (quiet: acción secundaria). El
            EditDayModal que vivía aquí nunca se abría (visible siempre false)
            — retirado junto con su componente huérfano. */}
        <GradientCTA
          label="Ajustar Mi Protocolo"
          variant="quiet"
          icon="options-outline"
          onPress={() => { haptic.light(); router.push('/salud/intervenciones'); }}
          style={s.editDayBtn}
        />

        {/* E-3 (MB-12): la puerta de los electrones — sin ella todo usuario
            quedaba clavado en los 6 booleanos del default (mig 043). */}
        <GradientCTA
          label="Elegir mis hábitos"
          variant="quiet"
          icon="checkbox-outline"
          onPress={() => { haptic.light(); router.push('/hoy-habitos'); }}
          style={s.editDayBtn}
        />

        {/* #hoy-funcionalidad 4.9: SECCIÓN 6 "AGENDA" triple (MAÑANA/TARDE/NOCHE) eliminada
            — el próximo evento vive en HeroAgendaCard; la agenda completa irá a AGENDA V2. */}

        {/* hotfix-ux FIX 2: el bridge "Únete a la Tribu ATP" (C5) se retiró del footer del HOY.
            Los demás bridge points de Skool (Settings, Meet ARGOS, RateLimitCard, check-in) siguen.
            El acceso a Comunidad Hub vive en tab Mi ATP como 3ra card. */}

        {/* Espaciado inferior para tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Tour de onboarding (MB-10: editorial, sex decide la pantalla de Ciclo) */}
      {showTour && <AppTour onComplete={() => setShowTour(false)} sex={userSex} />}

      {/* F3 (AGENDA-COMPLETE): el modal de la campana se retiró — el inbox vive en /notifications
          (el INSIGHT ARGOS del día se muestra ahí, fijado arriba). */}

      {/* MB-11 B: el sheet de quick-voice y el indicador FAB "ARGOS piensa" eran
          código muerto desde N1 (ARGOS vive en el menú inferior) — retirados. */}

      {/* hotfix-ux FIX 4: reacción ARGOS (pool encouragement) + atribución "+X ⚡ Fuente"
          tras cada award de electrón. Escucha 'electron_awarded' (electron-service). */}
      <ArgosReactionToast />
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

  // ── HEADER (MB-20: el hero fotográfico salió; saludo sobre negro) ──
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
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
  // ── Secciones ──
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl, // 32 — más aire entre secciones (jerarquía: que respire)
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
});
