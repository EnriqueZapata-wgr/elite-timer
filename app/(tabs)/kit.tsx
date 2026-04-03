/**
 * Kit — "¿Qué tengo?" Caja de herramientas del usuario.
 *
 * Secciones: Top bar, Mis Rutinas (scroll horizontal),
 * Herramientas (grid 2 columnas), Banner de evaluación.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';

import { getRoutines } from '@/src/services/routine-service';
import { flattenRoutine, calcRoutineStats } from '@/src/engine';
import type { Routine } from '@/src/engine/types';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';

// ── Herramientas del grid ──
const TOOLS = [
  { name: 'Timer', subtitle: 'INTERVALOS & AMRAP', icon: 'timer-outline' as const, color: '#a8e02a', route: '/timer' },
  { name: 'Nutrición', subtitle: 'MACROS & TRACKING', icon: 'nutrition-outline' as const, color: '#5B9BD5', route: '/nutrition' },
  { name: 'Respiración', subtitle: 'ENFOQUE & CALMA', icon: 'body-outline' as const, color: '#D4537E', route: '/breathing' },
  { name: 'Mi Salud', subtitle: 'EVALUACIONES', icon: 'analytics-outline' as const, color: '#5B9BD5', route: '/my-health' },
  { name: 'Meditación', subtitle: 'MINDFULNESS', icon: 'sparkles-outline' as const, color: '#7F77DD', route: '/meditation' },
  { name: 'Journal', subtitle: 'REFLEXIÓN DIARIA', icon: 'book-outline' as const, color: '#7F77DD', route: '/journal' },
  { name: 'Check-in', subtitle: 'ESTADO EMOCIONAL', icon: 'heart-outline' as const, color: '#7F77DD', route: '/checkin' },
  { name: 'Protocolos', subtitle: 'EXPLORAR & ACTIVAR', icon: 'documents-outline' as const, color: '#1D9E75', route: '/protocol-explorer' },
  { name: 'Ciclo', subtitle: 'SEGUIMIENTO', icon: 'flower-outline' as const, color: '#D4537E', route: '/cycle' },
];

export default function KitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      return calcRoutineStats(steps).formattedTotal;
    } catch { return ''; }
  };

  // Inicial del usuario para el avatar
  const userInitial = (
    user?.user_metadata?.full_name?.[0]
    || user?.email?.[0]
    || 'E'
  ).toUpperCase();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
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
              <AnimatedPressable onPress={() => { haptic.light(); }}>
                <Ionicons name="search-outline" size={22} color={Colors.textSecondary} />
              </AnimatedPressable>
              <View style={s.avatar}>
                <EliteText style={s.avatarText}>{userInitial}</EliteText>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Mis Rutinas ── */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={s.sectionHeader}>
            <EliteText style={s.sectionLabel}>MIS RUTINAS</EliteText>
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/programs'); }}>
              <EliteText style={s.seeAll}>Ver todas ›</EliteText>
            </AnimatedPressable>
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
                    {/* Nivel / tipo */}
                    <EliteText style={s.routineDifficulty}>
                      {isTimer ? 'TIMER' : 'RUTINA'}
                    </EliteText>

                    {/* Nombre */}
                    <EliteText style={s.routineCardName} numberOfLines={2}>
                      {routine.name}
                    </EliteText>

                    {/* Tiempo + meta */}
                    <View style={s.routineBottomRow}>
                      <EliteText style={s.routineCardMeta}>
                        {time}
                      </EliteText>
                      <AnimatedPressable
                        onPress={() => playRoutine(routine)}
                        style={s.routinePlayBtn}
                      >
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

        {/* ── Herramientas grid ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <EliteText style={[s.sectionLabel, { marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
            HERRAMIENTAS
          </EliteText>
          <View style={s.toolsGrid}>
            {TOOLS.map(tool => (
              <AnimatedPressable
                key={tool.name}
                onPress={() => { haptic.light(); router.push(tool.route as any); }}
                style={s.toolCard}
              >
                <View style={[s.toolCardInner, { borderTopColor: tool.color }]}>
                  <Ionicons name={tool.icon as any} size={24} color={tool.color} />
                  <EliteText style={s.toolCardName}>{tool.name}</EliteText>
                  <EliteText style={s.toolCardSub}>{tool.subtitle}</EliteText>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        {/* ── Banner de evaluación ── */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
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
    </View>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: Spacing.md,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
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
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: Colors.neonGreen,
  },

  // Secciones
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    letterSpacing: 3,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
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
  },
  routineCard: {
    width: 260,
  },
  routineCardInner: {
    backgroundColor: '#0d0d0d',
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

  // Tools grid
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  toolCard: {
    width: '47%',
  },
  toolCardInner: {
    backgroundColor: '#0d0d0d',
    borderRadius: Radius.card,
    borderTopWidth: 3,
    borderTopColor: '#a8e02a',
    borderWidth: 0.5,
    borderColor: '#151515',
    padding: Spacing.md,
    height: 100,
    justifyContent: 'center',
    gap: 4,
  },
  toolCardName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: '#fff',
    marginTop: 4,
  },
  toolCardSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
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
