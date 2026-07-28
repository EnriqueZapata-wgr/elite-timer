/**
 * HOY — Dashboard diario compilado.
 *
 * Usa compileDay() como única fuente de datos. Estructura real (MB-11 B.4):
 * 1. Hero editorial (foto por hora + saludo + card AHORA + TU DÍA editorial)
 * 2. AgendaPreviewCard (→ /agenda)
 * 3. Economía self-gated (ProBoostCard + HPlusExplainerCard)
 * 4. HoyEditorialSection (cards editoriales, visibilidad por usuario)
 * 5. Lectura de la semana (domingo ≥19h, cacheada)
 * 6. CTA "Ajustar Mi Protocolo" (→ /salud/intervenciones)
 * Overlays: TopBanner · AppTour · ArgosReactionToast.
 *
 * Las secciones legacy (próximo electrón, grids de electrones, sugerencia,
 * agenda triple, suplementos, journal inline, daily review, quick-voice)
 * se retiraron del render en v13d-v13e y su código murió aquí en MB-11 B.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Text,
  DeviceEventEmitter, ImageBackground,
  Platform, UIManager, Alert,
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
import { compileDay, type CompiledDay } from '@/src/services/day-compiler';
import { SplashLoader } from '@/src/components/SplashLoader';
import { NotificationBellIcon } from '@/src/components/hoy/NotificationBellIcon';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import { HoyEditorialSection } from '@/src/components/hoy/HoyEditorialSection';
import { AgendaPreviewCard } from '@/src/components/agenda/AgendaPreviewCard';
import { ProBoostCard } from '@/src/components/economy/ProBoostCard';
import { HPlusExplainerCard } from '@/src/components/economy/HPlusExplainerCard';
import { getEffectiveCardsVisible } from '@/src/services/hoy/visibility-service';
import { HOY_CARD_ORDER_DEFAULT } from '@/src/constants/hoy-cards';
import { EconomyHeaderPill } from '@/src/components/economy/EconomyHeaderPill';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { getHoyBackgroundRequire } from '@/src/constants/brand';
import { topScoreMover } from '@/src/services/hoy/score-coaching-core';
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { generateDailyInsight, invalidateDailyInsight } from '@/src/services/argos-service';
import { addWater } from '@/src/services/hydration-service';
import { getCurrentStreak } from '@/src/services/adherence-service';
import {
  getHeroRecommendation, HERO_CACHE_MS,
  type HeroContext, type HeroRecommendation, type CyclePhase,
} from '@/src/services/hero-recommendation-service';
import { edadDeltaYears } from '@/src/services/edad-atp/edad-delta-core';
import { MOTOR_V2_VERSION } from '@/src/constants/edad-atp-motor-v2-config';
import { getCycleInfo } from '@/src/services/cycle-service';
import { getActiveFast } from '@/src/services/fasting-service';
import { getWeeklyInsight, isWeeklyInsightTime, type WeeklyInsightData } from '@/src/services/weekly-insight-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
// #v13d 2.7: HoyDayCard legacy → HoyDayCardEditorial (imagen B/N + tipografía display).
import { HoyDayCardEditorial } from '@/src/components/economy/HoyDayCardEditorial';
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
  // #tabs-redesign V1.3: visibilidad de las cards editoriales (default: todas).
  const [cardsVisible, setCardsVisible] = useState<Set<string>>(new Set(HOY_CARD_ORDER_DEFAULT));
  const [showTour, setShowTour] = useState(false);
  const [uvMini, setUvMini] = useState<{ current: number; level: string; color: string; emoji: string; advice: string; vitaminD?: string } | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  // Gate de género para electrones (period_log) — null hasta que carga.
  const [userSex, setUserSex] = useState<string | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsightData | null>(null);
  const [weeklyInsightDismissed, setWeeklyInsightDismissed] = useState(false);
  // (MB-11 B: isTogglingRef/recompileTimeoutRef murieron con toggleBoolean —
  // los toggles y sus guards viven ahora dentro de las cards editoriales.)
  // #68: recomendación HERO dinámica + timestamp del último cómputo (cache 15
  // min para que la recomendación no cambie de forma errática entre focus).
  const [heroRec, setHeroRec] = useState<HeroRecommendation | null>(null);
  const heroRecAtRef = useRef(0);
  // #136: estado optimista de la card AHORA — check inmediato al registrar
  // inline; se limpia cuando el recompute (post day_changed) trae la nueva rec.
  const [heroResolved, setHeroResolved] = useState(false);

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
        // mig 234: solo registros del motor actual — los 111 previos al
        // 2026-06-12 son del motor v1 y no deben alimentar la señal de ARGOS.
        .eq('motor_version', MOTOR_V2_VERSION)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (cycleRes.status === 'fulfilled' && cycleRes.value?.currentPhase) {
      cyclePhase = cycleRes.value.currentPhase as CyclePhase;
    }
    if (fastRes.status === 'fulfilled') fastingActive = !!fastRes.value;
    // MB-11 A: supabase-js no lanza en 4xx — el fallo viene en { error } y sin
    // este check la señal degrada a "sin datos" sin dejar rastro.
    if (edadRes.status === 'fulfilled' && edadRes.value?.error) {
      logWarn('[HOY] edad_atp_calculations query failed', edadRes.value.error);
    }
    if (edadRes.status === 'fulfilled' && edadRes.value?.data?.edad_integral != null) {
      // P1.6: signo del delta desde el core (anti-reinversión del número estrella).
      edadAtpDelta = edadDeltaYears(
        Number(edadRes.value.data.chronological_age),
        Number(edadRes.value.data.edad_integral),
      );
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
    // #136: el recompute con datos frescos cierra el ciclo optimista
    setHeroResolved(false);
  }, [user?.id, userSex]);

  /**
   * #136: quick action de la card AHORA (agua) — optimistic update:
   * check inmediato, endpoint en background, revert + alert si falla.
   * addWater emite day_changed → loadDay(true) trae la siguiente rec.
   */
  const handleHeroQuickAction = useCallback(async (rec: HeroRecommendation) => {
    if (!user?.id || rec.quickAction?.type !== 'water') return;
    haptic.success();
    setHeroResolved(true);
    try {
      const result = await addWater(user.id, rec.quickAction.amountMl);
      if (result === null) throw new Error('addWater returned null');
    } catch (e) {
      logWarn('[HOY] hero quick action failed', e);
      setHeroResolved(false);
      Alert.alert('No se pudo registrar', 'Inténtalo de nuevo en un momento.');
    }
  }, [user?.id]);

  // --- Carga de datos ---
  // #136: forceHero salta el cache de 15 min del HERO — se usa cuando los
  // datos del día REALMENTE cambiaron (day_changed/electrons_changed).
  const loadDay = useCallback(async (forceHero = false) => {
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
    // #68: recomputar la recomendación HERO (respeta el cache de 15 min,
    // salvo forceHero #136).
    if (compiledForHero) {
      computeHeroRec(compiledForHero, streakForHero, forceHero).catch(() => { /* silencioso */ });
    }
    // MB-11 B: aquí vivían 3 queries (user_supplements, supplement_logs,
    // journal_entries) que alimentaban las secciones de suplementos y journal
    // retiradas del render en v13e — se fueron con su UI.
    setLoading(false);
  }, [user?.id, computeHeroRec]);

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
    // #tabs-redesign V1.3: refrescar visibilidad al enfocar (#3b: efectiva = protocolo si flag ON).
    if (user?.id) getEffectiveCardsVisible(user.id).then(setCardsVisible).catch(() => {});
  }, [loadDay, user?.id]));

  // #tabs-redesign V1.3: re-cargar visibilidad cuando otra pantalla la togglea.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('hoy_visibility_changed', () => {
      if (user?.id) getEffectiveCardsVisible(user.id).then(setCardsVisible).catch(() => {});
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

  // --- Derivados ---
  const hour = new Date().getHours();
  const pct = day?.electronProgress.percentage ?? 0;
  const heroBg = getHoyBackgroundRequire(hour, pct);

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
              <View style={{ marginTop: 10 }}>
                <CommunityPresence pillar="hoy" />
              </View>
            </Animated.View>

            {/* Sprint 1.5 B: protocol pill ELIMINADA del feed (doctrina DX
                intervenciones core: los protocolos legacy no drivean HOY; la
                biblioteca vive en Salud Funcional → protocol-explorer). */}

            {/* #68: recomendación HERO dinámica — la primera regla que matchea
                (hora + hábitos + ciclo + ayuno + racha + Edad ATP) */}
            {heroRec && (
              <Animated.View
                key={`${heroRec.id}${heroResolved ? '-ok' : ''}`}
                entering={FadeInUp.delay(110).springify()}
              >
                <AnimatedPressable
                  onPress={() => {
                    if (heroResolved) return;
                    // #136: acción inline (agua) → optimistic update sin navegar
                    if (heroRec.quickAction) { handleHeroQuickAction(heroRec); return; }
                    if (heroRec.route) {
                      haptic.light();
                      // #136: al volver de la pantalla destino el próximo
                      // loadDay recomputa sin esperar los 15 min de cache
                      heroRecAtRef.current = 0;
                      router.push(heroRec.route);
                    }
                  }}
                  disabled={heroResolved || (!heroRec.route && !heroRec.quickAction)}
                  style={s.heroRecCard}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.heroRecKicker}>AHORA</Text>
                    {heroResolved && heroRec.quickAction ? (
                      <>
                        <Text style={s.heroRecTitle}>Registrado ✓</Text>
                        <Text style={s.heroRecSubtitle}>+{heroRec.quickAction.amountMl} ml de agua — bien ahí.</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.heroRecTitle}>{heroRec.title}</Text>
                        <Text style={s.heroRecSubtitle}>{heroRec.subtitle}</Text>
                      </>
                    )}
                  </View>
                  {heroResolved ? (
                    <Ionicons name="checkmark-circle" size={22} color="#a8e02a" />
                  ) : (heroRec.route || heroRec.quickAction) ? (
                    <View style={s.heroRecCta}>
                      {heroRec.cta ? <Text style={s.heroRecCtaText}>{heroRec.cta}</Text> : null}
                      <Ionicons
                        name={heroRec.quickAction ? 'add-circle-outline' : 'chevron-forward'}
                        size={14}
                        color="#a8e02a"
                      />
                    </View>
                  ) : null}
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* TU DÍA — #v13d 2.7: card editorial (imagen B/N despertar + número display + barra).
                MB-1.5 §3 (patrón Whoop): el tap lleva a la acción pendiente que MÁS mueve el
                score hoy (topScoreMover); con el día completo cae a /economy/admin (progreso). */}
            <Animated.View entering={FadeInUp.delay(120).springify()}>
              <HoyDayCardEditorial
                percentage={pct}
                seedKey={user?.id}
                streak={streak}
                completedCount={day.booleanElectrons.filter(e => e.completed).length}
                totalCount={day.booleanElectrons.length}
                coaching={topScoreMover(day.booleanElectrons, day.quantitativeElectrons)}
              />
            </Animated.View>
          </LinearGradient>
        </ImageBackground>

        {/* #v13g F3: bloque AGENDA DE HOY entre TU DÍA y las sub-secciones — navega a /agenda. */}
        <View style={{ paddingHorizontal: Spacing.md }}>
          <AgendaPreviewCard userId={user?.id} />
        </View>

        {/* Task #133: Boost H+ — 24h de Pro con Protones (solo tier base / countdown si activo).
            La card trae su propio wrapper: si no aplica no deja hueco. */}
        <ProBoostCard />

        {/* #99: nudge one-shot "¿Qué son los H+?" → /economy/how-to-earn */}
        <HPlusExplainerCard />

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
