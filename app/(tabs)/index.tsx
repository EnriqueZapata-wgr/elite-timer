import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { Colors, Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { getRoutines } from '@/src/services/routine-service';
import { getWeeklyStats, type WeeklyStats } from '@/src/services/exercise-service';
import { flattenRoutine, calcRoutineStats } from '@/src/engine';
import { formatTime } from '@/src/engine/helpers';
import type { Routine } from '@/src/engine/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUTINE_CARD_WIDTH = 200;

/**
 * Dashboard — Panel principal premium con hero card semanal,
 * botón ENTRENAR con gradiente, rutinas recientes en scroll horizontal,
 * grid de acceso rápido y actividad reciente.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [weekStats, setWeekStats] = useState<WeeklyStats>({
    workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0,
  });

  // Recargar datos al volver a la pantalla
  useFocusEffect(
    useCallback(() => {
      getRoutines().then(setRoutines).catch(() => {});
      getWeeklyStats().then(setWeekStats).catch(() => {});
    }, [])
  );

  // Formatear duración total de la semana como H:MM:SS
  const formatDuration = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <ScreenContainer centered={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <EliteText variant="title" style={styles.brand}>ELITE</EliteText>
          <AnimatedPressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          </AnimatedPressable>
        </View>

        {/* ── Hero Card — TU SEMANA ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <LinearGradient
            colors={['#1a2a1a', '#0a1a0a']}
            style={styles.heroCard}
          >
            {/* Borde izquierdo verde */}
            <View style={styles.heroAccent} />

            {/* Watermark decorativo */}
            <EliteText style={styles.heroWatermark}>⚡</EliteText>

            <EliteText variant="caption" style={styles.heroLabel}>TU SEMANA</EliteText>

            <View style={styles.heroMain}>
              <EliteText style={styles.heroNumber}>{weekStats.workouts}</EliteText>
              <EliteText style={styles.heroUnit}>ENTRENOS</EliteText>
            </View>

            <View style={styles.heroStatsRow}>
              <EliteText variant="caption" style={styles.heroStat}>
                {formatDuration(weekStats.totalSeconds)} tiempo
              </EliteText>
              <EliteText variant="caption" style={styles.heroDot}>·</EliteText>
              <EliteText variant="caption" style={styles.heroStat}>
                {weekStats.volumeKg.toLocaleString()}kg volumen
              </EliteText>
              <EliteText variant="caption" style={styles.heroDot}>·</EliteText>
              <EliteText variant="caption" style={styles.heroStat}>
                {weekStats.prs} PRs
              </EliteText>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Botón ENTRENAR ── */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <AnimatedPressable onPress={() => router.push('/programs')} scaleDown={0.98}>
            <LinearGradient
              colors={['#c5f540', '#7ab800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.trainButton}
            >
              <Ionicons name="flash" size={24} color={Colors.textOnGreen} />
              <EliteText style={styles.trainText}>ENTRENAR</EliteText>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={24} color={Colors.textOnGreen} />
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

        {/* ── Sección RUTINAS ── */}
        {routines.length > 0 && (
          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <View style={styles.sectionHeader}>
              <EliteText variant="caption" style={styles.sectionLabel}>RUTINAS</EliteText>
              <AnimatedPressable onPress={() => router.push('/programs')}>
                <EliteText variant="caption" style={styles.sectionLink}>Ver todas ›</EliteText>
              </AnimatedPressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routinesScrollContent}
            >
              {routines.slice(0, 3).map((routine) => {
                const isTimer = routine.mode === 'timer';
                const gradColors: readonly [string, string] = isTimer
                  ? ['#1a2a1a', '#0a1a0a']
                  : ['#1a1a2a', '#0a0a1a'];
                const accentColor = isTimer ? Colors.neonGreen : '#7F77DD';

                let statsLabel = '';
                try {
                  const steps = flattenRoutine(routine);
                  const stats = calcRoutineStats(steps);
                  statsLabel = stats.formattedTotal;
                } catch { /* sin stats */ }

                return (
                  <AnimatedPressable
                    key={routine.id}
                    onPress={() => {
                      const target = routine.mode === 'routine'
                        ? '/routine-execution'
                        : '/execution';
                      router.push({
                        pathname: target as any,
                        params: { routine: JSON.stringify(routine) },
                      });
                    }}
                    style={styles.routineCard}
                  >
                    <LinearGradient colors={gradColors} style={styles.routineCardInner}>
                      <EliteText variant="body" style={styles.routineCardName} numberOfLines={2}>
                        {routine.name}
                      </EliteText>
                      <EliteText variant="caption" style={styles.routineCardMeta}>
                        {statsLabel} · {isTimer ? 'Timer' : 'Rutina'}
                      </EliteText>
                      <View style={[styles.routinePlayBtn, { backgroundColor: accentColor }]}>
                        <Ionicons name="play" size={14} color={Colors.black} />
                      </View>
                    </LinearGradient>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── ACCESO RÁPIDO — Grid 2×2 ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <EliteText variant="caption" style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>
            ACCESO RÁPIDO
          </EliteText>

          <View style={styles.quickGrid}>
            {/* Registrar */}
            <AnimatedPressable
              onPress={() => router.push('/log-exercise')}
              style={styles.quickCard}
            >
              <LinearGradient colors={['#2a1f0a', '#1a1a1a']} style={styles.quickCardInner}>
                <Ionicons name="barbell-outline" size={28} color="#EF9F27" />
                <EliteText variant="body" style={styles.quickCardTitle}>Registrar</EliteText>
              </LinearGradient>
            </AnimatedPressable>

            {/* Mis Marcas */}
            <AnimatedPressable
              onPress={() => router.push('/personal-records')}
              style={styles.quickCard}
            >
              <LinearGradient colors={['#1a1a2a', '#1a1a1a']} style={styles.quickCardInner}>
                <Ionicons name="trophy-outline" size={28} color="#7F77DD" />
                <EliteText variant="body" style={styles.quickCardTitle}>Mis marcas</EliteText>
              </LinearGradient>
            </AnimatedPressable>

            {/* Estándar */}
            <AnimatedPressable
              onPress={() => router.push('/standard-programs')}
              style={styles.quickCard}
            >
              <LinearGradient colors={['#0a1a2a', '#1a1a1a']} style={styles.quickCardInner}>
                <Ionicons name="timer-outline" size={28} color="#5B9BD5" />
                <EliteText variant="body" style={styles.quickCardTitle}>Estándar</EliteText>
              </LinearGradient>
            </AnimatedPressable>

            {/* Progreso (deshabilitado) */}
            <View style={styles.quickCard}>
              <LinearGradient colors={['#1a1a1a', '#151515']} style={[styles.quickCardInner, { opacity: 0.5 }]}>
                <Ionicons name="trending-up-outline" size={28} color={Colors.textSecondary} />
                <EliteText variant="body" style={[styles.quickCardTitle, { color: Colors.textSecondary }]}>
                  Progreso
                </EliteText>
                <View style={styles.prontoBadge}>
                  <EliteText variant="caption" style={styles.prontoBadgeText}>PRONTO</EliteText>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* ── ACTIVIDAD RECIENTE ── */}
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <EliteText variant="caption" style={[styles.sectionLabel, { marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
            ACTIVIDAD RECIENTE
          </EliteText>
          <View style={styles.emptyActivity}>
            <EliteText variant="caption" style={{ color: Colors.textSecondary }}>
              Sin actividad reciente
            </EliteText>
          </View>
        </Animated.View>

        {/* Padding inferior para scroll */}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  brand: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    fontStyle: 'italic',
    letterSpacing: 6,
  },
  settingsBtn: {
    padding: Spacing.sm,
  },

  // ── Hero Card TU SEMANA ──
  heroCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 6, // espacio para accent
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#2a3a2a',
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.neonGreen,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  heroWatermark: {
    position: 'absolute',
    top: -10,
    right: -5,
    fontSize: 80,
    opacity: 0.06,
  },
  heroLabel: {
    color: Colors.textSecondary,
    letterSpacing: 3,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  heroNumber: {
    fontSize: 48,
    fontFamily: Fonts.extraBold,
    color: Colors.neonGreen,
  },
  heroUnit: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroStat: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  heroDot: {
    color: Colors.textSecondary,
    fontSize: 13,
  },

  // ── Botón ENTRENAR ──
  trainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#a8e02a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  trainText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.textOnGreen,
    letterSpacing: 4,
    marginLeft: Spacing.sm,
  },

  // ── Sección headers ──
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
    textTransform: 'uppercase',
    fontFamily: Fonts.semiBold,
  },
  sectionLink: {
    color: Colors.neonGreen,
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // ── Rutinas scroll horizontal ──
  routinesScrollContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  routineCard: {
    width: ROUTINE_CARD_WIDTH,
  },
  routineCardInner: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    height: 120,
    justifyContent: 'space-between',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  routineCardName: {
    fontFamily: Fonts.bold,
    fontSize: 15,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Grid de acceso rápido ──
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
  },
  quickCardInner: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    height: 100,
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  quickCardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  prontoBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  prontoBadgeText: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },

  // ── Actividad reciente ──
  emptyActivity: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
});
