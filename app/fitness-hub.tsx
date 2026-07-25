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
import { View, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { ATP_BRAND, TEXT, SEMANTIC, CATEGORY_COLORS, ELEVATION, withOpacity } from '@/src/constants/brand';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { getTodayFitnessState, type TodayFitnessState } from '@/src/services/fitness/today-session-service';
import { setFitnessLevel } from '@/src/services/fitness/fitness-profile-service';
import { NIVELES_USUARIO, type NivelUsuario } from '@/src/constants/exercise-matrix';
import type { Objetivo } from '@/src/services/fitness/routine-generator-core';

const NIVEL_LABELS: Record<NivelUsuario, string> = {
  principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado', atleta: 'Atleta',
};

const OBJETIVO_LABELS: Record<Objetivo, string> = {
  fuerza: 'Fuerza', hipertrofia: 'Hipertrofia', metabolico: 'Metabólico', movilidad: 'Movilidad',
};

// Navegación terciaria (las 3 cards grandes bajaron a filas compactas).
// Explorar ya no es menú intermedio: va directo a la biblioteca (los métodos
// ATP viven dentro de ella — MB-3.6 Bloque 1.1).
const NAV_ITEMS = [
  { name: 'Mi Fitness', subtitle: 'Fuerza y récords · cardio · movilidad', icon: 'trophy-outline' as const, color: CATEGORY_COLORS.fitness, route: '/fitness-my' as const },
  { name: 'Entrenar', subtitle: 'Rutinas · builder · HIIT · registro', icon: 'flash-outline' as const, color: ATP_BRAND.teal, route: '/fitness-train' as const },
  { name: 'Biblioteca', subtitle: 'Ejercicios con clip · métodos ATP', icon: 'book-outline' as const, color: '#5B9BD5', route: '/exercise-library' as const },
];

export default function FitnessHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState({ sessions: 0, volume: 0, prs: 0 });
  const [today, setToday] = useState<TodayFitnessState | null>(null);
  // Batch 3 (#22): hero editorial sex-aware (fitness-el/ella).
  const [bioSex, setBioSex] = useState<string | null>(null);
  const [guardandoNivel, setGuardandoNivel] = useState(false);

  const cargarHoy = useCallback(() => {
    if (!user) return;
    getTodayFitnessState(user.id).then(setToday).catch(() => {});
  }, [user]);

  useFocusEffect(useCallback(() => {
    loadWeekStats();
    cargarHoy();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      supabase.from('client_profiles').select('biological_sex').eq('user_id', u.id).maybeSingle()
        .then(({ data }) => setBioSex((data as any)?.biological_sex ?? null), () => {});
    });
  }, [cargarHoy]));

  async function loadWeekStats() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // HOTFIX schema: exercise_logs no tiene columna `date` — es `logged_at`
      // (mismo bug de clase que personal_records abajo: 400 silencioso → stats en 0).
      const { data: logs } = await supabase
        .from('exercise_logs')
        .select('logged_at, weight_kg, reps')
        .eq('user_id', u.id)
        .gte('logged_at', weekAgo);

      const uniqueDays = new Set((logs || []).map(l => String(l.logged_at ?? '').slice(0, 10))).size;
      const totalVolume = (logs || []).reduce((sum, l) => sum + ((l.weight_kg || 0) * (l.reps || 0)), 0);

      // HOTFIX schema (verificado por SQL): personal_records no tiene `date` —
      // la columna real es `achieved_at`. El date=gte daba 400 silencioso.
      const { data: prs } = await supabase
        .from('personal_records')
        .select('id')
        .eq('user_id', u.id)
        .gte('achieved_at', weekAgo);

      setStats({ sessions: uniqueDays, volume: Math.round(totalVolume), prs: prs?.length || 0 });
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
      pathname: '/strength-session',
      params: { plan: JSON.stringify(today.rutina), name: 'Sesión de hoy' },
    });
  }

  const heroImg = pickFitnessImage(bioSex);

  // ── El protagonista: la sesión de hoy ──
  function renderHoy() {
    if (!today) {
      return (
        <View style={s.heroLoading}>
          <EliteText style={s.heroLoadingText}>Preparando tu día…</EliteText>
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
    if (today.kind === 'lista') {
      const { rutina, prefs } = today;
      const min = Math.max(1, Math.round(rutina.tiempoTotalSeg / 60));
      return (
        <ImageBackground source={heroImg} style={s.heroCard} imageStyle={s.heroImg}>
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.96)']} style={StyleSheet.absoluteFill} />
          <View style={s.heroInner}>
            <EliteText style={s.heroKicker}>HOY TOCA</EliteText>
            <EliteText style={s.heroTitle}>
              {OBJETIVO_LABELS[prefs.objetivo]}
              {prefs.objetivo !== 'movilidad' ? ` · ${enfoqueLabel(prefs.enfoque)}` : ''}
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
              onPress={() => { haptic.light(); router.push('/routine-generator'); }}
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
            Dinos objetivo, equipo y tiempo — el motor arma tu rutina del día. Desde mañana, el hub te la tiene lista.
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
    <Screen>
      <PillarHeader pillar="fitness" title="Fitness" />
      <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
        <CommunityPresence pillar="fitness" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* PROTAGONISTA — la sesión de hoy */}
        <Animated.View entering={FadeInDown.duration(300).springify()}>
          {renderHoy()}
        </Animated.View>

        {/* SECUNDARIO — la semana (compacto, ya no hero).
            MB-3.7 §1.5: el día que YA entrenaste, la card se oculta — el hero
            de completado trae los logros de hoy y no compiten dos resúmenes. */}
        {today?.kind !== 'entrenado' && (
        <Animated.View entering={FadeInUp.delay(120).springify()} style={s.weekCard}>
          <EliteText style={s.weekLabel}>ESTA SEMANA</EliteText>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <EliteText style={s.statValue}>{stats.sessions}</EliteText>
              <EliteText style={s.statLabel}>Sesiones</EliteText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <EliteText style={s.statValue}>
                {stats.volume > 1000 ? `${(stats.volume / 1000).toFixed(1)}k` : stats.volume}
              </EliteText>
              <EliteText style={s.statLabel}>Kg movidos</EliteText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <EliteText style={[s.statValue, { color: SEMANTIC.acceptable }]}>{stats.prs}</EliteText>
              <EliteText style={s.statLabel}>PRs nuevos</EliteText>
            </View>
          </View>
        </Animated.View>
        )}

        {/* TERCIARIO — navegación en filas compactas */}
        <View style={{ marginTop: Spacing.lg }}>
          {NAV_ITEMS.map((item, idx) => (
            <Animated.View key={item.name} entering={FadeInUp.delay(180 + idx * 40).springify()}>
              <AnimatedPressable onPress={() => { haptic.medium(); router.push(item.route); }}>
                <GradientCard color={item.color} style={s.navCard}>
                  <View style={s.navRow}>
                    <View style={[s.navIcon, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                      <Ionicons name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <EliteText style={s.navName}>{item.name}</EliteText>
                      <EliteText style={s.navSub}>{item.subtitle}</EliteText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
                  </View>
                </GradientCard>
              </AnimatedPressable>
            </Animated.View>
          ))}
        </View>

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
  heroCard: { borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', minHeight: 300 },
  heroImg: { resizeMode: 'cover' },
  heroInner: { padding: 20 },
  heroLoading: {
    borderRadius: 20, minHeight: 300, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  heroLoadingText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: FontSizes.sm },
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
    marginTop: Spacing.md, backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: 16, padding: Spacing.md,
  },
  weekLabel: {
    fontSize: 9, fontFamily: Fonts.bold, color: TEXT.secondary,
    letterSpacing: 2, marginBottom: Spacing.sm,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontFamily: Fonts.extraBold, color: TEXT.primary, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, fontFamily: Fonts.semiBold, color: TEXT.secondary, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Navegación terciaria
  navCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navName: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT.primary, marginBottom: 2 },
  navSub: { fontSize: FontSizes.xs, color: TEXT.secondary },
});
