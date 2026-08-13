/**
 * Fitness Hub (MB-3.6 Bloque 1.2) — el hub abre con LA SESIÓN DE HOY.
 *
 * Patrón Oura "one big thing": un solo protagonista — qué toca hoy, cuánto
 * dura y un botón grande para empezar (el motor es determinista, así que la
 * sesión de hoy se regenera aquí sin persistirla). Estados honestos:
 *   · primer_uso → pregunta el nivel (onboarding de Fitness, va al perfil 224)
 *   · sin_prefs  → CTA "Genera tu sesión" (misma jerarquía, distinto copy)
 *   · lista      → sesión de hoy + EMPEZAR directo al runner
 *   · entrenado  → completado + qué logró (no ofrece entrenar como si nada)
 * Debajo: la semana en tamaño secundario; las 3 navegaciones bajan a terciarias.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ImageBackground, DeviceEventEmitter } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { pickFitnessImage } from '@/src/utils/yo-image-picker';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT, SEMANTIC, CATEGORY_COLORS, GLOW, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { supabase } from '@/src/lib/supabase';
import { toLocalDateString } from '@/src/utils/date-helpers';
import { useAuth } from '@/src/contexts/auth-context';
import { getTodayFitnessState, type TodayFitnessState } from '@/src/services/fitness/today-session-service';
import { flushPendingSessions } from '@/src/services/fitness/workout-session-service';
import { setFitnessLevel } from '@/src/services/fitness/fitness-profile-service';
import { DIA_LABELS, tituloDeAsignacion, diaSemanaLocal } from '@/src/services/fitness/plan-semanal-core';
import { getAsignacionHoy, type EstadoAsignacionHoy } from '@/src/services/fitness/plan-semanal-service';
import { getCycleInfo, PHASES } from '@/src/services/cycle-service';
import { NIVELES_USUARIO, type NivelUsuario } from '@/src/constants/exercise-matrix';
import type { Objetivo } from '@/src/services/fitness/routine-generator-core';

const NIVEL_LABELS: Record<NivelUsuario, string> = {
  principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado', atleta: 'Atleta',
};

const OBJETIVO_LABELS: Record<Objetivo, string> = {
  fuerza: 'Fuerza', hipertrofia: 'Hipertrofia', metabolico: 'Metabólico', movilidad: 'Movilidad',
};

// Navegación terciaria en secciones (Ola 2 PR2, anexo §4: el hub es LA única
// puerta del pilar). ENTRENAR y REGISTRAR absorben los 4 secundarios de
// fitness-train; la fila "Intervalos" mitiga la descubribilidad de la puerta
// del generador (§6.4).
type NavItem = {
  name: string; subtitle: string; icon: any; color: string;
  route: string; params?: Record<string, string>;
};
const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'ENTRENAR',
    items: [
      { name: 'Mis rutinas', subtitle: 'Rutinas guardadas listas para ejecutar', icon: 'list-outline', color: CATEGORY_COLORS.fitness, route: '/my-routines' },
      { name: 'Construir rutina', subtitle: 'Crea tu rutina desde cero', icon: 'construct-outline', color: SEMANTIC.info, route: '/builder', params: { mode: 'routine' } },
      { name: 'Intervalos', subtitle: 'Tabata · EMOM · AMRAP · 30/30 con voz', icon: 'flame-outline', color: SEMANTIC.error, route: '/routine-generator', params: { puerta: 'intervalos' } },
    ],
  },
  {
    label: 'REGISTRAR',
    items: [
      { name: 'Fuerza', subtitle: 'Series, reps y peso de lo ya hecho', icon: 'add-circle-outline', color: ATP_BRAND.teal, route: '/log-strength' },
      { name: 'Cardio', subtitle: 'Manual o importado de tu app de salud', icon: 'pulse-outline', color: SEMANTIC.error, route: '/log-cardio' },
    ],
  },
  {
    label: 'EXPLORAR',
    items: [
      { name: 'Biblioteca', subtitle: 'Ejercicios con clip · métodos ATP', icon: 'book-outline', color: SEMANTIC.info, route: '/exercise-library' },
      { name: 'Movilidad', subtitle: 'Evalúate · rutinas de movilidad', icon: 'body-outline', color: CATEGORY_COLORS.mind, route: '/mobility-assessment' },
    ],
  },
  // Ola 2 PR2 (ex fitness-my): las retrospectivas conservan sus rutas de hoy
  // — se van a Reports en OTRA ola (Anexo A), no en esta.
  {
    label: 'MI FITNESS',
    items: [
      { name: 'Fuerza y récords', subtitle: 'Benchmarks · variantes · todos tus PRs', icon: 'barbell-outline', color: CATEGORY_COLORS.fitness, route: '/fitness-strength' },
      { name: 'Mi progreso', subtitle: 'Resumen del mes · frecuencia · volumen', icon: 'trending-up-outline', color: ATP_BRAND.teal, route: '/progress' },
      { name: 'Historial', subtitle: 'Todas tus sesiones, por fecha', icon: 'time-outline', color: SEMANTIC.info, route: '/history' },
    ],
  },
];

export default function FitnessHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: t } = useAppTheme();
  // D-3 (MB-12): null = aún sin leer o falló — jamás pintar ceros por error.
  const [stats, setStats] = useState<{ sessions: number; volume: number; prs: number } | null>(null);
  const [today, setToday] = useState<TodayFitnessState | null>(null);
  // Batch 3 (#22): hero editorial sex-aware (fitness-el/ella).
  const [bioSex, setBioSex] = useState<string | null>(null);
  const [guardandoNivel, setGuardandoNivel] = useState(false);
  // Ola 2 PR2 (ex fitness-train): la asignación del día para el copy del
  // plan (hoy descansas / próximo día). null = sin leer o fallida — degrada
  // callada.
  const [asignacion, setAsignacion] = useState<EstadoAsignacionHoy | null>(null);
  // Ola 2 PR2 (ex fitness-train, MB-27 P3): la fase del ciclo. getCycleInfo
  // se auto-gatea (solo mujer en modo propio, con datos); fail-CLOSED — info
  // null LIMPIA la tira.
  const [fase, setFase] = useState<{
    phase: string; day: number; cycleLen: number;
    largoFuente: 'observado' | 'ajuste'; cyclesUsed: number;
  } | null>(null);

  const cargarHoy = useCallback(() => {
    if (!user) return;
    getTodayFitnessState(user.id).then(setToday).catch(() => {});
  }, [user]);

  useFocusEffect(useCallback(() => {
    loadWeekStats();
    cargarHoy();
    // MB-5 0.2: re-sube sesiones que fallaron al guardar (silencioso, fail-soft).
    if (user) {
      flushPendingSessions(user.id).then((n) => {
        if (n > 0) {
          DeviceEventEmitter.emit('electrons_changed');
          DeviceEventEmitter.emit('day_changed');
          loadWeekStats();
          cargarHoy();
        }
      }).catch(() => {});
    }
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      supabase.from('client_profiles').select('biological_sex').eq('user_id', u.id).maybeSingle()
        .then(({ data }) => setBioSex((data as any)?.biological_sex ?? null), () => {});
    });
    // Ola 2 PR2 (ex fitness-train): asignación del día + fase del ciclo.
    if (user) {
      getAsignacionHoy(user.id).then(setAsignacion).catch(() => {});
      getCycleInfo(user.id)
        .then((info) => {
          setFase(info ? {
            phase: info.currentPhase, day: info.currentDay, cycleLen: info.cycleLen,
            largoFuente: info.largoFuente, cyclesUsed: info.cyclesUsed,
          } : null);
        })
        .catch(() => setFase(null));
    }
  }, [cargarHoy, user]));

  async function loadWeekStats() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;

      // D-3 (MB-12): fecha LOCAL (regla técnica #3) — el corte UTC mandaba un
      // entreno de las 7 pm al día siguiente en México.
      const weekAgo = toLocalDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      // D-3: las SESIONES salen de workout_sessions (fuente que sí se escribe
      // bien, con `date` local) — contar días de exercise_logs daba 0 en una
      // semana entrenada solo con timer HIIT o cardio.
      const [sessionsRes, logsRes, prsRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('date')
          .eq('user_id', u.id)
          .gte('date', weekAgo),
        supabase
          .from('exercise_logs')
          .select('logged_at, weight_kg, reps')
          .eq('user_id', u.id)
          .gte('logged_at', weekAgo),
        // HOTFIX schema (verificado por SQL): personal_records no tiene `date`
        // — la columna real es `achieved_at`. El date=gte daba 400 silencioso.
        supabase
          .from('personal_records')
          .select('id')
          .eq('user_id', u.id)
          .gte('achieved_at', weekAgo),
      ]);
      // D-3: si algo falló, NO pintar ceros junto al dato que sí cargó.
      if (sessionsRes.error || logsRes.error || prsRes.error) return;

      const uniqueDays = new Set((sessionsRes.data ?? []).map(r => String((r as any).date).slice(0, 10))).size;
      const totalVolume = (logsRes.data ?? []).reduce((sum, l: any) => sum + ((l.weight_kg || 0) * (l.reps || 0)), 0);

      setStats({ sessions: uniqueDays, volume: Math.round(totalVolume), prs: prsRes.data?.length || 0 });
    } catch { /* opcional */ }
  }

  async function elegirNivel(nivel: NivelUsuario) {
    if (!user || guardandoNivel) return;
    haptic.medium();
    setGuardandoNivel(true);
    await setFitnessLevel(user.id, nivel);
    setGuardandoNivel(false);
    cargarHoy();
  }

  function empezarSesion() {
    if (today?.kind !== 'lista') return;
    haptic.success();
    router.push({
      pathname: '/session',
      params: { plan: JSON.stringify(today.rutina), name: 'Sesión de hoy' },
    });
  }

  const heroImg = pickFitnessImage(bioSex);

  // ── El protagonista: la sesión de hoy ──
  function renderHoy() {
    if (!today) {
      return (
        <View style={[s.heroLoading, { backgroundColor: t.card, borderColor: t.borde }]}>
          <EliteText style={[s.heroLoadingText, { color: t.textoSecundario }]}>Preparando tu día…</EliteText>
        </View>
      );
    }

    // Onboarding de Fitness: primera vez → nivel al perfil (224).
    if (today.kind === 'primer_uso') {
      return (
        <ImageBackground source={heroImg} style={s.heroCard} imageStyle={s.heroImg}>
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.6)', 'rgba(10,10,10,0.96)']} style={StyleSheet.absoluteFill} />
          <View style={s.heroInner}>
            <EliteText style={s.heroKicker}>PRIMERA VEZ EN FITNESS</EliteText>
            <EliteText style={s.heroTitle}>¿Cuál es tu nivel?</EliteText>
            <EliteText style={s.heroBody}>
              Define el volumen y los ejercicios que el motor te prescribe. Lo puedes cambiar cuando quieras en el generador.
            </EliteText>
            <View style={s.nivelRow}>
              {NIVELES_USUARIO.map((n) => (
                <AnimatedPressable key={n} onPress={() => elegirNivel(n)} style={s.nivelChip} disabled={guardandoNivel}>
                  <EliteText style={s.nivelChipText}>{NIVEL_LABELS[n]}</EliteText>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </ImageBackground>
      );
    }

    // Ya entrenó hoy → completado + qué logró (no "entrena de nuevo" como si nada).
    if (today.kind === 'entrenado') {
      const { sesion, cardioHoy } = today;
      const min = Math.max(1, Math.round(sesion.duration_seconds / 60));
      return (
        <ImageBackground source={heroImg} style={s.heroCard} imageStyle={s.heroImg}>
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.6)', 'rgba(10,10,10,0.96)']} style={StyleSheet.absoluteFill} />
          <View style={s.heroInner}>
            <View style={s.doneRow}>
              <Ionicons name="checkmark-circle" size={18} color={ATP_BRAND.lime} />
              <EliteText style={s.heroKickerLime}>SESIÓN DE HOY COMPLETADA</EliteText>
            </View>
            <EliteText style={s.heroTitle}>{sesion.routine_name ?? 'Entrenamiento'}</EliteText>
            <View style={s.logrosRow}>
              <Logro valor={String(sesion.exercises_count)} label="Ejercicios" />
              <Logro valor={`${Math.round(sesion.volume_kg)}`} label="Kg movidos" />
              <Logro valor={`${min}′`} label="Duración" />
              {sesion.prs_count > 0 && <Logro valor={`${sesion.prs_count}`} label="PRs" destacado />}
            </View>
            {cardioHoy.length > 0 && (
              <EliteText style={s.cardioLine}>
                + cardio hoy: {cardioHoy.length} {cardioHoy.length === 1 ? 'sesión' : 'sesiones'}
              </EliteText>
            )}
            <GradientCTA
              label="ENTRENAR OTRA VEZ"
              variant="quiet"
              icon="refresh-outline"
              onPress={() => { haptic.light(); router.push('/routine-generator'); }}
              style={{ marginTop: Spacing.sm, alignSelf: 'flex-start' }}
            />
          </View>
        </ImageBackground>
      );
    }

    // Sesión lista: qué toca, cuánto dura, y EMPEZAR.
    // Audit B5: la asignación del día MANDA aquí, en la puerta real. Con
    // rutina agendada (coach o propia) el hero la anuncia y la abre; con
    // enfoque del plan, la sesión ya viene generada CON ese enfoque
    // (enfoqueUsado/objetivoUsado dicen la verdad de lo generado).
    if (today.kind === 'lista') {
      const { rutina, asignacion } = today;
      const min = Math.max(1, Math.round(rutina.tiempoTotalSeg / 60));
      if (asignacion?.routine_id != null) {
        const nombreRutina = asignacion.routine_name?.trim() || 'Tu rutina asignada';
        return (
          <ImageBackground source={heroImg} style={s.heroCard} imageStyle={s.heroImg}>
            <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.96)']} style={StyleSheet.absoluteFill} />
            <View style={s.heroInner}>
              <EliteText style={s.heroKicker}>TU PLAN · HOY TOCA</EliteText>
              <EliteText style={s.heroTitle}>{nombreRutina}</EliteText>
              <EliteText style={s.heroBody}>
                Tu rutina agendada para hoy, lista para ejecutar.
              </EliteText>
              <View style={{ marginTop: Spacing.md }}>
                <GradientCTA
                  label="ABRIR RUTINA"
                  pillar="fitness"
                  icon="play"
                  onPress={() => {
                    haptic.success();
                    router.push({ pathname: '/my-routines', params: { abrir: asignacion.routine_id! } });
                  }}
                />
              </View>
              <GradientCTA
                label="Generar otra cosa"
                variant="quiet"
                icon="options-outline"
                onPress={() => { haptic.light(); router.push('/routine-generator'); }}
                style={{ marginTop: 2 }}
              />
            </View>
          </ImageBackground>
        );
      }
      return (
        <ImageBackground source={heroImg} style={s.heroCard} imageStyle={s.heroImg}>
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.96)']} style={StyleSheet.absoluteFill} />
          <View style={s.heroInner}>
            <EliteText style={s.heroKicker}>{asignacion ? 'TU PLAN · HOY TOCA' : 'HOY TOCA'}</EliteText>
            <EliteText style={s.heroTitle}>
              {OBJETIVO_LABELS[today.objetivoUsado]}
              {today.objetivoUsado !== 'movilidad' ? ` · ${enfoqueLabel(today.enfoqueUsado)}` : ''}
            </EliteText>
            <EliteText style={s.heroBody}>
              {rutina.bloques.length} ejercicios · ~{min} min con tu equipo de siempre
            </EliteText>
            <View style={{ marginTop: Spacing.md }}>
              <GradientCTA label="EMPEZAR" pillar="fitness" icon="play" onPress={empezarSesion} />
            </View>
            <GradientCTA
              label="Ajustar sesión"
              variant="quiet"
              icon="options-outline"
              onPress={() => {
                haptic.light();
                // Paridad hub ↔ generador: el ajuste abre con el MISMO
                // enfoque asignado (deep-link), no con la pref vieja.
                if (asignacion?.focus) router.push(`/routine-generator?enfoque=${asignacion.focus}`);
                else router.push('/routine-generator');
              }}
              style={{ marginTop: 2 }}
            />
          </View>
        </ImageBackground>
      );
    }

    // sin_prefs: misma jerarquía, distinto copy.
    return (
      <ImageBackground source={heroImg} style={s.heroCard} imageStyle={s.heroImg}>
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.96)']} style={StyleSheet.absoluteFill} />
        <View style={s.heroInner}>
          <EliteText style={s.heroKicker}>TU SESIÓN DE HOY</EliteText>
          <EliteText style={s.heroTitle}>Genera tu sesión</EliteText>
          <EliteText style={s.heroBody}>
            Dinos objetivo, equipo y tiempo: el motor arma tu rutina del día. Desde mañana, el hub te la tiene lista.
          </EliteText>
          <View style={{ marginTop: Spacing.md }}>
            <GradientCTA
              label="GENERA TU SESIÓN"
              pillar="fitness"
              icon="flash"
              onPress={() => { haptic.medium(); router.push('/routine-generator'); }}
            />
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="fitness" title="Fitness" />
      <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
        <CommunityPresence pillar="fitness" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* PROTAGONISTA — la sesión de hoy. GLOW selectivo (doctrina: 1 por
            pantalla): el halo lima le da profundidad al héroe y nada más compite. */}
        <Animated.View entering={FadeInDown.duration(300).springify()} style={s.heroGlow}>
          {renderHoy()}
        </Animated.View>

        {/* Ola 2 PR2 (ex fitness-train): la salida clara al plan de días, con
            el copy de próximo día cuando hoy es descanso. */}
        <Animated.View entering={FadeInUp.delay(90).springify()}>
          <AnimatedPressable
            style={s.planLink}
            onPress={() => { haptic.light(); router.push('/plan-entrenamiento'); }}
          >
            <Ionicons name="calendar-outline" size={16} color={t.textoSecundario} />
            <EliteText style={[s.planLinkText, { color: t.textoSecundario }]}>
              {asignacion?.hoy
                ? 'Cambiar mi plan de días'
                : asignacion?.tienePlan
                  ? asignacion.proxima
                    ? `Hoy descansas · próximo: ${DIA_LABELS[diaSemanaLocal(asignacion.proxima.date)]} · ${tituloDeAsignacion(asignacion.proxima.row)}`
                    : 'Hoy descansas · cambiar mi plan de días'
                  : 'Dí qué días entrenas y el hub te contesta'}
            </EliteText>
            <Ionicons name="chevron-forward" size={14} color={t.textoTenue} />
          </AnimatedPressable>
        </Animated.View>

        {/* Ola 2 PR2 (ex fitness-train, MB-27 P3): la fase, bidireccional.
            Folicular/ovulación EMPUJAN, lútea/menstrual escuchan — el copy es
            PHASES[x].exercise (el canónico). Informa y sugiere: nada se
            esconde ni se prohíbe por la fase. Solo cuenta propia. */}
        {fase && PHASES[fase.phase] && (
          <Animated.View entering={FadeInUp.delay(110).springify()}>
            <AnimatedPressable
              style={[s.faseCard, { backgroundColor: t.card, borderColor: withOpacity(PHASES[fase.phase].color, 0.35) }]}
              onPress={() => { haptic.light(); router.push('/cycle'); }}
            >
              <Ionicons
                name={PHASES[fase.phase].icon as any}
                size={18}
                color={PHASES[fase.phase].color}
              />
              <View style={{ flex: 1 }}>
                <EliteText style={[s.faseTitulo, { color: PHASES[fase.phase].color }]}>
                  Fase {PHASES[fase.phase].label.toLowerCase()} · día {fase.day}
                </EliteText>
                <EliteText style={[s.faseCopy, { color: t.textoSecundario }]}>{PHASES[fase.phase].exercise}</EliteText>
                {/* Audit V2 B1: el número SIEMPRE dice de dónde sale. */}
                <EliteText style={[s.faseFuente, { color: t.textoTenue }]}>
                  {fase.largoFuente === 'observado'
                    ? `Ciclo de ${fase.cycleLen} días: promedio de tus últimos ${fase.cyclesUsed} ciclos registrados.`
                    : `Ciclo de ${fase.cycleLen} días: tu ajuste manual.`}
                </EliteText>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* SECUNDARIO — la semana (compacto, ya no hero).
            MB-3.7 §1.5: el día que YA entrenaste, la card se oculta — el hero
            de completado trae los logros de hoy y no compiten dos resúmenes. */}
        {today?.kind !== 'entrenado' && (
        <Animated.View entering={FadeInUp.delay(120).springify()} style={[s.weekCard, { backgroundColor: t.card, borderColor: t.borde }]}>
          <EliteText style={[s.weekLabel, { color: t.textoSecundario }]}>ESTA SEMANA</EliteText>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <EliteText style={[s.statValue, { color: t.texto }]}>{stats ? stats.sessions : '–'}</EliteText>
              <EliteText style={[s.statLabel, { color: t.textoSecundario }]}>Sesiones</EliteText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <EliteText style={[s.statValue, { color: t.texto }]}>
                {stats ? (stats.volume > 1000 ? `${(stats.volume / 1000).toFixed(1)}k` : stats.volume) : '–'}
              </EliteText>
              <EliteText style={[s.statLabel, { color: t.textoSecundario }]}>Kg movidos</EliteText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <EliteText style={[s.statValue, { color: SEMANTIC.acceptable }]}>{stats ? stats.prs : '–'}</EliteText>
              <EliteText style={[s.statLabel, { color: t.textoSecundario }]}>PRs nuevos</EliteText>
            </View>
          </View>
        </Animated.View>
        )}

        {/* TERCIARIO — navegación en secciones (única puerta del pilar) */}
        {NAV_SECTIONS.map((section, sIdx) => (
          <View key={section.label} style={{ marginTop: Spacing.lg }}>
            <EliteText style={[s.sectionLabel, { color: t.textoSecundario }]}>{section.label}</EliteText>
            {section.items.map((item, idx) => (
              <Animated.View key={item.name} entering={FadeInUp.delay(180 + (sIdx * 3 + idx) * 40).springify()}>
                <AnimatedPressable
                  onPress={() => {
                    haptic.medium();
                    if (item.params) router.push({ pathname: item.route as any, params: item.params });
                    else router.push(item.route as any);
                  }}
                >
                  <GradientCard color={item.color} style={s.navCard}>
                    <View style={s.navRow}>
                      <View style={[s.navIcon, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <EliteText style={[s.navName, { color: t.texto }]}>{item.name}</EliteText>
                        <EliteText style={[s.navSub, { color: t.textoSecundario }]}>{item.subtitle}</EliteText>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
                    </View>
                  </GradientCard>
                </AnimatedPressable>
              </Animated.View>
            ))}
          </View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

function Logro({ valor, label, destacado }: { valor: string; label: string; destacado?: boolean }) {
  return (
    <View style={s.logroItem}>
      <EliteText style={[s.logroValor, destacado && { color: SEMANTIC.acceptable }]}>{valor}</EliteText>
      <EliteText style={s.logroLabel}>{label}</EliteText>
    </View>
  );
}

function enfoqueLabel(e: string): string {
  const labels: Record<string, string> = {
    full_body: 'Cuerpo completo', tren_superior: 'Tren superior', empuje: 'Empuje',
    traccion: 'Tracción', pierna_empuje: 'Pierna empuje', pierna_traccion: 'Pierna tracción',
  };
  return labels[e] ?? e;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Hero — la sesión de hoy (protagonista único)
  // El halo va en el WRAPPER (heroCard tiene overflow:hidden y cliparía la sombra).
  heroGlow: { borderRadius: 20, ...GLOW.accent },
  heroCard: { borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', minHeight: 300 },
  heroImg: { resizeMode: 'cover' },
  heroInner: { padding: 20 },
  heroLoading: {
    borderRadius: 20, minHeight: 300, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  heroLoadingText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  heroKicker: {
    fontSize: 10, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, marginBottom: 6,
  },
  heroKickerLime: { fontSize: 10, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 2 },
  heroTitle: { fontSize: 27, fontFamily: Fonts.extraBold, color: TEXT.primary, lineHeight: 33 },
  heroBody: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.8)',
    lineHeight: 20, marginTop: 6,
  },

  // Onboarding nivel
  nivelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md },
  nivelChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  nivelChipText: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 13 },

  // Completado
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  logrosRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm, flexWrap: 'wrap' },
  logroItem: { alignItems: 'flex-start' },
  logroValor: { fontSize: 22, fontFamily: Fonts.extraBold, color: TEXT.primary, fontVariant: ['tabular-nums'] },
  logroLabel: { fontSize: 10, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  cardioLine: { color: 'rgba(255,255,255,0.75)', fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginTop: Spacing.sm },

  // La semana (secundario)
  weekCard: {
    marginTop: Spacing.md, borderWidth: 1,
    borderRadius: 16, padding: Spacing.md,
  },
  weekLabel: {
    fontSize: 9, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.sm,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontFamily: Fonts.extraBold, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, fontFamily: Fonts.semiBold, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Ola 2 PR2 (ex fitness-train): fila quiet hacia el plan de días.
  planLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: Spacing.sm, paddingHorizontal: 4,
    marginTop: Spacing.xs,
  },
  planLinkText: { flex: 1, fontSize: FontSizes.sm },

  // Ola 2 PR2 (ex fitness-train, MB-27 P3): la tira de fase — informativa,
  // con el color de la fase desaturado en el borde (no compite con el hero).
  faseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14,
    padding: Spacing.md, marginTop: Spacing.xs,
  },
  faseTitulo: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 0.5, marginBottom: 2 },
  faseCopy: { fontSize: FontSizes.sm, lineHeight: 18 },
  faseFuente: { fontSize: FontSizes.xs, marginTop: 4 },

  // Navegación terciaria
  sectionLabel: {
    fontSize: 11, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.sm,
  },
  navCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navName: { fontSize: FontSizes.md, fontFamily: Fonts.bold, marginBottom: 2 },
  navSub: { fontSize: FontSizes.xs },
});
