/**
 * Fitness Hub — 3 botones grandes: Mi Fitness, Entrenar, Explorar.
 * Resumen semanal compacto arriba.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import { Screen } from '@/src/components/ui/Screen';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { haptic } from '@/src/utils/haptics';
import { pickFitnessImage } from '@/src/utils/yo-image-picker';
import { Spacing, Fonts } from '@/constants/theme';
import { SEMANTIC } from '@/src/constants/brand';
import { supabase } from '@/src/lib/supabase';

// MB-3 3C: molde editorial (audit P2-2 — filas planas + vacío negro abajo).
// Imágenes B/N ya existentes de agenda/entrenar + cardio; gradient por sección.
const SECTIONS = [
  {
    name: 'MI FITNESS',
    emoji: '🏆',
    subtitle: 'Fuerza · cardio · movilidad · récords',
    gradient: ['#fbbf24', '#8B4513'] as [string, string],
    image: require('@/assets/images/agenda/entrenar/entrenar-01.png'),
    route: '/fitness-my' as const,
  },
  {
    name: 'ENTRENAR',
    emoji: '⚡',
    subtitle: 'Rutinas · builder · timers · registro',
    gradient: ['#a8e02a', '#1D9E75'] as [string, string],
    image: require('@/assets/images/agenda/entrenar/entrenar-02.png'),
    route: '/fitness-train' as const,
  },
  {
    name: 'EXPLORAR',
    emoji: '🧭',
    subtitle: 'Biblioteca · métodos ATP · planes',
    gradient: ['#60a5fa', '#312E81'] as [string, string],
    image: require('@/assets/images/agenda/cardio/cardio-02.png'),
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
        'MI FITNESS': `${prs?.length || 0} récords personales registrados`,
        'ENTRENAR': `${routines?.length || 0} rutinas creadas`,
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

        {/* MB-3 3C: 3 destinos con el molde editorial (imagen B/N + gradient),
            mismo lenguaje que health-hub/HOY — mata las filas planas y el
            vacío negro (cada card pillar llena pantalla). El dato dinámico
            (PRs / rutinas creadas) va en message: dato antes que link. */}
        <View style={s.sections}>
          {SECTIONS.map((section, idx) => (
            <Animated.View key={section.name} entering={FadeInUp.delay(100 + idx * 60).springify()}>
              <EditorialCard
                cardKey={`fit_${section.route}`}
                icon={section.emoji}
                title={section.name}
                subtitle={section.subtitle}
                message={dynamicSubs[section.name]}
                gradient={section.gradient}
                imageBn={section.image}
                size="pillar"
                onTap={() => { haptic.medium(); router.push(section.route); }}
              />
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

  // Sections (MB-3 3C: cards = EditorialCard; solo queda el contenedor)
  sections: { marginTop: Spacing.lg },
});
