/**
 * Fitness Hub — Centro de fitness restructurado.
 *
 * 3 secciones claras:
 * 1. RESUMEN SEMANAL (card compacto)
 * 2. ENTRENAR (acciones principales)
 * 3. MI FITNESS (estado actual: fuerza, cardio, movilidad, PRs)
 * 4. EXPLORAR (biblioteca, métodos, planes futuros)
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
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
import { Colors, Spacing, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS } from '@/src/constants/brand';
import { getWeeklyStats } from '@/src/services/exercise-service';
import { supabase } from '@/src/lib/supabase';

export default function FitnessHubScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ workouts: 0, volumeKg: 0, prs: 0 });
  const [routineCount, setRoutineCount] = useState(0);

  useFocusEffect(useCallback(() => {
    getWeeklyStats().then(s => setStats({ workouts: s.workouts, volumeKg: s.volumeKg, prs: s.prs }));
    loadRoutineCount();
  }, []));

  async function loadRoutineCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('routines')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id);
      setRoutineCount(count || 0);
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
            'En "Mis rutinas", mantén presionado para editar, duplicar o eliminar',
            'El constructor te permite crear rutinas y timers libres',
            'Busca cualquier ejercicio en la biblioteca',
            'Los métodos ATP (3-5, EMOM, Myo Reps) se seleccionan al registrar',
          ]}
        />
      } />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* ================================================================
            RESUMEN SEMANAL
        ================================================================ */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <GradientCard gradient={PILLAR_GRADIENTS.fitness} padding={20}>
            <EliteText style={s.sectionLabel}>ESTA SEMANA</EliteText>
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <EliteText style={s.statValue}>{stats.workouts}</EliteText>
                <EliteText style={s.statLabel}>Sesiones</EliteText>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <EliteText style={s.statValue}>
                  {stats.volumeKg > 1000 ? `${(stats.volumeKg / 1000).toFixed(1)}k` : stats.volumeKg}
                </EliteText>
                <EliteText style={s.statLabel}>Kg movidos</EliteText>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <EliteText style={[s.statValue, { color: '#fbbf24' }]}>{stats.prs}</EliteText>
                <EliteText style={s.statLabel}>PRs nuevos</EliteText>
              </View>
            </View>
          </GradientCard>
        </Animated.View>

        {/* ================================================================
            ENTRENAR — sección principal
        ================================================================ */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={{ marginTop: Spacing.xl }}>
          <EliteText style={[s.sectionLabel, { color: '#a8e02a', marginBottom: Spacing.sm }]}>ENTRENAR</EliteText>

          {/* ARGOS genera tu rutina — card hero */}
          <AnimatedPressable onPress={() => nav('/argos-routine')}>
            <LinearGradient
              colors={['rgba(168,224,42,0.12)', 'rgba(168,224,42,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.argosCard}
            >
              <View style={s.argosIcon}>
                <Ionicons name="eye-outline" size={26} color="#a8e02a" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.argosTitle}>ARGOS genera tu rutina</EliteText>
                <EliteText style={s.argosSubtitle}>IA que conoce tu nivel, PRs y objetivos</EliteText>
              </View>
              <Ionicons name="sparkles-outline" size={20} color="#a8e02a" />
            </LinearGradient>
          </AnimatedPressable>

          {/* Grid 2x2 */}
          <View style={s.grid}>
            <Pressable onPress={() => nav('/my-routines')} style={s.gridItem}>
              <Ionicons name="list-outline" size={22} color="#a8e02a" />
              <EliteText style={s.gridTitle}>Mis rutinas</EliteText>
              <EliteText style={s.gridSub}>
                {routineCount > 0 ? `${routineCount} guardadas` : 'Crea tu primera'}
              </EliteText>
            </Pressable>

            <Pressable onPress={() => nav('/builder', { mode: 'routine' })} style={s.gridItem}>
              <Ionicons name="construct-outline" size={22} color="#60a5fa" />
              <EliteText style={s.gridTitle}>Construir rutina</EliteText>
              <EliteText style={s.gridSub}>Desde cero</EliteText>
            </Pressable>
          </View>

          <View style={s.grid}>
            <Pressable onPress={() => nav('/builder', { mode: 'timer' })} style={s.gridItem}>
              <Ionicons name="timer-outline" size={22} color="#fb923c" />
              <EliteText style={s.gridTitle}>Timer rápido</EliteText>
              <EliteText style={s.gridSub}>Tabata · HIIT · EMOM</EliteText>
            </Pressable>

            <Pressable onPress={() => nav('/log-exercise')} style={s.gridItem}>
              <Ionicons name="add-circle-outline" size={22} color="#34d399" />
              <EliteText style={s.gridTitle}>Registrar</EliteText>
              <EliteText style={s.gridSub}>Loguear sets y PRs</EliteText>
            </Pressable>
          </View>
        </Animated.View>

        {/* ================================================================
            MI FITNESS — estado actual
        ================================================================ */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={{ marginTop: Spacing.xl }}>
          <EliteText style={[s.sectionLabel, { marginBottom: Spacing.sm }]}>MI FITNESS</EliteText>

          <NavRow icon="barbell-outline" color="#a8e02a" title="Fuerza" sub="Benchmarks · Variantes · PRs" onPress={() => nav('/fitness-strength')} />
          <NavRow icon="pulse-outline" color="#fb7185" title="Cardio" sub="Sesiones · Distancias · Tiempos" onPress={() => nav('/fitness-cardio')} />
          <NavRow icon="body-outline" color="#c084fc" title="Movilidad" sub="Evaluaciones · Rango de movimiento" onPress={() => nav('/mobility-assessment')} />
          <NavRow icon="trophy-outline" color="#fbbf24" title="Récords personales" sub="Todos tus PRs en un lugar" onPress={() => nav('/personal-records')} />
        </Animated.View>

        {/* ================================================================
            EXPLORAR — contenido y bibliotecas
        ================================================================ */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={{ marginTop: Spacing.xl }}>
          <EliteText style={[s.sectionLabel, { color: '#666', marginBottom: Spacing.sm }]}>EXPLORAR</EliteText>

          <NavRow icon="book-outline" color="#38bdf8" title="Biblioteca de ejercicios" sub="Gym · Calistenia · KB · Movilidad" onPress={() => nav('/exercise-library')} />
          <NavRow icon="flash-outline" color="#a8e02a" title="Métodos ATP" sub="3-5 · EMOM Auto · Myo Reps" onPress={() => nav('/training-methods')} />

          {/* Planes de entrenamiento — próximamente */}
          <View style={[s.navRow, { opacity: 0.5 }]}>
            <View style={[s.navIcon, { backgroundColor: 'rgba(168,224,42,0.1)' }]}>
              <Ionicons name="map-outline" size={22} color="#a8e02a" />
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={s.navTitle}>Planes de entrenamiento</EliteText>
              <EliteText style={s.navSub}>5K · 10K · 21K · Maratón</EliteText>
            </View>
            <View style={s.soonBadge}>
              <EliteText style={s.soonText}>PRONTO</EliteText>
            </View>
          </View>

          {/* Rutinas Follow Me — próximamente */}
          <View style={[s.navRow, { opacity: 0.5 }]}>
            <View style={[s.navIcon, { backgroundColor: 'rgba(251,113,133,0.1)' }]}>
              <Ionicons name="play-circle-outline" size={22} color="#fb7185" />
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={s.navTitle}>Rutinas Follow Me</EliteText>
              <EliteText style={s.navSub}>Cardio · Core · Animal Motion · KB Flows</EliteText>
            </View>
            <View style={[s.soonBadge, { backgroundColor: 'rgba(251,113,133,0.1)' }]}>
              <EliteText style={[s.soonText, { color: '#fb7185' }]}>PRONTO</EliteText>
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

// ═══ NavRow component ═══
function NavRow({ icon, color, title, sub, onPress }: {
  icon: string; color: string; title: string; sub: string; onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress}>
      <View style={s.navRow}>
        <View style={[s.navIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <EliteText style={s.navTitle}>{title}</EliteText>
          <EliteText style={s.navSub}>{sub}</EliteText>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#333" />
      </View>
    </AnimatedPressable>
  );
}

// ═══ ESTILOS ═══
const s = StyleSheet.create({
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

  // Grid 2x2
  grid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  gridItem: {
    flex: 1, backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1a1a1a', minHeight: 100,
  },
  gridTitle: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold, marginTop: 10 },
  gridSub: { color: '#666', fontSize: 11, marginTop: 2 },

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

  // Soon badge
  soonBadge: {
    backgroundColor: 'rgba(168,224,42,0.1)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  soonText: { color: '#a8e02a', fontSize: 9, fontFamily: Fonts.bold },
});
