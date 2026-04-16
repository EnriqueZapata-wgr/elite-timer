/**
 * Fitness Hub — Centro de fitness simplificado.
 *
 * Muestra resumen semanal + 4 cards de navegacion a las sub-pantallas:
 *   - Fuerza:    /fitness-strength
 *   - Cardio:    /fitness-cardio
 *   - Movilidad: /fitness-mobility
 *   - HIIT/Timer:/fitness-hiit
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS } from '@/src/constants/brand';
import {
  getBenchmarksWithVariants,
  getCardioRecordsByDiscipline,
  getLastMobilityAssessment,
} from '@/src/services/fitness-service';
import { getWeeklyStats } from '@/src/services/exercise-service';

interface AreaCard {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: { start: string; end: string };
  route: string;
}

const FITNESS_AREAS: AreaCard[] = [
  {
    id: 'strength',
    title: 'Fuerza',
    icon: 'barbell-outline',
    color: '#a8e02a',
    gradient: PILLAR_GRADIENTS.fitness,
    route: '/fitness-strength',
  },
  {
    id: 'cardio',
    title: 'Cardio',
    icon: 'heart-outline',
    color: '#38bdf8',
    gradient: { start: 'rgba(56,189,248,0.12)', end: 'rgba(56,189,248,0.02)' },
    route: '/fitness-cardio',
  },
  {
    id: 'mobility',
    title: 'Movilidad',
    icon: 'body-outline',
    color: '#c084fc',
    gradient: { start: 'rgba(192,132,252,0.12)', end: 'rgba(192,132,252,0.02)' },
    route: '/fitness-mobility',
  },
  {
    id: 'hiit',
    title: 'HIIT / Timer',
    icon: 'flash-outline',
    color: '#fb923c',
    gradient: { start: 'rgba(251,146,60,0.12)', end: 'rgba(251,146,60,0.02)' },
    route: '/fitness-hiit',
  },
];

export default function FitnessHubScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ workouts: 0, volumeKg: 0, prs: 0 });
  const [benchmarkCount, setBenchmarkCount] = useState(0);
  const [variantCount, setVariantCount] = useState(0);
  const [cardioCount, setCardioCount] = useState(0);
  const [mobilityScore, setMobilityScore] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    getWeeklyStats().then(s => setStats({ workouts: s.workouts, volumeKg: s.volumeKg, prs: s.prs }));

    getBenchmarksWithVariants().then(benchmarks => {
      setBenchmarkCount(benchmarks.length);
      setVariantCount(benchmarks.reduce((sum, b) => sum + b.variants.length, 0));
    });

    getCardioRecordsByDiscipline().then(recs => {
      const total = Object.values(recs).reduce((sum, list) => sum + list.length, 0);
      setCardioCount(total);
    });

    getLastMobilityAssessment().then(m => setMobilityScore(m?.overall_score ?? null));
  }, []));

  const subtitleByArea: Record<string, string> = {
    strength: benchmarkCount > 0 ? `${benchmarkCount} benchmarks · ${variantCount} variantes` : 'Levantamientos pesados',
    cardio: cardioCount > 0 ? `${cardioCount} PRs · 4 disciplinas` : 'Correr · Ciclismo · Natación · Remo',
    mobility: mobilityScore != null ? `Score: ${mobilityScore.toFixed(1)}/10` : 'Tests de movilidad',
    hiit: 'Tabata · EMOM · AMRAP · Custom',
  };

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Fitness" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Hero — Resumen semanal */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <GradientCard gradient={PILLAR_GRADIENTS.fitness} padding={20}>
            <EliteText style={s.heroTitle}>RESUMEN SEMANAL</EliteText>
            <View style={s.heroStatsRow}>
              <View style={s.heroStat}>
                <EliteText style={s.heroStatValue}>{stats.workouts}</EliteText>
                <EliteText style={s.heroStatLabel}>SESIONES</EliteText>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <EliteText style={s.heroStatValue}>
                  {stats.volumeKg > 0 ? `${(stats.volumeKg / 1000).toFixed(1)}t` : '0'}
                </EliteText>
                <EliteText style={s.heroStatLabel}>VOLUMEN</EliteText>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <EliteText style={s.heroStatValue}>{stats.prs}</EliteText>
                <EliteText style={s.heroStatLabel}>PRs</EliteText>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <EliteText style={s.heroStatValue}>{cardioCount}</EliteText>
                <EliteText style={s.heroStatLabel}>CARDIO</EliteText>
              </View>
            </View>
          </GradientCard>
        </Animated.View>

        {/* Botón registrar sesión */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={{ marginTop: Spacing.md }}>
          <AnimatedPressable onPress={() => {
            haptic.medium();
            Alert.alert('Registrar sesión', '¿Qué tipo de sesión?', [
              { text: 'Fuerza', onPress: () => router.push('/log-exercise') },
              { text: 'Cardio', onPress: () => router.push('/log-cardio' as any) },
              { text: 'Timer/HIIT', onPress: () => router.push('/timer') },
              { text: 'Cancelar', style: 'cancel' },
            ]);
          }}>
            <View style={s.registerBtn}>
              <Ionicons name="add-circle" size={22} color="#000" />
              <EliteText style={s.registerBtnText}>REGISTRAR SESIÓN</EliteText>
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* ARGOS rutina inteligente */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={{ marginTop: Spacing.lg }}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/argos-routine'); }}>
            <View style={{
              backgroundColor: 'rgba(168,224,42,0.06)', borderRadius: 16, padding: 18, marginBottom: 4,
              borderWidth: 1, borderColor: 'rgba(168,224,42,0.12)',
              flexDirection: 'row', alignItems: 'center', gap: 14,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(168,224,42,0.12)', justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name="eye-outline" size={22} color="#a8e02a" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={{ color: '#a8e02a', fontSize: 14, fontWeight: '700' }}>ARGOS genera tu rutina</EliteText>
                <EliteText style={{ color: '#999', fontSize: 12 }}>IA que conoce tu nivel, PRs y objetivos</EliteText>
              </View>
              <Ionicons name="sparkles-outline" size={18} color="#a8e02a" />
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* 4 cards de navegación */}
        <View style={{ marginTop: Spacing.lg }}>
          <SectionTitle>EXPLORAR</SectionTitle>

          {FITNESS_AREAS.map((area, idx) => (
            <Animated.View key={area.id} entering={FadeInUp.delay(120 + idx * 50).springify()}>
              <AnimatedPressable
                onPress={() => { haptic.light(); router.push(area.route as any); }}
                style={s.areaCardWrap}
              >
                <GradientCard
                  gradient={area.gradient}
                  accentColor={area.color}
                  accentPosition="left"
                  padding={18}
                >
                  <View style={s.areaRow}>
                    <Ionicons name={area.icon} size={28} color={area.color} style={s.areaIcon} />
                    <View style={{ flex: 1 }}>
                      <EliteText style={s.areaTitle}>{area.title}</EliteText>
                      <EliteText style={s.areaSub}>{subtitleByArea[area.id]}</EliteText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </View>
                </GradientCard>
              </AnimatedPressable>
            </Animated.View>
          ))}
        </View>

        {/* Herramientas */}
        <View style={{ marginTop: Spacing.md }}>
          <SectionTitle>HERRAMIENTAS</SectionTitle>

          <AnimatedPressable onPress={() => { haptic.light(); router.push('/personal-records'); }} style={s.areaCardWrap}>
            <GradientCard gradient={{ start: 'rgba(251,191,36,0.08)', end: 'rgba(251,191,36,0.03)' }} accentColor="#fbbf24" accentPosition="left" padding={18}>
              <View style={s.areaRow}>
                <Ionicons name="trophy-outline" size={24} color="#fbbf24" style={s.areaIcon} />
                <View style={{ flex: 1 }}>
                  <EliteText style={s.areaTitle}>Récords personales</EliteText>
                  <EliteText style={s.areaSub}>Tus mejores marcas</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </GradientCard>
          </AnimatedPressable>

          <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-routines' as any); }} style={s.areaCardWrap}>
            <GradientCard gradient={{ start: 'rgba(168,224,42,0.08)', end: 'rgba(168,224,42,0.03)' }} accentColor="#a8e02a" accentPosition="left" padding={18}>
              <View style={s.areaRow}>
                <Ionicons name="list-outline" size={24} color="#a8e02a" style={s.areaIcon} />
                <View style={{ flex: 1 }}>
                  <EliteText style={s.areaTitle}>Mis rutinas</EliteText>
                  <EliteText style={s.areaSub}>Rutinas y timers guardados</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </GradientCard>
          </AnimatedPressable>

          <AnimatedPressable onPress={() => { haptic.light(); router.push('/builder' as any); }} style={s.areaCardWrap}>
            <GradientCard gradient={{ start: 'rgba(96,165,250,0.08)', end: 'rgba(96,165,250,0.03)' }} accentColor="#60a5fa" accentPosition="left" padding={18}>
              <View style={s.areaRow}>
                <Ionicons name="construct-outline" size={24} color="#60a5fa" style={s.areaIcon} />
                <View style={{ flex: 1 }}>
                  <EliteText style={s.areaTitle}>Constructor</EliteText>
                  <EliteText style={s.areaSub}>Crear rutina o timer nuevo</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </GradientCard>
          </AnimatedPressable>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },

  // Hero
  heroTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginTop: 4,
  },
  heroDivider: {
    width: 0.5,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Register button
  registerBtn: {
    backgroundColor: '#a8e02a',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerBtnText: {
    color: '#000',
    fontSize: 16,
    fontFamily: Fonts.extraBold,
  },

  // Areas
  areaCardWrap: {
    marginBottom: Spacing.sm,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  areaIcon: {
    marginRight: 4,
  },
  areaTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  areaSub: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#888',
    marginTop: 2,
  },
});
