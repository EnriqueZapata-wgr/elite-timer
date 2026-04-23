/**
 * Fitness Hub — Estructura exacta CT4.
 *
 * ATP FITNESS
 * ── RESUMEN DE ACTIVIDAD DE ESTA SEMANA
 * ── MI FITNESS (perfil, fuerza, cardio, movilidad)
 * ── ENTRENAR (ARGOS hero, HIIT/Timer expandible, Rutinas expandible)
 * ── EXPLORAR (biblioteca, planes, follow me, métodos)
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { HelpButton } from '@/src/components/HelpButton';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS } from '@/src/constants/brand';
import { getWeeklyStats } from '@/src/services/exercise-service';
import { supabase } from '@/src/lib/supabase';

export default function FitnessHubScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ workouts: 0, volumeKg: 0, prs: 0 });
  const [routineCount, setRoutineCount] = useState(0);
  const [timerCount, setTimerCount] = useState(0);
  const [totalPRs, setTotalPRs] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  // Sub-secciones expandibles
  const [showTimers, setShowTimers] = useState(false);
  const [showRoutines, setShowRoutines] = useState(false);
  const [showBiblioteca, setShowBiblioteca] = useState(false);
  const [showPlanes, setShowPlanes] = useState(false);
  const [showFollowMe, setShowFollowMe] = useState(false);

  useFocusEffect(useCallback(() => {
    getWeeklyStats().then(s => setStats({ workouts: s.workouts, volumeKg: s.volumeKg, prs: s.prs }));
    loadCounts();
  }, []));

  async function loadCounts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Rutinas vs timers
      const { data: routines } = await supabase
        .from('routines')
        .select('id, mode')
        .eq('creator_id', user.id);
      const all = routines || [];
      setRoutineCount(all.filter(r => r.mode === 'routine').length);
      setTimerCount(all.filter(r => r.mode === 'timer').length);

      // Total PRs
      const { count: prCount } = await supabase
        .from('personal_records')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalPRs(prCount || 0);

      // Total sesiones (días únicos con exercise_logs)
      const { data: logs } = await supabase
        .from('exercise_logs')
        .select('date')
        .eq('user_id', user.id);
      setTotalSessions(new Set((logs || []).map(l => l.date)).size);
    } catch { /* opcional */ }
  }

  function nav(path: string, params?: any) {
    haptic.medium();
    router.push(params ? { pathname: path, params } as any : path as any);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Fitness" rightContent={
        <HelpButton
          title="¿Cómo usar Fitness?"
          color="#a8e02a"
          tips={[
            'ARGOS genera rutinas personalizadas con tu nivel y PRs',
            'Expande HIIT/Timer o Rutinas para ver todas las opciones',
            'En "Mis rutinas", mantén presionado para editar, duplicar o eliminar',
            'Busca cualquier ejercicio en la Biblioteca',
            'Los métodos ATP (3-5, EMOM, Myo Reps) se seleccionan al registrar',
          ]}
        />
      } />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>

        {/* ════════════════════════════════════════════════════════════════
            RESUMEN DE ACTIVIDAD DE ESTA SEMANA
        ════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <GradientCard gradient={PILLAR_GRADIENTS.fitness} padding={20}>
            <EliteText style={st.sectionLabel}>RESUMEN DE ACTIVIDAD ESTA SEMANA</EliteText>
            <View style={st.statsRow}>
              <StatCell value={stats.workouts} label="Sesiones" />
              <View style={st.statDivider} />
              <StatCell value={stats.volumeKg > 1000 ? `${(stats.volumeKg / 1000).toFixed(1)}k` : String(stats.volumeKg)} label="Kg movidos" />
              <View style={st.statDivider} />
              <StatCell value={stats.prs} label="PRs nuevos" color="#fbbf24" />
            </View>
          </GradientCard>
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════════
            MI FITNESS
        ════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={{ marginTop: Spacing.xl }}>
          <EliteText style={[st.sectionLabel, { color: '#a8e02a' }]}>MI FITNESS</EliteText>

          {/* Mi perfil — resumen compacto */}
          <Pressable onPress={() => nav('/personal-records')}>
            <View style={st.profileCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={[st.navIcon, { backgroundColor: 'rgba(168,224,42,0.12)' }]}>
                  <Ionicons name="person-outline" size={22} color="#a8e02a" />
                </View>
                <EliteText style={st.navTitle}>Mi perfil de fitness</EliteText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <MiniStat value={totalPRs} label="PRs" />
                <MiniStat value={totalSessions} label="Sesiones" />
                <MiniStat value={stats.volumeKg > 1000 ? `${(stats.volumeKg / 1000).toFixed(0)}k` : String(stats.volumeKg)} label="Vol. total" />
              </View>
            </View>
          </Pressable>

          <NavRow icon="barbell-outline" color="#a8e02a" title="Fuerza" sub="Benchmarks · Variantes · PRs" onPress={() => nav('/fitness-strength')} />
          <NavRow icon="pulse-outline" color="#fb7185" title="Cardio" sub="Sesiones · Distancias · Tiempos" onPress={() => nav('/fitness-cardio')} />
          <NavRow icon="body-outline" color="#c084fc" title="Movilidad" sub="Evaluaciones · Rango de movimiento" onPress={() => nav('/mobility-assessment')} />
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════════
            ENTRENAR
        ════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={{ marginTop: Spacing.xl }}>
          <EliteText style={[st.sectionLabel, { color: '#a8e02a' }]}>ENTRENAR</EliteText>

          {/* ARGOS genera tu rutina — card hero */}
          <AnimatedPressable onPress={() => nav('/argos-routine')}>
            <LinearGradient
              colors={['rgba(168,224,42,0.12)', 'rgba(168,224,42,0.04)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={st.argosCard}
            >
              <View style={st.argosIcon}>
                <Ionicons name="eye-outline" size={26} color="#a8e02a" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={st.argosTitle}>ARGOS genera tu rutina</EliteText>
                <EliteText style={st.argosSubtitle}>IA que conoce tu nivel, PRs y objetivos</EliteText>
              </View>
              <Ionicons name="sparkles-outline" size={20} color="#a8e02a" />
            </LinearGradient>
          </AnimatedPressable>

          {/* Registrar ejercicio — acceso rápido */}
          <NavRow icon="add-circle-outline" color="#34d399" title="Registrar ejercicio" sub="Loguear sets, peso y PRs" onPress={() => nav('/log-exercise')} />

          {/* ── HIIT / TIMER (expandible) ── */}
          <Pressable onPress={() => { setShowTimers(!showTimers); haptic.light(); }}>
            <View style={st.expandHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="timer-outline" size={20} color="#fb923c" />
                <EliteText style={st.expandTitle}>HIIT / Timer</EliteText>
              </View>
              <Ionicons name={showTimers ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </View>
          </Pressable>
          {showTimers && (
            <View style={st.expandContent}>
              <SubRow icon="list-outline" title={`Mis timers${timerCount > 0 ? ` (${timerCount})` : ''}`} onPress={() => nav('/my-routines')} />
              <SubRow icon="flash-outline" title="Timer rápido (Tabata)" onPress={() => nav('/builder', { mode: 'timer' })} />
              <SubRow icon="repeat-outline" title="HIIT (ciclos/rondas)" onPress={() => nav('/builder', { mode: 'timer' })} />
              <SubRow icon="construct-outline" title="Construir Timer" onPress={() => nav('/builder', { mode: 'timer' })} />
              <SubRow icon="grid-outline" title="Timers estándar" onPress={() => nav('/my-routines')} />
            </View>
          )}

          {/* ── RUTINAS (expandible) ── */}
          <Pressable onPress={() => { setShowRoutines(!showRoutines); haptic.light(); }}>
            <View style={st.expandHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="barbell-outline" size={20} color="#60a5fa" />
                <EliteText style={st.expandTitle}>Rutinas</EliteText>
              </View>
              <Ionicons name={showRoutines ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </View>
          </Pressable>
          {showRoutines && (
            <View style={st.expandContent}>
              <SubRow icon="list-outline" title={`Mis rutinas${routineCount > 0 ? ` (${routineCount})` : ''}`} onPress={() => nav('/my-routines')} />
              <SubRow icon="construct-outline" title="Construir rutina" onPress={() => nav('/builder', { mode: 'routine' })} />
            </View>
          )}
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════════
            EXPLORAR
        ════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={{ marginTop: Spacing.xl }}>
          <EliteText style={[st.sectionLabel, { color: '#666' }]}>EXPLORAR</EliteText>

          {/* ── Biblioteca de ejercicios (expandible) ── */}
          <Pressable onPress={() => { setShowBiblioteca(!showBiblioteca); haptic.light(); }}>
            <View style={st.expandHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="book-outline" size={20} color="#38bdf8" />
                <EliteText style={st.expandTitle}>Biblioteca de ejercicios</EliteText>
              </View>
              <Ionicons name={showBiblioteca ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </View>
          </Pressable>
          {showBiblioteca && (
            <View style={st.expandContent}>
              <SubRow icon="barbell-outline" title="GYM" onPress={() => nav('/exercise-library', { category: 'gym' })} />
              <SubRow icon="body-outline" title="Calistenia" onPress={() => nav('/exercise-library', { category: 'bodyweight' })} />
              <SubRow icon="fitness-outline" title="Kettlebell" onPress={() => nav('/exercise-library', { category: 'kettlebell' })} />
              <SubRow icon="accessibility-outline" title="Biomecánica" onPress={() => nav('/exercise-library', { category: 'biomechanics' })} />
            </View>
          )}

          {/* ── Planes de entrenamiento (expandible) ── */}
          <Pressable onPress={() => { setShowPlanes(!showPlanes); haptic.light(); }}>
            <View style={st.expandHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="map-outline" size={20} color="#a8e02a" />
                <EliteText style={st.expandTitle}>Planes de entrenamiento</EliteText>
              </View>
              <Ionicons name={showPlanes ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </View>
          </Pressable>
          {showPlanes && (
            <View style={[st.expandContent, { opacity: 0.5 }]}>
              <SubRow icon="walk-outline" title="Entrena para 5K" soon />
              <SubRow icon="walk-outline" title="Entrena para 10K" soon />
              <SubRow icon="walk-outline" title="Entrena para 21K" soon />
              <SubRow icon="walk-outline" title="Entrena para Maratón" soon />
              <SubRow icon="rocket-outline" title="Entrena para ULTRA" soon />
            </View>
          )}

          {/* ── Rutinas Follow Me (expandible, PRONTO) ── */}
          <Pressable onPress={() => { setShowFollowMe(!showFollowMe); haptic.light(); }}>
            <View style={[st.expandHeader, { opacity: 0.5 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="play-circle-outline" size={20} color="#fb7185" />
                <EliteText style={st.expandTitle}>Rutinas Follow Me</EliteText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[st.soonBadge, { backgroundColor: 'rgba(251,113,133,0.1)' }]}>
                  <EliteText style={[st.soonText, { color: '#fb7185' }]}>PRONTO</EliteText>
                </View>
                <Ionicons name={showFollowMe ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
              </View>
            </View>
          </Pressable>
          {showFollowMe && (
            <View style={[st.expandContent, { opacity: 0.5 }]}>
              <SubRow icon="heart-outline" title="Cardio" soon />
              <SubRow icon="shield-outline" title="Core" soon />
              <SubRow icon="paw-outline" title="Animal Motion" soon />
              <SubRow icon="fitness-outline" title="KB Flows" soon />
              <SubRow icon="flash-outline" title="Pliometrics" soon />
            </View>
          )}

          {/* Métodos ATP */}
          <NavRow icon="flash-outline" color="#a8e02a" title="Métodos ATP" sub="3-5 · EMOM Auto · Myo Reps" onPress={() => nav('/training-methods')} />
        </Animated.View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

// ═══ Sub-components ═══

function StatCell({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <View style={st.statItem}>
      <EliteText style={[st.statValue, color ? { color } : null]}>{value}</EliteText>
      <EliteText style={st.statLabel}>{label}</EliteText>
    </View>
  );
}

function MiniStat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <EliteText style={{ color: '#a8e02a', fontSize: 20, fontFamily: Fonts.extraBold }}>{value}</EliteText>
      <EliteText style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{label}</EliteText>
    </View>
  );
}

function NavRow({ icon, color, title, sub, onPress }: {
  icon: string; color: string; title: string; sub: string; onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress}>
      <View style={st.navRow}>
        <View style={[st.navIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <EliteText style={st.navTitle}>{title}</EliteText>
          <EliteText style={st.navSub}>{sub}</EliteText>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#333" />
      </View>
    </AnimatedPressable>
  );
}

function SubRow({ icon, title, onPress, soon }: {
  icon: string; title: string; onPress?: () => void; soon?: boolean;
}) {
  const content = (
    <View style={st.subRow}>
      <Ionicons name={icon as any} size={16} color={soon ? '#555' : '#999'} />
      <EliteText style={[st.subTitle, soon && { color: '#555' }]}>{title}</EliteText>
      {soon ? (
        <View style={st.soonBadge}>
          <EliteText style={st.soonText}>PRONTO</EliteText>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={14} color="#333" />
      )}
    </View>
  );
  if (onPress && !soon) {
    return <Pressable onPress={() => { haptic.light(); onPress(); }}>{content}</Pressable>;
  }
  return content;
}

// ═══ ESTILOS ═══
const st = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  sectionLabel: {
    fontSize: 10, fontFamily: Fonts.bold, color: '#999',
    letterSpacing: 2, marginBottom: Spacing.md,
  },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontFamily: Fonts.extraBold, color: '#a8e02a' },
  statLabel: { fontSize: 10, fontFamily: Fonts.semiBold, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Profile card
  profileCard: {
    backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(168,224,42,0.12)',
  },

  // ARGOS card
  argosCard: {
    borderRadius: 18, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  argosIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(168,224,42,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  argosTitle: { color: '#a8e02a', fontSize: 16, fontFamily: Fonts.extraBold },
  argosSubtitle: { color: '#999', fontSize: 12, marginTop: 2 },

  // Nav rows
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  navIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  navTitle: { color: '#fff', fontSize: 15, fontFamily: Fonts.bold },
  navSub: { color: '#666', fontSize: 11, marginTop: 2 },

  // Expandable headers
  expandHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0a0a0a', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 4, borderWidth: 1, borderColor: '#1a1a1a',
  },
  expandTitle: { color: '#fff', fontSize: 15, fontFamily: Fonts.bold },
  expandContent: { paddingLeft: 20, marginBottom: 8 },

  // Sub rows
  subRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a',
  },
  subTitle: { color: '#ccc', fontSize: 13, fontFamily: Fonts.semiBold, flex: 1 },

  // Soon badge
  soonBadge: {
    backgroundColor: 'rgba(168,224,42,0.1)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  soonText: { color: '#a8e02a', fontSize: 9, fontFamily: Fonts.bold },
});
