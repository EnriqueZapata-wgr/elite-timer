/**
 * HOY = TAREAS — tu checklist del día. Fin. Nada más. (MB-20 Pieza 1)
 *
 * Usa compileDay() como única fuente de datos. Estructura:
 * 1. Header: marca (símbolo + "ATP DAILY") + saludo + fecha + campana + pill
 * 2. TareasView: dos lentes (Tareas por momento / Agenda por hora),
 *    card de la orbe colapsable, progreso global y por bloque
 * 3. (libre — aquí vivían las cards de protones, retiradas con la membresía única)
 * 4. Lectura de la semana (domingo ≥19h, cacheada)
 * 5. CTAs quiet: Mi Protocolo · Mis hábitos
 * Overlays: TopBanner · ArgosReactionToast (el tour de la orbe vive en la
 * carcasa de tabs, no aquí).
 *
 * MB-20: el hero fotográfico, la card AHORA, la card TU DÍA (ATP Score) y
 * la preview de agenda salieron de HOY — el motor del score sigue vivo en
 * compileDay y la agenda completa vive en /agenda (puerta en la lente).
 * CIERRE-6: los componentes que quedaron sin montar tras ese corte
 * (AgendaPreviewCard, HoyDayCardEditorial) ya no existen en el árbol.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Text, Image,
  DeviceEventEmitter, AppState,
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
import { ArgosMark } from '@/src/components/argos/ArgosMark';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import { TareasView } from '@/src/components/hoy/TareasView';
import { GraduacionCard } from '@/src/components/hoy/GraduacionCard';
import { EconomyHeaderPill } from '@/src/components/economy/EconomyHeaderPill';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { getLocalToday, getLocalHour } from '@/src/utils/date-helpers';
import { saludoPorHora } from '@/src/services/saludo-core';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { generateDailyInsight, invalidateDailyInsight, ARGOS_INSIGHT_CHANGED_EVENT } from '@/src/services/argos-service';
import { leerInsightDeHoy } from '@/src/services/argos-insight-cache';
import { decidirRegeneracionInsight } from '@/src/services/argos-insight-window-core';
import { INSIGHT_EN_VENTANA } from '@/src/constants/flags';
import { getWeeklyInsight, isWeeklyInsightTime, type WeeklyInsightData } from '@/src/services/weekly-insight-service';
import { syncAppAvisos } from '@/src/services/app-avisos-service';
import { syncWidgetsFromCompiled } from '@/src/services/widgets/widget-sync-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TopBanner } from '@/src/components/global/TopBanner';
// hotfix-ux FIX 4: toast de reacción ARGOS + atribución al ganar electrones.
import { ArgosReactionToast } from '@/src/components/economy/ArgosReactionToast';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import { ATP_BRAND, PILL } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';

// LayoutAnimation lo usan cards hijas (HoyEditorialSection) — el enable global vive aquí.
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

// ═══ COMPONENTE PRINCIPAL ═══

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // MB-31B: pantalla migrada (raíz manual, sin TabScreen) — envuelta en
  // <ThemeReady> al final. En oscuro TODO queda con los valores de siempre;
  // el lima como texto solo existe en oscuro (regla 1 del manual 3.6).
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : tokens.tealTexto;

  // --- Estado único ---
  const [day, setDay] = useState<CompiledDay | null>(null);
  const [loading, setLoading] = useState(true);
  // Progreso real del compile (alimenta SplashLoader 0-100% en vez del spinner indeterminado).
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Iniciando…');
  // F3 (AGENDA-COMPLETE): la campana ahora es NotificationBellIcon (self-contained,
  // badge = user_notifications sin leer, tap → /notifications).
  const [uvMini, setUvMini] = useState<{ current: number; level: string; color: string; emoji: string; advice: string; vitaminD?: string } | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsightData | null>(null);
  const [weeklyInsightDismissed, setWeeklyInsightDismissed] = useState(false);

  // --- Carga de datos ---
  // MB-20: la card AHORA (hero-recommendation) y la racha salieron de HOY con
  // el hero; compileDay queda como la única carga. El parámetro se conserva
  // por los listeners (day_changed/electrons_changed fuerzan recarga igual).
  // HID-2: un solo toque de agua emite day_changed Y electrons_changed, y los
  // dos listeners llamaban loadDay: DOS recompilaciones completas del dia, en
  // paralelo, por un boton. Cada compileDay son 23 queries en paralelo mas una
  // docena de viajes SERIALES. Y hay 36 sitios en la app que emiten
  // day_changed, asi que esto no es solo del agua.
  //
  // No se quita el evento: doce pantallas escuchan electrons_changed y se
  // quedarian sin refrescar. Lo que se arregla es que HOY no compile dos veces.
  // 4EP: el guard sin caducidad podia congelar HOY PARA SIEMPRE. compileDay no
  // tiene timeout ni AbortController, y con un fetch colgado enVuelo se quedaba
  // en true: los tres listeners y el intervalo de 5 min entraban al return de
  // arriba indefinidamente, sin spinner, sin error y sin salida. Antes del guard,
  // una peticion colgada no envenenaba a las siguientes. Ahora el guard caduca.
  const COMPILE_MAX_MS = 30_000;
  const enVueloDesdeRef = useRef(0);   // 0 = libre; si no, cuando arranco
  const pendienteRef = useRef(false);
  const rebotarRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primerEventoRef = useRef(0);

  const loadDay = useCallback(async (_force = false) => {
    if (!user?.id) return;
    const ahora = Date.now();
    if (enVueloDesdeRef.current && ahora - enVueloDesdeRef.current < COMPILE_MAX_MS) {
      // Ya hay un compile vivo: no se encima otro, se anota que falta uno mas.
      pendienteRef.current = true;
      return;
    }
    enVueloDesdeRef.current = ahora;
    try {
      const compiled = await compileDay(user.id, (pct, label) => { setProgress(pct); setProgressLabel(label); });
      if (compiled) {
        setDay(compiled);
        // MB-23 P3: los avisos por app se re-evalúan con el hecho/no-hecho
        // real del día (la condición "solo si no lo has hecho hoy"). Los
        // eventos electrons_changed/day_changed recompilan → re-sincronizan.
        const done: Record<string, boolean> = {};
        for (const e of compiled.booleanElectrons) done[e.source] = e.completed;
        syncAppAvisos(user.id, done).catch(() => {});
        // MB-32: el widget pinta este MISMO compile (fuente única, cero
        // queries extra). Fire-and-forget: un fallo jamás rompe HOY.
        syncWidgetsFromCompiled(user.id, compiled).catch(() => {});
      }
    } catch (e) {
      console.warn('Error compiling day:', e);
    } finally {
      enVueloDesdeRef.current = 0;
      // 4EP: el reintento pasa por el MISMO rebote que los eventos. Antes salia
      // por un setTimeout(0) propio que se lo saltaba, encadenaba compiles y
      // ademas no se limpiaba al desmontar.
      if (pendienteRef.current) {
        pendienteRef.current = false;
        recargarRef.current();
      }
      setLoading(false);
    }
  }, [user?.id]);

  // Refs a las ultimas versiones, para poder llamarlas desde el finally sin que
  // la funcion se referencie a si misma dentro del useCallback.
  const loadDayRef = useRef(loadDay);
  useEffect(() => { loadDayRef.current = loadDay; }, [loadDay]);

  // Los eventos llegan en rafaga (day_changed y electrons_changed a
  // milisegundos de distancia). Un rebote corto los junta en UN solo compile.
  //
  // 4EP: con rebote puro, una rafaga sostenida a menos de 150 ms (una
  // sincronizacion que emite por item, por ejemplo) reprogramaba el timer para
  // siempre y HOY no recargaba NUNCA. Hay 36 emisores de day_changed y 38 de
  // electrons_changed, asi que no es hipotetico. El techo lo cierra.
  const REBOTE_MS = 150;
  const REBOTE_TECHO_MS = 600;
  const recargar = useCallback(() => {
    const ahora = Date.now();
    if (!primerEventoRef.current) primerEventoRef.current = ahora;
    const vencido = ahora - primerEventoRef.current >= REBOTE_TECHO_MS;
    if (rebotarRef.current) clearTimeout(rebotarRef.current);
    const disparar = () => {
      rebotarRef.current = null;
      primerEventoRef.current = 0;
      loadDayRef.current(true);
    };
    if (vencido) { disparar(); return; }
    rebotarRef.current = setTimeout(disparar, REBOTE_MS);
  }, []);
  const recargarRef = useRef(recargar);
  useEffect(() => { recargarRef.current = recargar; }, [recargar]);


  useEffect(() => {
    setLoading(true);
    loadDay();
    const interval = setInterval(loadDay, REFRESH_INTERVAL);
    // MB-11 B: el guard isTogglingRef (HOY-5) murió con toggleBoolean — los
    // toggles viven en las cards editoriales, que emiten estos eventos al final.
    const sub1 = DeviceEventEmitter.addListener('day_changed', () => {
      // #136: el día cambió de verdad → HERO recomputa YA (sin cache)
      recargar();
      // H7: el contexto del día cambió → invalida el insight cacheado (se regenera
      // en la próxima carga del Home). Lazy: no dispara LLM aquí.
      if (user?.id) invalidateDailyInsight(user.id);
    });
    const sub2 = DeviceEventEmitter.addListener('electrons_changed', () => {
      recargar();
    });
    // Mega-Sprint A B4.1: re-hacer el test de cronotipo cambia wake/sleep → HOY
    // recompila su timing sin depender del re-focus del tab.
    const sub3 = DeviceEventEmitter.addListener('chronotype_changed', () => {
      recargar();
    });
    return () => {
      clearInterval(interval);
      if (rebotarRef.current) { clearTimeout(rebotarRef.current); rebotarRef.current = null; }
      sub1.remove();
      sub2.remove();
      sub3.remove();
    };
  }, [loadDay, recargar]);

  // F04.8 + F01.4: re-render ligero cada 60s (sin refetch) para que el divisor "AHORA" y el
  // fondo dinámico por hora se actualicen en vivo al cruzar el minuto/franja (REFRESH_INTERVAL
  // es de 5 min, demasiado grueso para un reloj). Solo fuerza re-render; no toca la DB.
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMinuteTick((n) => n + 1), 60 * 1000);
    // BLOQ-5: los timers de JS se suspenden con la app en background. Sin esto,
    // el teléfono que pasó la noche con HOY abierto vuelve por la mañana con el
    // reloj de anoche hasta que el intervalo reanude. AppState es la única
    // señal de "volví al frente": useFocusEffect es foco de NAVEGACIÓN y no
    // dispara si HOY ya era la pantalla activa.
    //
    // MATIZ (29-ago-2026): eso es cierto en el caso NORMAL, pero no siempre.
    // app.json declara UIBackgroundModes: ["audio"], así que si hay una pieza
    // de Mente sonando el proceso NO se suspende y los timers de JS SIGUEN
    // corriendo. Este belt no sobra por eso, pero no des por hecho en otro
    // lado que "en background nada corre": aquí sí puede correr.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setMinuteTick((n) => n + 1);
    });
    return () => { clearInterval(t); sub.remove(); };
  }, []);

  // BLOQ-5: el saludo se DERIVA del reloj en cada render, no se lee de `day`.
  // Como campo materializado en CompiledDay se añejaba: compilado a las 21:xx
  // seguía diciendo "Buenas noches" a las 8:43 de la mañana siguiente. Ahora el
  // tick de 60s y el retorno a foreground lo mantienen fresco.
  const saludo = saludoPorHora(getLocalHour());

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

  // MB-20 Pieza 4: el tour ya no vive aquí — la orbe lo guía desde la carcasa
  // de tabs (OrbTour en app/(tabs)/_layout.tsx) sobre las pantallas reales.

  // Sexo biológico para gate de electrones (period_log).
  // MB-20: el gate de sexo (period_log) vive dentro de compileDay; el consumidor
  // local (AppTour) se retiró con el tour viejo.

  // MB-11 B: el efecto de Daily Review (3 queries nocturnas vía buildDailyReview)
  // era código muerto — su card se retiró del render en v13e 3.C. El componente
  // que iba a absorber ese mini-reporte (HoyDayCardEditorial) nunca llegó a
  // montarse y murió en CIERRE-6.

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
      // CIERRE-4: la guarda ya no es "cache de 6h" sino UNA generación por
      // ventana de 4h, y solo si el día cambió (stale). La decisión es pura y
      // vive en argos-insight-window-core; aquí solo se lee y se escribe.
      try {
        const cache = await leerInsightDeHoy(user.id);
        if (INSIGHT_EN_VENTANA) {
          const { regenerar } = decidirRegeneracionInsight({
            hayInsight: !!cache?.insight,
            createdAtMs: cache?.createdAtMs ?? null,
            stale: cache?.stale ?? true,
            ahoraMs: Date.now(),
          });
          if (!regenerar) return;
        } else if (cache?.insight) {
          const cacheAge = cache.createdAtMs !== null
            ? (Date.now() - cache.createdAtMs) / (1000 * 60 * 60)
            : Infinity;
          if (cacheAge < 6) return; // Cache fresco, no regenerar
        }
      } catch (cacheErr) {
        // MB-11 A: un fallo aquí no es "sin cache" — sin este log, cada visita
        // regeneraría el insight (LLM) sin que nadie se entere del porqué.
        logWarn('[HOY] argos_daily_insights cache query failed', cacheErr);
      }
      // Generar nuevo
      try {
        const insight = await generateDailyInsight(user.id);
        if (insight) {
          // `stale: false` cierra la ventana: las invalidaciones acumuladas
          // hasta aquí quedan atendidas por ESTA generación. Eso es el batching.
          const fila = { user_id: user.id, date: today, insight, created_at: new Date().toISOString() };
          let { error: upsertErr } = await supabase.from('argos_daily_insights').upsert(
            INSIGHT_EN_VENTANA ? { ...fila, stale: false } : fila,
            { onConflict: 'user_id,date' },
          );
          // Si la 275 aún no está en el remoto, la columna `stale` no existe y
          // el upsert falla entero. Sin este reintento el insight NO se
          // persistiría y se regeneraría (y cobraría) en cada visita: justo el
          // leak que este trabajo viene a cerrar.
          if (upsertErr && INSIGHT_EN_VENTANA) {
            ({ error: upsertErr } = await supabase.from('argos_daily_insights').upsert(
              fila, { onConflict: 'user_id,date' },
            ));
          }
          // MB-11 A: si el upsert falla, el insight se regenera (y se cobra) en
          // cada visita — el log es la única evidencia del leak.
          if (upsertErr) logWarn('[HOY] argos_daily_insights upsert failed', upsertErr);
          // NOCTURNO-FIX P3: la card del insight (OrbCard) lee en paralelo a esta
          // generación; sin la señal, en la primera entrada del día pierde la
          // carrera y se queda invisible hasta el siguiente montaje del tab.
          if (!upsertErr) DeviceEventEmitter.emit(ARGOS_INSIGHT_CHANGED_EVENT);
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
    // El SplashLoader es el momento de marca (oscuro en los dos temas, como
    // el splash nativo): su barra de estado se queda clara.
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
    <ThemeReady>
    <View style={[s.root, { backgroundColor: tokens.fondo }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {/* #23: banner contextual flotante (racha / notifs / insight) */}
      <TopBanner offset={44} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ═══════════════════════════════════════
            HEADER: saludo + fecha + campana
        ═══════════════════════════════════════ */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <View style={s.topBar}>
              <View style={s.topBarLeft}>
                {/* MARCA: el símbolo de ATP no aparecía en ninguna pantalla de
                    la app (solo como portada del reproductor de Mente). Aquí
                    entra como marca, no como icono de función: 16px, alineado
                    al bloque de texto del label, sin ser tocable y sin color
                    propio en el encabezado. El asset es la molécula sola, con
                    fondo transparente, así que se lee igual en los dos temas
                    (verificado sobre acero y sobre el fondo oscuro). */}
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={s.brandMark}
                  resizeMode="contain"
                />
                <Text style={[s.brandLabel, !dark && { color: tokens.textoSecundario }]}>ATP DAILY</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* F3 (AGENDA-COMPLETE): campana con badge real (user_notifications) → /notifications. */}
                <NotificationBellIcon />
              </View>
            </View>
            {/* P6: pill E-/Rank (self-gated por LAB_ECONOMY_ENABLED; null si OFF) */}
            <EconomyHeaderPill />
          </Animated.View>

          {/* Saludo */}
          <Animated.View entering={FadeInUp.delay(80).springify()} style={s.heroGreetingWrap}>
            {/* En claro no hay foto detrás: texto del tema y sin sombra. */}
            <Text style={[s.heroGreeting, !dark && { color: tokens.texto, textShadowColor: 'transparent' }]}>{saludo}</Text>
            <Text style={[s.heroName, !dark && { color: tokens.texto, textShadowColor: 'transparent' }]}>{day.userName}</Text>
            <Text style={[s.heroDate, !dark && { color: tokens.textoSecundario }]}>{day.date}</Text>
            <View style={{ marginTop: 10 }}>
              <CommunityPresence pillar="hoy" />
            </View>
          </Animated.View>
        </View>

        {/* ═══════════════════════════════════════
            TAREAS — el checklist del día, dos lentes (MB-20)
        ═══════════════════════════════════════ */}
        <View style={{ paddingHorizontal: Spacing.md }}>
          <TareasView day={day} userId={user?.id} uvMini={uvMini} />
        </View>

        {/* MB-26 P2: la propuesta de graduación (30/35). La app propone,
            el usuario acepta; "Ahora no" la duerme 7 días. */}
        <GraduacionCard userId={user?.id} propuestas={day.graduacionPropuestas} />

        {/* ═══════════════════════════════════════
            WEEKLY INSIGHT — Domingo ≥19h (cacheado por semana)
        ═══════════════════════════════════════ */}
        {weeklyInsight && !weeklyInsightDismissed && (
          <Animated.View entering={FadeInUp.delay(140).springify()} style={s.section}>
            <View style={s.weeklyCard}>
              <View style={s.weeklyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ArgosMark size={14} />
                  <Text style={[s.weeklyLabel, { color: acento }]}>LECTURA DE LA SEMANA</Text>
                </View>
                {/* MB-1.5 §1: pressed visible (antes Pressable sin feedback) */}
                <Pressable
                  onPress={dismissWeeklyInsight}
                  hitSlop={10}
                  style={({ pressed }) => pressed && { opacity: 0.5, transform: [{ scale: 0.9 }] }}
                >
                  <Ionicons name="close" size={16} color={dark ? PILL.textColor : tokens.textoSecundario} />
                </Pressable>
              </View>

              {/* Adherencia por pilar. Flechas: en claro ni el lima ni el rosa
                  #fb7185 (fuera de paleta, va al reporte) se leen como glifo —
                  suben a teal calibrado / token de error. */}
              <View style={{ marginTop: 10, gap: 6 }}>
                {(weeklyInsight.adherence ?? []).map(p => {
                  const arrow = p.delta > 4 ? '↑' : p.delta < -4 ? '↓' : '·';
                  const arrowColor = p.delta > 4
                    ? (dark ? ATP_BRAND.lime : tokens.tealTexto)
                    : p.delta < -4
                      ? (dark ? '#fb7185' : tokens.error)
                      : (dark ? PILL.textColor : tokens.textoSecundario);
                  return (
                    <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.weeklyPillarLabel, { color: tokens.textoSecundario }]}>{p.label}</Text>
                      <View style={[s.weeklyPillarTrack, { backgroundColor: dark ? tokens.flotante : tokens.hundido }]}>
                        <View style={[s.weeklyPillarFill, { width: `${p.pct}%` }]} />
                      </View>
                      <Text style={[s.weeklyPillarPct, { color: tokens.texto }]}>{p.pct}%</Text>
                      <Text style={[s.weeklyPillarDelta, { color: arrowColor }]}>{arrow}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Texto ARGOS o degradación */}
              {weeklyInsight.argosFailed ? (
                <Text style={[s.weeklyFallback, { color: tokens.textoSecundario }]}>
                  No pudimos generar el insight reflexivo esta semana: los números arriba ya cuentan tu historia.
                </Text>
              ) : (
                <>
                  {weeklyInsight.argosText ? (
                    <Text style={[s.weeklyText, { color: tokens.texto }]}>{weeklyInsight.argosText}</Text>
                  ) : null}
                  {weeklyInsight.question ? (
                    <Text style={[s.weeklyQuestion, { color: acento }]}>{weeklyInsight.question}</Text>
                  ) : null}
                </>
              )}
            </View>
          </Animated.View>
        )}

        {/* #v13e 3.C: "Cierre del día" (DAILY REVIEW) eliminado del HOY — su mini-reporte (score,
            electrones, racha) se resolvió en la lente del día, no en una card aparte. */}

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

        {/* MB-26 P8: "Ajustar Mi Protocolo" se retiró — nombre muerto desde
            que murió ATP PROTOCOLOS y chocaba de frente con los packs. Su
            destino (/salud/intervenciones) conserva sus puertas propias: la
            puerta "Mi protocolo" del pilar SALUD, el registro de apps y el
            diagnóstico. El pie de HOY queda para el día: ordenarlo y elegir
            hábitos. */}

        {/* MB-26 P4: la salida al desmadre — graduar, reposar, empezar de
            cero o dejar que ARGOS proponga. Nada se borra ni se desinstala.
            MB-27 V3 (doctrina): el techo murió como límite; este renglón es
            su heredero informativo — el conteo de renglones activos SIEMPRE
            visible, sin umbral y sin juicio: el marcador de tu propio día
            con la salida al lado. Sin conteo aún (compile en curso) se
            muestra la acción sola: jamás un número inventado. */}
        <GradientCTA
          label={(() => {
            if (!day) return 'Ordenar mi día';
            const n = day.booleanElectrons.length + day.quantitativeElectrons.length;
            return `${n} ${n === 1 ? 'hábito activo' : 'hábitos activos'} · Ordenar mi día`;
          })()}
          variant="quiet"
          icon="sparkles-outline"
          onPress={() => { haptic.light(); router.push('/ordenar-dia'); }}
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

      {/* F3 (AGENDA-COMPLETE): el modal de la campana se retiró — el inbox vive en /notifications
          (el INSIGHT ARGOS del día se muestra ahí, fijado arriba). */}

      {/* MB-11 B: el sheet de quick-voice y el indicador FAB "ARGOS piensa" eran
          código muerto desde N1 (ARGOS vive en el menú inferior) — retirados. */}

      {/* hotfix-ux FIX 4: reacción ARGOS (pool encouragement) + atribución "+X ⚡ Fuente"
          tras cada award de electrón. Escucha 'electron_awarded' (electron-service). */}
      <ArgosReactionToast />
    </View>
    </ThemeReady>
  );
}

// ═══════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════

// MB-31B: layout + defaults oscuros (rgba sobre negro); el claro entra
// inline desde los tokens. Los tintes lima de la weekly card son marca.
const s = StyleSheet.create({
  root: {
    flex: 1,
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
  // 16px contra un label de 12: la marca ocupa el alto del bloque de texto y
  // ni un pixel más. Subirla convierte el encabezado en el protagonista de la
  // pantalla, y el protagonista de HOY es el checklist.
  brandMark: {
    width: 16,
    height: 16,
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
    color: Colors.textPrimary,
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
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  weeklyPillarLabel: {
    width: 80,
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  weeklyPillarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  weeklyPillarFill: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: 3,
  },
  weeklyPillarPct: {
    width: 40,
    textAlign: 'right',
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
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 19,
  },
  weeklyQuestion: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  weeklyFallback: {
    marginTop: 12,
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
