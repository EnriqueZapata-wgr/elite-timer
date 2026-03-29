/**
 * Kit — "¿Qué tengo?" Biblioteca de herramientas del usuario.
 *
 * Secciones: Mis Rutinas (scroll horizontal), Ejercicios,
 * Protocolos (placeholder), Herramientas (grid 2x2).
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { EmptyState } from '@/src/components/ui/EmptyState';

import { getRoutines } from '@/src/services/routine-service';
import { flattenRoutine, calcRoutineStats } from '@/src/engine';
import type { Routine } from '@/src/engine/types';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';

const AMBER = CATEGORY_COLORS.optimization;

export default function KitScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRoutines().then(setRoutines).catch(() => {});
    }, [])
  );

  const playRoutine = (routine: Routine) => {
    haptic.light(); // feedback háptico al ejecutar rutina
    const target = routine.mode === 'routine' ? '/routine-execution' : '/execution';
    router.push({ pathname: target as any, params: { routine: JSON.stringify(routine) } });
  };

  const getRoutineTime = (routine: Routine): string => {
    try {
      const steps = flattenRoutine(routine);
      return calcRoutineStats(steps).formattedTotal;
    } catch { return ''; }
  };

  return (
    <ScreenContainer centered={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={styles.header}>
            <EliteText style={styles.title}>KIT</EliteText>
          </View>
        </Animated.View>

        {/* ── Mis Rutinas ── */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={styles.sectionHeader}>
            <EliteText variant="caption" style={styles.sectionLabel}>MIS RUTINAS</EliteText>
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/programs'); }}>
              <EliteText variant="caption" style={styles.seeAll}>Ver todas ›</EliteText>
            </AnimatedPressable>
          </View>

          {routines.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routinesScroll}
            >
              {routines.slice(0, 5).map(routine => {
                const isTimer = routine.mode === 'timer';
                const accentColor = isTimer ? Colors.neonGreen : CATEGORY_COLORS.mind;
                const time = getRoutineTime(routine);

                return (
                  <AnimatedPressable
                    key={routine.id}
                    onPress={() => playRoutine(routine)}
                    style={styles.routineCard}
                  >
                    <LinearGradient
                      colors={isTimer ? ['#1a2a1a', '#0a1a0a'] as const : ['#1a1a2a', '#0a0a1a'] as const}
                      style={styles.routineCardInner}
                    >
                      <EliteText variant="body" style={styles.routineCardName} numberOfLines={2}>
                        {routine.name}
                      </EliteText>
                      <EliteText variant="caption" style={styles.routineCardMeta}>
                        {time} · {isTimer ? 'Timer' : 'Rutina'}
                      </EliteText>
                      <View style={[styles.routinePlayBtn, { backgroundColor: accentColor }]}>
                        <Ionicons name="play" size={14} color={Colors.black} />
                      </View>
                    </LinearGradient>
                  </AnimatedPressable>
                );
              })}

              {/* Card "Crear nueva" */}
              <AnimatedPressable
                onPress={() => { haptic.light(); router.push('/builder'); }}
                style={styles.routineCard}
              >
                <View style={styles.createCard}>
                  <Ionicons name="add-circle-outline" size={28} color={Colors.neonGreen} />
                  <EliteText variant="caption" style={styles.createCardText}>Crear rutina</EliteText>
                </View>
              </AnimatedPressable>
            </ScrollView>
          ) : (
            <EmptyState
              icon="barbell-outline"
              title="Sin rutinas asignadas"
              subtitle="Tu coach te asignará rutinas pronto"
              color="#a8e02a"
            />
          )}
        </Animated.View>

        {/* ── Ejercicios ── */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <AnimatedPressable onPress={() => { haptic.light(); router.push('/log-exercise'); }}>
            <View style={styles.linkCard}>
              <View style={[styles.linkCardAccent, { backgroundColor: Colors.neonGreen }]} />
              <Ionicons name="barbell-outline" size={22} color={Colors.neonGreen} />
              <View style={styles.linkCardInfo}>
                <EliteText variant="body" style={styles.linkCardTitle}>Ejercicios</EliteText>
                <EliteText variant="caption" style={styles.linkCardSub}>Registrar sets y ver historial</EliteText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* ── Protocolos (placeholder) ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={[styles.linkCard, { opacity: 0.5 }]}>
            <View style={[styles.linkCardAccent, { backgroundColor: CATEGORY_COLORS.metrics }]} />
            <Ionicons name="document-text-outline" size={22} color={CATEGORY_COLORS.metrics} />
            <View style={styles.linkCardInfo}>
              <EliteText variant="body" style={styles.linkCardTitle}>Protocolos</EliteText>
              <EliteText variant="caption" style={styles.linkCardSub}>Próximamente: protocolos de tu coach</EliteText>
            </View>
          </View>
        </Animated.View>

        {/* ── Herramientas (grid 2x2) ── */}
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <EliteText variant="caption" style={[styles.sectionLabel, { marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
            HERRAMIENTAS
          </EliteText>
          <View style={styles.toolsGrid}>
            {[
              { icon: 'timer-outline', label: 'Timer', color: Colors.neonGreen, active: true, route: '/timer' },
              { icon: 'restaurant-outline', label: 'Nutrición', color: CATEGORY_COLORS.nutrition, active: true, route: '/nutrition' },
              { icon: 'leaf-outline', label: 'Respiración', color: CATEGORY_COLORS.mind, active: true, route: '/breathing' },
              { icon: 'sparkles-outline', label: 'Meditación', color: CATEGORY_COLORS.mind, active: true, route: '/meditation' },
              { icon: 'heart-circle-outline', label: 'Check-in', color: CATEGORY_COLORS.mind, active: true, route: '/checkin' },
              { icon: 'flask-outline', label: 'Mi Salud', color: CATEGORY_COLORS.metrics, active: true, route: '/my-health' },
              { icon: 'journal-outline', label: 'Journaling', color: CATEGORY_COLORS.optimization, active: false, route: '' },
            ].map((tool, idx) => (
              <StaggerItem key={tool.label} index={idx} style={styles.toolCard}>
                <ToolCard
                  icon={tool.icon}
                  label={tool.label}
                  color={tool.color}
                  active={tool.active}
                  onPress={() => tool.active ? router.push(tool.route as any) : Alert.alert(tool.label, 'Próximamente')}
                />
              </StaggerItem>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === TOOL CARD ===

function ToolCard({ icon, label, color, active, onPress }: {
  icon: string; label: string; color: string; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={() => { haptic.light(); onPress(); }}>
      <LinearGradient
        colors={[color + '25', color + '0A', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.toolCardGradient, { borderColor: color + '28' }, !active && { opacity: 0.5 }]}
      >
        <Ionicons name={icon as any} size={26} color={color} />
        <EliteText variant="body" style={[styles.toolCardLabel, { color }]}>{label}</EliteText>
        {!active && (
          <EliteText variant="caption" style={styles.toolCardSoon}>Pronto</EliteText>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.extraBold,
    color: AMBER,
    letterSpacing: 4,
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
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  seeAll: {
    color: Colors.neonGreen,
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // Rutinas scroll
  routinesScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  routineCard: { width: 180 },
  routineCardInner: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    height: 110,
    justifyContent: 'space-between',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  routineCardName: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  routineCardMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  routinePlayBtn: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neonGreen + '30',
    borderStyle: 'dashed',
  },
  createCardText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },
  // Link cards
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 3,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  linkCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.card,
    borderBottomLeftRadius: Radius.card,
  },
  linkCardInfo: { flex: 1 },
  linkCardTitle: { fontFamily: Fonts.semiBold, fontSize: 15 },
  linkCardSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Tools grid
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    width: '48%',
    flexGrow: 1,
  },
  toolCardGradient: {
    height: 90,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  toolCardLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  toolCardSoon: {
    color: Colors.textMuted,
    fontSize: 10,
  },
});
