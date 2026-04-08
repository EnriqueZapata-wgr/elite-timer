/**
 * Kit — "¿Qué tengo?" Caja de herramientas organizada por pilares ATP.
 *
 * Secciones: Top bar, Mis Rutinas (scroll horizontal),
 * ATP Fitness, ATP Nutrición, ATP Mente, ATP Salud, ATP Ciclo.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { UserAvatar } from '@/src/components/ui/UserAvatar';

import { getRoutines } from '@/src/services/routine-service';
import { flattenRoutine, calcRoutineStats } from '@/src/engine';
import type { Routine } from '@/src/engine/types';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CARD } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';

// ── Pilares con sus herramientas ──
const PILLARS = [
  {
    title: 'ATP FITNESS',
    color: '#a8e02a',
    tools: [
      { name: 'Fitness', subtitle: 'Centro', icon: 'fitness-outline' as const, route: '/fitness-hub' },
      { name: 'Timer', subtitle: 'Intervalos', icon: 'timer-outline' as const, route: '/timer' },
      { name: 'Cardio', subtitle: 'Registrar', icon: 'walk-outline' as const, route: '/log-cardio' },
      { name: 'Records', subtitle: 'Tus PRs', icon: 'trophy-outline' as const, route: '/personal-records' },
      { name: 'Progreso', subtitle: 'Historial', icon: 'trending-up-outline' as const, route: '/progress' },
    ],
  },
  {
    title: 'ATP NUTRICIÓN',
    color: '#5B9BD5',
    tools: [
      { name: 'Nutrición', subtitle: 'Dashboard', icon: 'nutrition-outline' as const, route: '/nutrition' },
      { name: 'Registrar', subtitle: 'Comida', icon: 'restaurant-outline' as const, route: '/food-text' },
      { name: 'Escanear', subtitle: 'Foto', icon: 'camera-outline' as const, route: '/food-scan' },
    ],
  },
  {
    title: 'ATP MENTE',
    color: '#7F77DD',
    tools: [
      { name: 'Meditación', subtitle: 'Mindfulness', icon: 'sparkles-outline' as const, route: '/meditation' },
      { name: 'Respiración', subtitle: 'Enfoque', icon: 'pulse-outline' as const, route: '/breathing' },
      { name: 'Check-in', subtitle: 'Emocional', icon: 'heart-outline' as const, route: '/checkin' },
      { name: 'Journal', subtitle: 'Reflexión', icon: 'book-outline' as const, route: '/journal' },
    ],
  },
  {
    title: 'ATP SALUD',
    color: '#1D9E75',
    tools: [
      { name: 'Mi Salud', subtitle: 'Evaluación', icon: 'analytics-outline' as const, route: '/my-health' },
      { name: 'Protocolos', subtitle: 'Explorar', icon: 'documents-outline' as const, route: '/protocol-explorer' },
      { name: 'Quizzes', subtitle: 'Evalúate', icon: 'clipboard-outline' as const, route: '/quizzes' },
    ],
  },
  {
    title: 'ATP CICLO',
    color: '#D4537E',
    tools: [
      { name: 'Ciclo', subtitle: 'Tracking', icon: 'flower-outline' as const, route: '/cycle' },
    ],
  },
];

export default function KitScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);

  // Carga rutinas del usuario al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      getRoutines().then(setRoutines).catch(() => {});
    }, [])
  );

  /** Ejecutar rutina — navega a la pantalla correspondiente */
  const playRoutine = (routine: Routine) => {
    haptic.light();
    const target = routine.mode === 'routine' ? '/routine-execution' : '/execution';
    router.push({ pathname: target as any, params: { routine: JSON.stringify(routine) } });
  };

  /** Duración formateada de una rutina */
  const getRoutineTime = (routine: Routine): string => {
    try {
      const steps = flattenRoutine(routine);
      return calcRoutineStats(steps)?.formattedTotal ?? '';
    } catch { return ''; }
  };

  const userName = user?.user_metadata?.full_name || user?.email || 'A';

  return (
    <TabScreen>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Top bar ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={s.topBar}>
            <View>
              <EliteText style={s.title}>KIT</EliteText>
              <EliteText style={s.subtitle}>TU CAJA DE HERRAMIENTAS</EliteText>
            </View>
            <View style={s.topBarRight}>
              <UserAvatar uri={user?.user_metadata?.avatar_url} name={userName} />
            </View>
          </View>
        </Animated.View>

        {/* ── Mis Rutinas ── */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={s.sectionHeader}>
            <SectionTitle
              rightAction={
                <AnimatedPressable onPress={() => { haptic.light(); router.push('/programs'); }}>
                  <EliteText style={s.seeAll}>Ver todas ›</EliteText>
                </AnimatedPressable>
              }
            >
              MIS RUTINAS
            </SectionTitle>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.routinesScroll}
          >
            {routines.slice(0, 5).map(routine => {
              const isTimer = routine.mode === 'timer';
              const time = getRoutineTime(routine);

              return (
                <View key={routine.id} style={s.routineCard}>
                  <View style={s.routineCardInner}>
                    <EliteText style={s.routineDifficulty}>
                      {isTimer ? 'TIMER' : 'RUTINA'}
                    </EliteText>
                    <EliteText style={s.routineCardName} numberOfLines={2}>
                      {routine.name}
                    </EliteText>
                    <View style={s.routineBottomRow}>
                      <EliteText style={s.routineCardMeta}>{time}</EliteText>
                      <AnimatedPressable onPress={() => playRoutine(routine)} style={s.routinePlayBtn}>
                        <Ionicons name="play" size={16} color="#000" />
                      </AnimatedPressable>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Card "Crear nueva" */}
            <AnimatedPressable
              onPress={() => { haptic.light(); router.push('/builder'); }}
              style={s.routineCard}
            >
              <View style={s.createCard}>
                <Ionicons name="add-circle-outline" size={32} color={Colors.neonGreen} />
                <EliteText style={s.createCardText}>Crear{'\n'}rutina</EliteText>
              </View>
            </AnimatedPressable>
          </ScrollView>
        </Animated.View>

        {/* ── Pilares con herramientas ── */}
        {PILLARS.map((pillar, pIdx) => (
          <Animated.View key={pillar.title} entering={FadeInUp.delay(150 + pIdx * 60).springify()}>
            <View style={s.pillarSection}>
              <View style={s.pillarHeader}>
                <View style={[s.pillarDot, { backgroundColor: pillar.color }]} />
                <EliteText style={s.pillarTitle}>{pillar.title}</EliteText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillarScroll}>
                {pillar.tools.map(tool => (
                  <AnimatedPressable
                    key={tool.name}
                    style={[s.toolCardH, { borderTopColor: pillar.color }]}
                    onPress={() => { haptic.light(); router.push(tool.route as any); }}
                  >
                    <Ionicons name={tool.icon as any} size={22} color={pillar.color} />
                    <EliteText style={s.toolCardName}>{tool.name}</EliteText>
                    <EliteText style={s.toolCardSub}>{tool.subtitle.toUpperCase()}</EliteText>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        ))}

        {/* ── Banner de evaluación ── */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push('/quizzes' as any); }}
            style={s.evalBanner}
          >
            <Ionicons name="clipboard-outline" size={24} color={Colors.neonGreen} />
            <View style={{ flex: 1 }}>
              <EliteText style={s.evalTitle}>TEST DE EVALUACIÓN</EliteText>
              <EliteText style={s.evalSub}>Completa tu perfil de rendimiento</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.neonGreen} />
          </AnimatedPressable>
        </Animated.View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </TabScreen>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontSize: FontSizes.display,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 3,
    marginTop: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },

  // Secciones
  sectionHeader: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  seeAll: {
    color: Colors.neonGreen,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },

  // Rutinas scroll
  routinesScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  routineCard: {
    width: 260,
  },
  routineCardInner: {
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    borderLeftWidth: 3,
    borderLeftColor: '#a8e02a',
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    padding: Spacing.md,
    height: 120,
    justifyContent: 'space-between',
  },
  routineDifficulty: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: Colors.neonGreen,
    letterSpacing: 2,
  },
  routineCardName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: '#fff',
  },
  routineBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineCardMeta: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  routinePlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#a8e02a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCard: {
    backgroundColor: 'transparent',
    borderRadius: Radius.card,
    borderWidth: 1.5,
    borderColor: 'rgba(168,224,42,0.25)',
    borderStyle: 'dashed',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  createCardText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },

  // Pilares
  pillarSection: {
    marginTop: Spacing.lg,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pillarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillarTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: 2,
  },
  pillarScroll: {
    paddingHorizontal: Spacing.md,
    gap: 10,
  },

  // Tool card horizontal
  toolCardH: {
    width: 120,
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderTopWidth: 3,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    gap: 6,
  },
  toolCardName: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#fff',
    marginTop: 2,
  },
  toolCardSub: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: '#555',
    letterSpacing: 1,
  },

  // Eval banner
  evalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#0d1a0a',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: 'rgba(168,224,42,0.15)',
    padding: Spacing.md,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.md,
  },
  evalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.neonGreen,
    letterSpacing: 1,
  },
  evalSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
