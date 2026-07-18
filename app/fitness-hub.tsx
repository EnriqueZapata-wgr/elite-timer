/**
 * Fitness Hub — 3 botones grandes: Mi Fitness, Entrenar, Explorar.
 * Resumen semanal compacto arriba.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { pickFitnessImage } from '@/src/utils/yo-image-picker';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { supabase } from '@/src/lib/supabase';

const SECTIONS = [
  {
    name: 'Mi Fitness',
    subtitle: 'Tu estado actual de fuerza, cardio y movilidad. Benchmarks, récords personales y progreso.',
    icon: 'trophy-outline' as const,
    color: '#fbbf24',
    route: '/fitness-my' as const,
  },
  {
    name: 'Entrenar',
    subtitle: 'ARGOS genera tu rutina, crea la tuya con el builder, timers HIIT, o registra ejercicios sueltos.',
    icon: 'flash-outline' as const,
    color: '#a8e02a',
    route: '/fitness-train' as const,
  },
  {
    name: 'Explorar',
    subtitle: 'Biblioteca de ejercicios, planes de entrenamiento, métodos ATP y rutinas Follow Me.',
    icon: 'compass-outline' as const,
    color: '#60a5fa',
    route: '/fitness-explore' as const,
  },
];

export default function FitnessHubScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ sessions: 0, volume: 0, prs: 0 });
  const [dynamicSubs, setDynamicSubs] = useState<Record<string, string>>({});
  // Batch 3 (#22): hero editorial sex-aware (fitness-el/ella).
  const [bioSex, setBioSex] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    loadWeekStats();
    loadDynamicSubtitles();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setBioSex((data as any)?.biological_sex ?? null), () => {});
    });
  }, []));

  async function loadWeekStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // HOTFIX schema: exercise_logs no tiene columna `date` — es `logged_at`
      // (mismo bug de clase que personal_records abajo: 400 silencioso → stats en 0).
      const { data: logs } = await supabase
        .from('exercise_logs')
        .select('logged_at, weight_kg, reps')
        .eq('user_id', user.id)
        .gte('logged_at', weekAgo);

      const uniqueDays = new Set((logs || []).map(l => String(l.logged_at ?? '').slice(0, 10))).size;
      const totalVolume = (logs || []).reduce((sum, l) => sum + ((l.weight_kg || 0) * (l.reps || 0)), 0);

      // HOTFIX schema (verificado por SQL): personal_records no tiene `date` —
      // la columna real es `achieved_at`. El date=gte daba 400 silencioso.
      const { data: prs } = await supabase
        .from('personal_records')
        .select('id')
        .eq('user_id', user.id)
        .gte('achieved_at', weekAgo);

      setStats({ sessions: uniqueDays, volume: Math.round(totalVolume), prs: prs?.length || 0 });
    } catch { /* opcional */ }
  }

  async function loadDynamicSubtitles() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prs } = await supabase.from('personal_records').select('id').eq('user_id', user.id);
      // HOTFIX schema: routines usa `creator_id` (no `user_id`) — ver
      // routine-service/coach-panel-service. El filtro user_id=eq daba 400
      // silencioso → "0 rutinas creadas" siempre.
      const { data: routines } = await supabase.from('routines').select('id').eq('creator_id', user.id);

      setDynamicSubs({
        'Mi Fitness': `${prs?.length || 0} récords personales registrados`,
        'Entrenar': `${routines?.length || 0} rutinas creadas`,
      });
    } catch { /* opcional */ }
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Fitness" />
      <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
        <CommunityPresence pillar="fitness" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Resumen semanal — Batch 3 (#22): hero editorial (imagen + overlay), no card plana */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <ImageBackground source={pickFitnessImage(bioSex)} style={s.heroCard} imageStyle={s.heroImg}>
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.95)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.heroInner}>
              <EliteText style={s.statsLabel}>ESTA SEMANA</EliteText>
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
            </View>
          </ImageBackground>
        </Animated.View>

        {/* 3 botones grandes */}
        <View style={s.sections}>
          {SECTIONS.map((section, idx) => (
            <Animated.View key={section.name} entering={FadeInUp.delay(100 + idx * 60).springify()}>
              <AnimatedPressable onPress={() => { haptic.medium(); router.push(section.route); }}>
                <View style={[s.sectionCard, { borderColor: withOpacity(section.color, 0.08) }]}>
                  <View style={s.sectionHeader}>
                    <View style={[s.sectionIcon, { backgroundColor: withOpacity(section.color, 0.12) }]}>
                      <Ionicons name={section.icon} size={24} color={section.color} />
                    </View>
                    <EliteText style={s.sectionName}>{section.name}</EliteText>
                    <Ionicons name="chevron-forward" size={20} color={TEXT_COLORS.muted} />
                  </View>
                  <EliteText style={s.sectionSub}>{section.subtitle}</EliteText>
                  {dynamicSubs[section.name] && (
                    <EliteText style={s.sectionDynamic}>{dynamicSubs[section.name]}</EliteText>
                  )}
                </View>
              </AnimatedPressable>
            </Animated.View>
          ))}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Hero editorial (Batch 3 #22)
  heroCard: { borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', minHeight: 150 },
  heroImg: { resizeMode: 'cover' },
  heroInner: { padding: 20 },

  // Stats
  statsLabel: {
    fontSize: 9, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, marginBottom: Spacing.md,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontFamily: Fonts.extraBold, color: '#a8e02a' },
  statLabel: { fontSize: 10, fontFamily: Fonts.semiBold, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Sections
  sections: { marginTop: Spacing.lg, gap: 12 },
  sectionCard: {
    backgroundColor: '#0a0a0a', borderRadius: 20, padding: 24,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10,
  },
  sectionIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionName: {
    color: '#fff', fontSize: 20, fontFamily: Fonts.extraBold, flex: 1,
  },
  sectionSub: {
    color: '#999', fontSize: 13, lineHeight: 20,
  },
  sectionDynamic: {
    color: '#a8e02a', fontSize: 11, fontFamily: Fonts.semiBold, marginTop: 6,
  },
});
